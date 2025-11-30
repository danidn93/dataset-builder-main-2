// supabase/functions/get-version-rows/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

serve(async (req) => {
  const url = new URL(req.url);
  const versionId = url.searchParams.get("versionId");
  const page = Number(url.searchParams.get("page") || 1);
  const limit = Number(url.searchParams.get("limit") || 100);
  const offset = (page - 1) * limit;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, count } = await supabase
    .from("dataset_rows")
    .select("data", { count: "exact" })
    .eq("version_id", versionId)
    .range(offset, offset + limit - 1);

  return new Response(
    JSON.stringify({ rows: data, total: count }),
    { headers: { "Content-Type": "application/json" } }
  );
});
