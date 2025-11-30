import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {

  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const { versionId } = await req.json();

    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = crypto.randomUUID().replace(/-/g, "");

    const { error } = await client
      .from("dataset_version_links")
      .insert({
        version_id: versionId,
        token,
        tipo: "PUBLIC_DASHBOARD",
      });

    if (error)
      return new Response(JSON.stringify({ error }), {
        status: 400,
        headers: corsHeaders,
      });

    const base = Deno.env.get("PUBLIC_DASHBOARD_BASE_URL")!;
    const url = `${base}/public-dashboard/${token}`;

    return new Response(JSON.stringify({ url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
