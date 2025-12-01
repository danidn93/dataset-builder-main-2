// supabase/functions/analisis-filtrado-chunk/index.ts
import { serve } from "https://deno.land/std@0.219.1/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// TIPOS → evitar NEVER
type Carrera = {
  nombre: string;
  total: number;
  criterios: number[];
};

type Facultad = {
  nombre: string;
  total: number;
  criterios: number[];
  carreras: Carrera[];
};

type Porcentajes = {
  criterios: string[];
  facultades: Facultad[];
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, apikey, x-client-info",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { versionId, facultad, carrera } = await req.json();

    if (!versionId) throw new Error("versionId es obligatorio");

    // 1. Leer análisis cacheado con tipos
    const { data: cached } = await supabase
      .from("dataset_analysis")
      .select("porcentajes")
      .eq("version_id", versionId)
      .maybeSingle();

    if (!cached) throw new Error("No existe análisis cacheado");

    const porcentajes = cached.porcentajes as Porcentajes;

    const criterios = porcentajes.criterios;
    const facultades = porcentajes.facultades;

    // 2. Buscar FACULTAD
    const fac = facultades.find(
      (f) => f.nombre.toUpperCase() === facultad.toUpperCase()
    );

    if (!fac) throw new Error(`Facultad no encontrada: ${facultad}`);

    // 3. Buscar CARRERA (si aplica)
    let car: Carrera | null = null;

    if (carrera) {
      car = fac.carreras.find(
        (c) => c.nombre.toUpperCase() === carrera.toUpperCase()
      ) || null;;
      if (!car)
        throw new Error(
          `Carrera "${carrera}" no pertenece a la facultad "${facultad}"`
        );
    }

    // 4. Global filtrado
    const global = car
      ? Number(
          (
            car.criterios.reduce((a, b) => a + b, 0) / car.criterios.length
          ).toFixed(2)
        )
      : Number(
          (
            fac.criterios.reduce((a, b) => a + b, 0) / fac.criterios.length
          ).toFixed(2)
        );

    // 5. Indicadores por carrera
    const indicadoresPorCarrera: Record<string, number[]> = {};
    fac.carreras.forEach((c) => {
      indicadoresPorCarrera[c.nombre] = c.criterios;
    });

    return new Response(
      JSON.stringify({
        global,
        criterios,
        facultad: fac.nombre,
        carrera: car?.nombre ?? null,
        carreras: fac.carreras.map((c) => ({
          nombre: c.nombre,
          total: c.total,
        })),
        indicadoresPorCarrera,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (e: any) {
    console.error("Error analisis-filtrado-chunk:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
