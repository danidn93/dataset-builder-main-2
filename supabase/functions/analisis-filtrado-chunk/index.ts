// supabase/functions/analisis-filtrado-chunk/index.ts
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

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { token } = await req.json();

    // 1. Obtener link
    const { data: link } = await supabase
      .from("share_links")
      .select("filters")
      .eq("token", token)
      .single();

    if (!link) throw new Error("Token inválido");

    const { versionId, facultad, carrera } = link.filters;

    // 2. Obtener análisis general YA PROCESADO
    const { data: analysis } = await supabase
      .from("dataset_analysis")
      .select("*")
      .eq("version_id", versionId)
      .single();

    if (!analysis) throw new Error("Análisis no encontrado");

    const criterios = analysis.porcentajes.criterios;
    const facultades = analysis.porcentajes.facultades;

    // -----------------------------
    //     FILTROS
    // -----------------------------

    // FILTRO POR FACULTAD
    if (facultad && !carrera) {
      const fac = facultades.find((f: any) => f.nombre === facultad);
      if (!fac) throw new Error("Facultad no encontrada");

      return new Response(
        JSON.stringify({
          tipo: "FACULTAD",
          nombre: fac.nombre,
          global: fac.total,
          criterios,
          carreras: fac.carreras
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // FILTRO POR CARRERA
    if (carrera) {
      const fac = facultades.find((f: any) =>
        f.carreras.some((c: any) => c.nombre === carrera)
      );

      if (!fac) throw new Error("Carrera no encontrada");

      const car = fac.carreras.find((c: any) => c.nombre === carrera);

      return new Response(
        JSON.stringify({
          tipo: "CARRERA",
          nombre: car.nombre,
          global: car.total,
          criterios,
          valores: car.criterios
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Filtro inválido");

  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 400, headers: corsHeaders }
    );
  }
});
