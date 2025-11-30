import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ======================================================
// CORS HEADERS — OBLIGATORIOS
// ======================================================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ======================================================
// SERVE
// ======================================================
serve(async (req) => {
  // 1️⃣ PRE-FLIGHT OPTIONS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // 2️⃣ LEER TOKEN
    const { token } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "Falta token" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // 3️⃣ CLIENTE SUPABASE SERVICE ROLE
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 4️⃣ BUSCAR TOKEN
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

    // 5️⃣ OBTENER VERSION
    const { data: version } = await client
      .from("dataset_versions")
      .select("id, periodo, dataset_id")
      .eq("id", link.version_id)
      .single();

    // 6️⃣ OBTENER DATASET
    const { data: dataset } = await client
      .from("datasets")
      .select("nombre")
      .eq("id", version.dataset_id)
      .single();

    // 7️⃣ LLAMAR A analisis-version
    const analysis = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/analisis-version`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          Authorization: `Bearer ${Deno.env.get(
            "SUPABASE_SERVICE_ROLE_KEY"
          )!}`,
        },
        body: JSON.stringify({ versionId: version.id }),
      }
    ).then((r) => r.json());

    // 8️⃣ ARMAR PAYLOAD
    const payload = {
      global: analysis.global,
      criterios: analysis.criterios,
      facultades: analysis.facultades,
      periodo: version.periodo,
      datasetName: dataset.nombre,
      votos_por_numero: analysis.votos_por_numero,
    };

    // 9️⃣ RESPUESTA FINAL CON CORS
    return new Response(JSON.stringify({ data: payload }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
