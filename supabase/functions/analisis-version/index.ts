import { serve } from "https://deno.land/std@0.219.1/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

type ReqBody = {
  versionId: string;
  dedicacion?: string | null; // ✅ opcional
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as ReqBody;

    const versionId = body.versionId;
    let dedicacion: string | null = body.dedicacion ?? null;

    if (!versionId) throw new Error("versionId es requerido");

    // ✅ GUARDRAIL:
    // Si viene dedicacion, validamos que realmente exista en la data.
    // Si no existe (0 filas), ignoramos el filtro (dedicacion=null).
    if (dedicacion) {
      const { count, error: cErr } = await supabase
        .from("dataset_rows")
        .select("id", { count: "exact", head: true })
        .eq("version_id", versionId)
        .filter("data->>DEDICACION", "eq", dedicacion);

      if (cErr) {
        // Si hay error al contar, por seguridad no aplicamos filtro (no rompemos el dashboard)
        console.warn("No se pudo validar dedicacion, se ignora filtro:", cErr.message);
        dedicacion = null;
      } else if (!count || count === 0) {
        // No existe DEDICACION o no hay filas con ese valor
        dedicacion = null;
      }
    }

    // ✅ CACHE: solo aplica cuando NO hay filtro efectivo
    if (!dedicacion) {
      const { data: cached } = await supabase
        .from("dataset_analysis")
        .select("global, porcentajes, conteo")
        .eq("version_id", versionId)
        .maybeSingle();

      if (cached) {
        return new Response(
          JSON.stringify({
            fromCache: true,
            global: cached.global,
            criterios: cached.porcentajes.criterios,
            facultades: cached.porcentajes.facultades,
            votos_por_numero: cached.conteo,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ============ PROCESAR ============

    const { data: ver, error: verErr } = await supabase
      .from("dataset_versions")
      .select("*")
      .eq("id", versionId)
      .single();

    if (verErr) throw new Error(verErr.message);
    if (!ver) throw new Error("Versión no encontrada");

    const CHUNK = 1000;

    // Si NO hay filtro, usamos total_rows guardado.
    // Si hay filtro efectivo, contamos para paginar correctamente.
    let totalRows: number = ver.total_rows || 0;

    if (dedicacion) {
      const { count, error: countErr } = await supabase
        .from("dataset_rows")
        .select("id", { count: "exact", head: true })
        .eq("version_id", versionId)
        .filter("data->>DEDICACION", "eq", dedicacion);

      if (countErr) throw new Error("Error contando filas filtradas: " + countErr.message);
      totalRows = count ?? 0;
    }

    const acc = {
      votosPorCriterioFacultad: {} as Record<
        string,
        Record<string, Record<"1" | "2" | "3" | "4" | "5", number>>
      >,
      votosPorCriterioCarrera: {} as Record<
        string,
        Record<string, Record<"1" | "2" | "3" | "4" | "5", number>>
      >,
    };

    for (let offset = 0; offset < totalRows; offset += CHUNK) {
      let q = supabase
        .from("dataset_rows")
        .select("data")
        .eq("version_id", versionId);

      // ✅ Aplicar filtro solo si dedicacion es efectiva (ya validada)
      if (dedicacion) {
        q = q.filter("data->>DEDICACION", "eq", dedicacion);
      }

      const { data: rows, error: rowsErr } = await q.range(offset, offset + CHUNK - 1);
      if (rowsErr) throw new Error("Error leyendo dataset_rows: " + rowsErr.message);

      if (!rows?.length) continue;

      const res = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/analizar-chunk`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ version: ver, rows }),
        }
      );

      const parcial = await res.json();
      fusionar(acc, parcial);
    }

    const resultado = calcularComoTuExcel(acc, ver);

    // ✅ Guardar cache solo si NO hay filtro efectivo
    if (!dedicacion) {
      await supabase.from("dataset_analysis").upsert({
        version_id: versionId,
        global: resultado.global,
        porcentajes: {
          criterios: resultado.criteriosLista,
          facultades: resultado.facultades,
        },
        conteo: resultado.votos,
      });
    }

    return new Response(
      JSON.stringify({
        fromCache: false,
        global: resultado.global,
        criterios: resultado.criteriosLista,
        facultades: resultado.facultades,
        votos_por_numero: resultado.votos,
        dedicacion_aplicada: dedicacion,     // útil para debug (null si se ignoró)
        total_rows_usadas: totalRows,        // útil para debug
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

// Fusión solo de votos 1-5
function fusionar(base: any, parcial: any) {
  for (const crit in parcial.votosPorCriterioFacultad) {
    base.votosPorCriterioFacultad[crit] ??= {};
    for (const fac in parcial.votosPorCriterioFacultad[crit]) {
      base.votosPorCriterioFacultad[crit][fac] ??= { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
      for (const v of ["1", "2", "3", "4", "5"] as const) {
        base.votosPorCriterioFacultad[crit][fac][v] +=
          parcial.votosPorCriterioFacultad[crit][fac][v] || 0;
      }
    }
  }
  for (const crit in parcial.votosPorCriterioCarrera) {
    base.votosPorCriterioCarrera[crit] ??= {};
    for (const key in parcial.votosPorCriterioCarrera[crit]) {
      base.votosPorCriterioCarrera[crit][key] ??= { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
      for (const v of ["1", "2", "3", "4", "5"] as const) {
        base.votosPorCriterioCarrera[crit][key][v] +=
          parcial.votosPorCriterioCarrera[crit][key][v] || 0;
      }
    }
  }
}

// Cálculo como tu Excel (mismo estilo)
function calcularComoTuExcel(acc: any, ver: any) {
  const criteriosLista = ver.col_criterios.map((c: string) =>
    String(c).replace(/^\d+\)\s*/, "").replace(/\s+/g, " ").trim()
  );

  const facultades = Object.keys(acc.votosPorCriterioFacultad[criteriosLista[0]] || {})
    .map((nombreFac) => {
      const criteriosFac = criteriosLista.map((crit) => {
        const votos = acc.votosPorCriterioFacultad[crit]?.[nombreFac];
        if (!votos) return 0;

        const n1 = votos["1"] || 0,
          n2 = votos["2"] || 0,
          n3 = votos["3"] || 0,
          n4 = votos["4"] || 0,
          n5 = votos["5"] || 0;

        const total = n1 + n2 + n3 + n4 + n5;
        if (total === 0) return 0;

        const suma = 1 * n1 + 2 * n2 + 3 * n3 + 4 * n4 + 5 * n5;
        return Number(((suma / (5 * total)) * 100).toFixed(2));
      });

      const promedioFacultad =
        criteriosFac.reduce((a, b) => a + b, 0) / criteriosFac.length;

      const carreras = Object.keys(acc.votosPorCriterioCarrera[criteriosLista[0]] || {})
        .filter((k) => k.startsWith(`${nombreFac}|||`))
        .map((keyCar) => {
          const nombreCar = keyCar.split("|||")[1];

          const criteriosCar = criteriosLista.map((crit) => {
            const votos = acc.votosPorCriterioCarrera[crit]?.[keyCar];
            if (!votos) return 0;

            const n1 = votos["1"] || 0,
              n2 = votos["2"] || 0,
              n3 = votos["3"] || 0,
              n4 = votos["4"] || 0,
              n5 = votos["5"] || 0;

            const total = n1 + n2 + n3 + n4 + n5;
            if (total === 0) return 0;

            const suma = 1 * n1 + 2 * n2 + 3 * n3 + 4 * n4 + 5 * n5;
            return Number(((suma / (5 * total)) * 100).toFixed(2));
          });

          const promedioCarrera =
            criteriosCar.reduce((a, b) => a + b, 0) / criteriosCar.length;

          return {
            nombre: nombreCar,
            total: Number(promedioCarrera.toFixed(2)),
            criterios: criteriosCar,
          };
        })
        .sort((a: any, b: any) => b.total - a.total);

      return {
        nombre: nombreFac,
        total: Number(promedioFacultad.toFixed(2)),
        criterios: criteriosFac,
        carreras,
      };
    })
    .sort((a: any, b: any) => b.total - a.total);

  const global =
    facultades.length > 0
      ? Number(
          (facultades.reduce((sum, f) => sum + f.total, 0) / facultades.length).toFixed(2)
        )
      : 0;

  return {
    global,
    criteriosLista,
    facultades,
    votos: {
      criterio_facultad: acc.votosPorCriterioFacultad,
      criterio_carrera: acc.votosPorCriterioCarrera,
    },
  };
}
