<<<<<<< HEAD
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.47.3";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

serve(async (req) => {
  try {
    const { versionId } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Inicializar OpenAI
    const openai = new OpenAI({
      apiKey: Deno.env.get("OPENAI_API_KEY")!,
    });

    // 1️⃣ Obtener configuración de versión
    const { data: version } = await supabase
      .from("dataset_versions")
      .select("col_facultad, col_carrera, comentarios_column")
      .eq("id", versionId)
      .single();

    const colFacultad = version.col_facultad;
    const colCarrera = version.col_carrera;
    const colComentario = version.comentarios_column;

    // 2️⃣ Obtener filas de esa versión
    const { data: rows } = await supabase
      .from("dataset_rows")
      .select("data")
      .eq("version_id", versionId);

    // 3️⃣ Agrupar comentarios por FACULTAD + CARRERA
    const grupos: Record<
      string,
      { facultad: string; carrera: string; comentarios: string[] }
    > = {};

    for (const r of rows) {
      const row = r.data;
      const fac = row[colFacultad] ?? "SIN FACULTAD";
      const car = row[colCarrera] ?? "SIN CARRERA";
      const com = row[colComentario] ?? "";

      if (!com || com.trim() === "") continue;

      const key = `${fac}__${car}`;
      if (!grupos[key]) {
        grupos[key] = {
          facultad: fac,
          carrera: car,
          comentarios: [],
        };
      }
      grupos[key].comentarios.push(com);
    }

    // 4️⃣ Procesar cada facultad+carrera con OpenAI
    for (const key of Object.keys(grupos)) {
      const g = grupos[key];

      const prompt = `
Analiza los siguientes comentarios estudiantiles.
Devuelve un JSON EXACTO con esta estructura:
{
  "resumen_general": "",
  "positivos": [],
  "negativos": [],
  "recomendaciones": []
}

Comentarios:
${g.comentarios.join("\n")}
`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });

      let text = completion.choices?.[0]?.message?.content || "{}";

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = {
          resumen_general: "",
          positivos: [],
          negativos: [],
          recomendaciones: [],
        };
      }

      // 5️⃣ Insertar análisis en la tabla analisis_comentarios
      await supabase.from("analisis_comentarios").upsert(
        {
          version_id: versionId,
          facultad_nombre: g.facultad,
          carrera_nombre: g.carrera,
          comentario_positivo: parsed.positivos.join("\n"),
          comentario_negativo: parsed.negativos.join("\n"),
          recomendaciones: parsed.recomendaciones.join("\n"),
        },
        {
          onConflict: "version_id, facultad_nombre, carrera_nombre",
        }
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
=======
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { versionId } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obtener la versión con sus datos
    const { data: version, error: versionError } = await supabase
      .from('dataset_versions')
      .select('data, comentarios_column')
      .eq('id', versionId)
      .single();

    if (versionError) throw versionError;
    if (!version.comentarios_column) {
      throw new Error('No se ha configurado una columna de comentarios');
    }

    const dataArray = version.data as any[];
    const comentariosCol = version.comentarios_column;

    // Detectar columnas de facultad y carrera
    const sampleRow = dataArray[0] || {};
    const facultadCol = Object.keys(sampleRow).find(k => 
      k.toLowerCase().includes("facultad")
    ) || "";
    const carreraCol = Object.keys(sampleRow).find(k => 
      k.toLowerCase().includes("carrera")
    ) || "";

    // Agrupar comentarios por facultad y carrera
    const grupos: Record<string, { facultad: string, carrera: string, comentarios: string[] }> = {};

    dataArray.forEach(row => {
      const facultad = String(row[facultadCol] || "").trim();
      const carrera = String(row[carreraCol] || "").trim();
      const comentario = String(row[comentariosCol] || "").trim();

      if (!facultad || !comentario) return;

      const key = `${facultad}|${carrera}`;
      if (!grupos[key]) {
        grupos[key] = { facultad, carrera, comentarios: [] };
      }
      grupos[key].comentarios.push(comentario);
    });

    // Analizar cada grupo con AI
    const analisis = [];

    for (const [key, grupo] of Object.entries(grupos)) {
      if (grupo.comentarios.length === 0) continue;

      const prompt = `Analiza los siguientes comentarios de evaluación institucional para ${grupo.facultad}${grupo.carrera ? ` - ${grupo.carrera}` : ''}:

${grupo.comentarios.slice(0, 50).join('\n')}

Proporciona:
1. El comentario más positivo (copia textual)
2. El comentario más negativo (copia textual)
3. 3-5 recomendaciones específicas para mejorar

Formato JSON:
{
  "comentario_positivo": "...",
  "comentario_negativo": "...",
  "recomendaciones": "..."
}`;

      let resultado;
      
      if (openaiKey) {
        // Usar OpenAI si hay key disponible
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'Eres un experto en análisis de evaluaciones institucionales. Responde siempre en formato JSON válido.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
          }),
        });

        const data = await response.json();
        const content = data.choices[0].message.content;
        resultado = JSON.parse(content);
      } else {
        // Análisis simple sin AI
        resultado = {
          comentario_positivo: grupo.comentarios[0] || "No disponible",
          comentario_negativo: grupo.comentarios[grupo.comentarios.length - 1] || "No disponible",
          recomendaciones: "Configure OPENAI_API_KEY para obtener recomendaciones detalladas con IA."
        };
      }

      analisis.push({
        version_id: versionId,
        facultad_nombre: grupo.facultad,
        carrera_nombre: grupo.carrera || null,
        comentario_positivo: resultado.comentario_positivo,
        comentario_negativo: resultado.comentario_negativo,
        recomendaciones: resultado.recomendaciones,
      });
    }

    // Guardar análisis en la base de datos
    if (analisis.length > 0) {
      const { error: insertError } = await supabase
        .from('analisis_comentarios')
        .upsert(analisis, { 
          onConflict: 'version_id,facultad_nombre,carrera_nombre' 
        });

      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        analisis: analisis.length,
        message: openaiKey ? 'Análisis completado con IA' : 'Análisis básico completado (configure OPENAI_API_KEY para análisis avanzado)'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error en analizar-comentarios:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
>>>>>>> 20f347d6bf4a2bc89fc1bb812bdf4c6aae84fada
  }
});
