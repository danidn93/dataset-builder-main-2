// supabase/functions/dashboard-data/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// -------------------------------------------------------------
// Convierte array de estrellas → 0–100
// -------------------------------------------------------------
function calcularPorcentajeCriterio(estrellasArray: any[]): number {
  const valores = estrellasArray
    .map(v => {
      if (!v) return null;
      if (typeof v === "number") return v;
      const limpio = String(v).replace("☆", "").trim();
      const num = parseInt(limpio);
      return isNaN(num) ? null : num;
    })
    .filter(v => v !== null);

  if (valores.length === 0) return 0;
  const prom = valores.reduce((a, b) => a + b, 0) / valores.length;
  return Number(((prom / 5) * 100).toFixed(2));
}

// -------------------------------------------------------------
function procesarCarrera(criteriosPorColumna: any[][]) {
  const criterios = criteriosPorColumna.map(col => calcularPorcentajeCriterio(col));
  const total = criterios.reduce((a, b) => a + b, 0) / criterios.length;
  return { criterios, total: Number(total.toFixed(2)) };
}

// -------------------------------------------------------------
function agrupar(rows: any[], criterios: string[], facKey: string, carKey: string) {
  const estructura: any = {};

  rows.forEach(row => {
    const fac = row.data[facKey];
    const car = row.data[carKey];

    if (!estructura[fac]) estructura[fac] = {};
    if (!estructura[fac][car]) estructura[fac][car] = criterios.map(() => []);

    criterios.forEach((crit, i) => {
      estructura[fac][car][i].push(row.data[crit]);
    });
  });

  return estructura;
}

// -------------------------------------------------------------
function construirResultado(estructura: any, criterios: string[]) {
  const facultadesArray: any[] = [];

  Object.entries(estructura).forEach(([facultadNombre, carrerasObj]: any) => {
    const carrerasProcesadas: any[] = [];

    Object.entries(carrerasObj).forEach(([carreraNombre, criteriosPorColumna]) => {
      const p = procesarCarrera(criteriosPorColumna);
      carrerasProcesadas.push({
        nombre: carreraNombre,
        total: p.total,
        criterios: p.criterios,
      });
    });

    const totalFac =
      carrerasProcesadas.reduce((s, c) => s + c.total, 0) /
      carrerasProcesadas.length;

    facultadesArray.push({
      nombre: facultadNombre,
      total: Number(totalFac.toFixed(2)),
      carreras: carrerasProcesadas,
    });
  });

  const global =
    facultadesArray.reduce((s, f) => s + f.total, 0) /
    facultadesArray.length;

  return {
    criterios,
    facultades: facultadesArray,
    global: Number(global.toFixed(2)),
  };
}

// -------------------------------------------------------------
// MAIN HANDLER
// -------------------------------------------------------------
Deno.serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { versionId } = await req.json();
    if (!versionId)
      return new Response(JSON.stringify({ error: "versionId requerido" }), { status: 400, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Obtener metadata de columnas
    const { data: version, error: versionErr } = await supabase
      .from("dataset_versions")
      .select("col_facultad, col_carrera, col_criterios")
      .eq("id", versionId)
      .single();

    if (versionErr) throw versionErr;
    if (!version.col_facultad || !version.col_carrera || !version.col_criterios)
      throw new Error("La versión no tiene columnas configuradas (facultad, carrera, criterios).");

    // Obtener filas
    const { data: rows, error: rowsErr } = await supabase
      .from("dataset_rows")
      .select("data")
      .eq("version_id", versionId);

    if (rowsErr) throw rowsErr;
    if (!rows || rows.length === 0)
      return new Response(JSON.stringify({ empty: true }), { headers: corsHeaders });

    // Procesar
    const estructura = agrupar(rows, version.col_criterios, version.col_facultad, version.col_carrera);
    const resultado = construirResultado(estructura, version.col_criterios);

    return new Response(JSON.stringify(resultado), { headers: corsHeaders });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
