// supabase/functions/finalizar-version/index.ts
import { serve } from "https://deno.land/std/http/server.ts";
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
    const { versionId } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Contar filas
    const { count } = await supabase
      .from("dataset_rows")
      .select("id", { count: "exact", head: true })
      .eq("version_id", versionId);

    // Actualizar versión
    await supabase
      .from("dataset_versions")
      .update({ total_rows: count })
      .eq("id", versionId);

    return new Response(JSON.stringify({ success: true }), {
      headers: corsHeaders,
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: corsHeaders,
      status: 500,
    });
  }
});
