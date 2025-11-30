//supabase/functions/crear-version-inicial/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      datasetId,
      fileName,
      totalColumns,
      comentariosColumn,
      facultadColumn,
      carreraColumn,
      selectedCriteria,
      periodo,
    } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Obtener siguiente versión
    const { data: lastV } = await supabase
      .from("dataset_versions")
      .select("version_number")
      .eq("dataset_id", datasetId)
      .order("version_number", { ascending: false })
      .limit(1);

    const next = lastV?.length ? lastV[0].version_number + 1 : 1;

    // INSERTAR VERSION COMPLETA
    const { data: version, error } = await supabase
      .from("dataset_versions")
      .insert({
        dataset_id: datasetId,
        version_number: next,
        file_path: fileName,
        total_columns: totalColumns,
        comentarios_column: comentariosColumn,
        col_facultad: facultadColumn,
        col_carrera: carreraColumn,
        col_criterios: selectedCriteria, // ARRAY
        total_rows: 0,
        periodo: periodo, 
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ version }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      status: 200,
    });

  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
