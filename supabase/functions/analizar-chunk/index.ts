// supabase/functions/analizar-chunk/index.ts
import { serve } from "https://deno.land/std@0.219.1/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { version, rows } = await req.json();

    const colFac = version.col_facultad;
    const colCar = version.col_carrera;
    const criteriosOriginales = version.col_criterios;
    const criteriosLimpios = criteriosOriginales.map(normalizarCriterio);

    const acc = {
      criterios: {} as Record<string, { sum: number; count: number }>,
      facultad: {} as Record<string, { sum: number; count: number }>,
      carrera: {} as Record<string, { sum: number; count: number }>,

      votosPorCriterioFacultad: {} as Record<
        string,
        Record<string, { "1": number; "2": number; "3": number; "4": number; "5": number }>
      >,
      votosPorCriterioCarrera: {} as Record<
        string,
        Record<string, { "1": number; "2": number; "3": number; "4": number; "5": number }>
      >,
    };

    for (const r of rows) {
      const row = r.data;
      const fac = normalizarFacultadOCarrera(row[colFac]);
      const car = normalizarFacultadOCarrera(row[colCar]);
      const keyCar = `${fac}|||${car}`;

      for (let i = 0; i < criteriosOriginales.length; i++) {
        const critRaw = criteriosOriginales[i];
        const crit = criteriosLimpios[i];
        const raw = row[critRaw];
        if (!raw) continue;

        const match = String(raw).trim().match(/[1-5]/);
        if (!match) continue;

        const num = parseInt(match[0], 10);
        const votoKey = num.toString() as "1" | "2" | "3" | "4" | "5";

        // Conteo de votos 1-5 por facultad y carrera
        if (fac) {
          acc.votosPorCriterioFacultad[crit] ??= {};
          acc.votosPorCriterioFacultad[crit][fac] ??= { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
          acc.votosPorCriterioFacultad[crit][fac][votoKey]++;
        }

        if (keyCar && car) {
          acc.votosPorCriterioCarrera[crit] ??= {};
          acc.votosPorCriterioCarrera[crit][keyCar] ??= { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
          acc.votosPorCriterioCarrera[crit][keyCar][votoKey]++;
        }

        // Promedios (solo para compatibilidad, ya no se usan directamente)
        const val = (num / 5) * 100;
        acc.criterios[crit] ??= { sum: 0, count: 0 };
        acc.criterios[crit].sum += val;
        acc.criterios[crit].count++;

        if (fac) {
          acc.facultad[fac] ??= { sum: 0, count: 0 };
          acc.facultad[fac].sum += val;
          acc.facultad[fac].count++;
        }

        if (keyCar && car) {
          acc.carrera[keyCar] ??= { sum: 0, count: 0 };
          acc.carrera[keyCar].sum += val;
          acc.carrera[keyCar].count++;
        }
      }
    }

    return new Response(JSON.stringify(acc), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Error en analizar-chunk:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

function normalizarFacultadOCarrera(str: any): string {
  if (!str) return "";
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[0-9]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function normalizarCriterio(str: string): string {
  return String(str).replace(/^\d+\)\s*/, "").replace(/\s+/g, " ").trim();
}