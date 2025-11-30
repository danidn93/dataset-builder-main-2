// supabase/functions/analisis-filtrado-chunk/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// -----------------------------------------
// CORS
// -----------------------------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // -----------------------------------------
    // BODY ESPERADO
    // -----------------------------------------
    const { versionId, facultad, carrera } = await req.json();

    if (!versionId) {
      return new Response(
        JSON.stringify({ error: "versionId requerido" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // -----------------------------------------
    // LEER LAS COLUMNAS DEL VERSION
    // -----------------------------------------
    const { data: version, error: errVer } = await client
      .from("dataset_versions")
      .select("col_criterios, col_facultad, col_carrera, total_rows")
      .eq("id", versionId)
      .single();

    if (errVer) throw errVer;

    const criterios: string[] = version.col_criterios;
    const colFac = version.col_facultad;
    const colCar = version.col_carrera;
    const totalRows = version.total_rows ?? 0;

    // -----------------------------------------
    // CARGA CHUNKS (dataset_rows)
    // -----------------------------------------
    const CHUNK = 1000;
    let allRows: any[] = [];

    for (let offset = 0; offset < totalRows; offset += CHUNK) {
      const { data: rows, error } = await client
        .from("dataset_rows")
        .select("data")
        .eq("version_id", versionId)
        .range(offset, offset + CHUNK - 1);

      if (error) throw error;
      if (rows?.length) {
        allRows.push(...rows.map((r) => r.data));
      }
    }

    // -----------------------------------------
    // FILTRAR POR FACULTAD / CARRERA (si aplica)
    // -----------------------------------------
    if (facultad) {
      allRows = allRows.filter(
        (r) => normalizar(r[colFac]) === normalizar(facultad)
      );
    }

    if (carrera) {
      allRows = allRows.filter(
        (r) => normalizar(r[colCar]) === normalizar(carrera)
      );
    }

    // -----------------------------------------
    // SI NO HAY FILAS → RESPUESTA VACÍA
    // -----------------------------------------
    if (allRows.length === 0) {
      return new Response(
        JSON.stringify({
          global: 0,
          carreras: [],
          criterios,
          indicadoresPorCarrera: {},
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -----------------------------------------
    // AGRUPAR CARRERAS
    // -----------------------------------------
    const carrerasUnicas = [
      ...new Set(allRows.map((r) => normalizar(r[colCar]))),
    ];

    const indicadoresPorCarrera: Record<string, number[]> = {};
    const carrerasTotal: { nombre: string; total: number }[] = [];

    for (const car of carrerasUnicas) {
      const rowsCar = allRows.filter(
        (r) => normalizar(r[colCar]) === car
      );

      const sumas = new Array(criterios.length).fill(0);
      const cont = rowsCar.length;

      for (const row of rowsCar) {
        criterios.forEach((crit, idx) => {
          const val = extraerValor(row[crit]);
          sumas[idx] += val;
        });
      }

      const promedios = sumas.map((s) => s / cont);
      indicadoresPorCarrera[car] = promedios;

      const totalCarrera =
        promedios.reduce((a, b) => a + b, 0) / promedios.length;

      carrerasTotal.push({
        nombre: car,
        total: Number(totalCarrera.toFixed(2)),
      });
    }

    const global =
      carrerasTotal.reduce((s, c) => s + c.total, 0) /
      carrerasTotal.length;

    // -----------------------------------------
    // RESPUESTA FINAL
    // -----------------------------------------
    return new Response(
      JSON.stringify({
        global: Number(global.toFixed(2)),
        carreras: carrerasTotal,
        criterios,
        indicadoresPorCarrera,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e: any) {
    console.error("ERROR:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});

// -----------------------------------------
// HELPERS
// -----------------------------------------
function normalizar(x: any): string {
  if (!x) return "";
  return String(x)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

// Extrae número 1–5 → lo convierte a porcentaje 0-100
function extraerValor(x: any): number {
  if (!x) return 0;
  const m = String(x).trim().match(/[1-5]/);
  if (!m) return 0;
  const num = Number(m[0]);
  return (num / 5) * 100; // MISMO CÁLCULO DE TU EXCEL
}
