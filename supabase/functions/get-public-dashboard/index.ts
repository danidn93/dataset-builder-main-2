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
    return new Response("ok", { status: 200, headers: corsHeaders });
    }

  try {
    const body = await req.json().catch(() => ({}));
    const token = body?.token;
    const dedicacion = body?.dedicacion ?? null; // string | null

    if (!token) {
      return new Response(JSON.stringify({ error: "Falta token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1) Buscar link por token
    const { data: link, error: linkErr } = await client
      .from("dataset_version_links")
      .select("version_id")
      .eq("token", token)
      .eq("tipo", "PUBLIC_DASHBOARD")
      .single();

    if (linkErr || !link) {
      return new Response(
        JSON.stringify({ error: "Token inválido o expirado" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2) Obtener versión
    const { data: version, error: verErr } = await client
      .from("dataset_versions")
      .select("id, periodo, dataset_id")
      .eq("id", link.version_id)
      .single();

    if (verErr || !version) {
      return new Response(JSON.stringify({ error: "Versión no encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Obtener dataset
    const { data: dataset, error: dsErr } = await client
      .from("datasets")
      .select("nombre")
      .eq("id", version.dataset_id)
      .single();

    if (dsErr || !dataset) {
      return new Response(JSON.stringify({ error: "Dataset no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4) Obtener dedicaciones únicas desde dataset_rows (si existen)
    //    Nota: No usamos distinct directo porque PostgREST es limitado con jsonb.
    //    Traemos solo data y extraemos DEDICACION en Deno.
    let dedicaciones: string[] = [];
    try {
      const { data: rows, error: rowsErr } = await client
        .from("dataset_rows")
        .select("data")
        .eq("version_id", version.id);

      if (!rowsErr && Array.isArray(rows)) {
        const set = new Set<string>();
        for (const r of rows) {
          const val = (r as any)?.data?.DEDICACION;
          if (val !== undefined && val !== null && String(val).trim() !== "") {
            set.add(String(val).trim());
          }
        }
        dedicaciones = Array.from(set);
      }
    } catch {
      dedicaciones = [];
    }

    // 5) Llamar analisis-version con dedicacion opcional
    const analysis = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/analisis-version`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
        },
        body: JSON.stringify({
          versionId: version.id,
          dedicacion: dedicacion && dedicacion !== "ALL" ? dedicacion : null,
        }),
      }
    ).then((r) => r.json());

    // 6) Payload (manteniendo tu estructura, agregando dedicaciones)
    const payload = {
      version_id: version.id,
      dedicaciones, // ✅ NUEVO
      global: analysis.global,
      criterios: analysis.criterios,
      facultades: analysis.facultades,
      periodo: version.periodo,
      datasetName: dataset.nombre,
      votos_por_numero: analysis.votos_por_numero,
    };

    return new Response(JSON.stringify({ data: payload }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
