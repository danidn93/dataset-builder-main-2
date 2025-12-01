// supabase/functions/analizando-chunk/index.ts
import { serve } from "https://deno.land/std@0.219.1/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, apikey, x-client-info",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { version, rows } = await req.json();

    const colFac = version.col_facultad;
    const colCar = version.col_carrera;
    const criteriosOrig = version.col_criterios;
    const criteriosClean = criteriosOrig.map(normalizarCriterio);

    const acc = {
      votosPorCriterioFacultad: {},
      votosPorCriterioCarrera: {},
    };

    for (const r of rows) {
      const row = r.data;
      const fac = normalizar(row[colFac]);
      const car = normalizar(row[colCar]);
      const key = `${fac}|||${car}`;

      for (let i = 0; i < criteriosOrig.length; i++) {
        const critRaw = criteriosOrig[i];
        const crit = criteriosClean[i];
        const raw = row[critRaw];
        if (!raw) continue;

        const match = String(raw).trim().match(/[1-5]/);
        if (!match) continue;

        const v = match[0] as "1" | "2" | "3" | "4" | "5";

        acc.votosPorCriterioFacultad[crit] ??= {};
        acc.votosPorCriterioFacultad[crit][fac] ??= {
          "1": 0,
          "2": 0,
          "3": 0,
          "4": 0,
          "5": 0,
        };
        acc.votosPorCriterioFacultad[crit][fac][v]++;

        acc.votosPorCriterioCarrera[crit] ??= {};
        acc.votosPorCriterioCarrera[crit][key] ??= {
          "1": 0,
          "2": 0,
          "3": 0,
          "4": 0,
          "5": 0,
        };
        acc.votosPorCriterioCarrera[crit][key][v]++;
      }
    }

    return new Response(JSON.stringify(acc), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: cors,
    });
  }
});

function normalizarCriterio(str: string) {
  return String(str).replace(/^\d+\)\s*/, "").trim();
}

function normalizar(str: any) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[0-9]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}
