// supabase/functions/insertar-rows/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function chunkArray(a: any[], size: number) {
  const out = [];
  for (let i = 0; i < a.length; i += size) {
    out.push(a.slice(i, i + size));
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { versionId, rows } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    for (const chunk of chunkArray(rows, 300)) {
      await supabase.from("dataset_rows").insert(
        chunk.map((row: any) => ({
          version_id: versionId,
          data: row,
        }))
      );
    }

    return new Response(JSON.stringify({ inserted: rows.length }), {
      headers: corsHeaders,
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: corsHeaders,
      status: 500,
    });
  }
});
