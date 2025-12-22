import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "Falta token" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: link } = await client
      .from("dataset_version_links")
      .select("version_id")
      .eq("token", token)
      .eq("tipo", "PUBLIC_DASHBOARD")
      .single();

    if (!link) {
      return new Response(
        JSON.stringify({ error: "Token inválido o expirado" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: version } = await client
      .from("dataset_versions")
      .select("id, periodo, dataset_id")
      .eq("id", link.version_id)
      .single();

    const { data: dataset } = await client
      .from("datasets")
      .select("nombre")
      .eq("id", version.dataset_id)
      .single();

    const analysis = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/analisis-version`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
        },
        body: JSON.stringify({ versionId: version.id }),
      }
    ).then((r) => r.json());

    // ✅ FIX: incluir version_id en el payload
    const payload = {
      version_id: version.id,
      global: analysis.global,
      criterios: analysis.criterios,
      facultades: analysis.facultades,
      periodo: version.periodo,
      datasetName: dataset.nombre,
      votos_por_numero: analysis.votos_por_numero,
    };

    return new Response(JSON.stringify({ data: payload }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
