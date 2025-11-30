import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
<<<<<<< HEAD
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function chunkArray(array: any[], size: number) {
  const out = [];
  for (let i = 0; i < array.length; i += size) {
    out.push(array.slice(i, i + size));
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
=======
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
>>>>>>> 20f347d6bf4a2bc89fc1bb812bdf4c6aae84fada
    return new Response(null, { headers: corsHeaders });
  }

  try {
<<<<<<< HEAD
    const {
      datasetId,
      dataObjects,
      facultadColumn,
      carreraColumn,
      fileName,
      comentariosColumn,
    } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log(`🚀 Procesando ${dataObjects.length} filas`);

    /* -------------------------
       1. FACULTADES Y CARRERAS
       ------------------------- */
    const facSet = new Set<string>();
    const carMap: Record<string, Set<string>> = {};

    for (const row of dataObjects) {
      const fac = (row[facultadColumn] || "").trim();
      const car = (row[carreraColumn] || "").trim();

      if (!fac) continue;
      facSet.add(fac);

      if (!carMap[fac]) carMap[fac] = new Set();
      if (car) carMap[fac].add(car);
    }

    const facArr = [...facSet];

    // Facultades existentes
    const { data: existingFac } = await supabase
      .from("facultades")
      .select("id,nombre")
      .in("nombre", facArr);

    const facIds: Record<string, string> = {};
    existingFac?.forEach((f) => (facIds[f.nombre] = f.id));

    // Insertar nuevas
    const newFac = facArr.filter((f) => !facIds[f]);

    if (newFac.length > 0) {
      const { data: inserted } = await supabase
        .from("facultades")
        .insert(newFac.map((n) => ({ nombre: n })))
        .select();

      inserted?.forEach((f) => (facIds[f.nombre] = f.id));
    }

    /* -------------------------
       2. Insertar CARRERAS
       ------------------------- */
    for (const [fac, carreras] of Object.entries(carMap)) {
      const facultadId = facIds[fac];
      if (!facultadId) continue;

      const carrerasArr = [...carreras];

      const { data: existing } = await supabase
        .from("carreras")
        .select("nombre")
        .eq("facultad_id", facultadId)
        .in("nombre", carrerasArr);

      const existingSet = new Set(existing?.map((c) => c.nombre));

      const nuevas = carrerasArr.filter((c) => !existingSet.has(c));

      for (const chunk of chunkArray(nuevas, 250)) {
        await supabase.from("carreras").insert(
          chunk.map((nombre) => ({
            facultad_id: facultadId,
            nombre,
          }))
        );
      }
    }

    /* -------------------------
       3. NUEVA VERSIÓN
       ------------------------- */
    const { data: lastV } = await supabase
      .from("dataset_versions")
      .select("version_number")
      .eq("dataset_id", datasetId)
      .order("version_number", { ascending: false })
      .limit(1);

    const nextVersion = lastV?.length ? lastV[0].version_number + 1 : 1;

    const { data: version } = await supabase
      .from("dataset_versions")
      .insert({
        dataset_id: datasetId,
        version_number: nextVersion,
        file_path: fileName,
        total_rows: dataObjects.length,
        total_columns: Object.keys(dataObjects[0] || {}).length,
=======
    console.log('=== INICIO DE PROCESO ===');
    const requestBody = await req.json();
    console.log('Request body recibido:', JSON.stringify({
      datasetId: requestBody.datasetId,
      dataObjectsLength: requestBody.dataObjects?.length,
      facultadColumn: requestBody.facultadColumn,
      carreraColumn: requestBody.carreraColumn,
      fileName: requestBody.fileName,
      comentariosColumn: requestBody.comentariosColumn
    }));
    
    const { datasetId, dataObjects, facultadColumn, carreraColumn, fileName, comentariosColumn } = requestBody;

    if (!datasetId || !dataObjects || !facultadColumn || !carreraColumn) {
      throw new Error('Faltan parámetros requeridos: datasetId, dataObjects, facultadColumn, carreraColumn');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configuradas');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Procesando ${dataObjects.length} registros para dataset ${datasetId}`);

    // Extraer facultades y carreras únicas
    const facultadesUnicas = new Set<string>();
    const carrerasPorFacultad: Record<string, Set<string>> = {};

    dataObjects.forEach((row: any) => {
      const facultad = row[facultadColumn];
      const carrera = row[carreraColumn];

      if (facultad && String(facultad).trim()) {
        const facNombre = String(facultad).trim();
        facultadesUnicas.add(facNombre);

        if (carrera && String(carrera).trim()) {
          const carNombre = String(carrera).trim();
          if (!carrerasPorFacultad[facNombre]) {
            carrerasPorFacultad[facNombre] = new Set();
          }
          carrerasPorFacultad[facNombre].add(carNombre);
        }
      }
    });

    // Insertar facultades en batch
    const facultadIds: Record<string, string> = {};
    const facultadesArray = Array.from(facultadesUnicas);
    
    // Obtener facultades existentes en batch
    const { data: existingFacultades } = await supabase
      .from('facultades')
      .select('id, nombre')
      .in('nombre', facultadesArray);

    // Guardar IDs de facultades existentes
    if (existingFacultades) {
      existingFacultades.forEach(fac => {
        facultadIds[fac.nombre] = fac.id;
      });
    }

    // Insertar solo facultades nuevas
    const nuevasFacultades = facultadesArray.filter(nombre => !facultadIds[nombre]);
    if (nuevasFacultades.length > 0) {
      const { data: insertedFacultades, error: facError } = await supabase
        .from('facultades')
        .insert(nuevasFacultades.map(nombre => ({ nombre })))
        .select('id, nombre');

      if (facError) throw facError;

      if (insertedFacultades) {
        insertedFacultades.forEach(fac => {
          facultadIds[fac.nombre] = fac.id;
        });
      }
    }

    // Insertar carreras en batch por facultad
    for (const [facNombre, carreras] of Object.entries(carrerasPorFacultad)) {
      const facultadId = facultadIds[facNombre];
      if (!facultadId) continue;

      const carrerasArray = Array.from(carreras);

      // Obtener carreras existentes
      const { data: existingCarreras } = await supabase
        .from('carreras')
        .select('nombre')
        .eq('facultad_id', facultadId)
        .in('nombre', carrerasArray);

      const existingNames = new Set(existingCarreras?.map(c => c.nombre) || []);
      const nuevasCarreras = carrerasArray.filter(nombre => !existingNames.has(nombre));

      // Insertar solo carreras nuevas
      if (nuevasCarreras.length > 0) {
        const { error: carError } = await supabase
          .from('carreras')
          .insert(nuevasCarreras.map(nombre => ({
            facultad_id: facultadId,
            nombre
          })));

        if (carError) {
          console.error('Error insertando carreras:', carError);
        }
      }
    }

    // Obtener siguiente número de versión
    const { data: existingVersions, error: versionError } = await supabase
      .from('dataset_versions')
      .select('version_number')
      .eq('dataset_id', datasetId)
      .order('version_number', { ascending: false })
      .limit(1);

    if (versionError) throw versionError;

    const nextVersionNumber = existingVersions && existingVersions.length > 0
      ? existingVersions[0].version_number + 1
      : 1;

    // Crear la nueva versión
    const { data: newVersion, error: insertError } = await supabase
      .from('dataset_versions')
      .insert({
        dataset_id: datasetId,
        version_number: nextVersionNumber,
        file_path: fileName,
        data: dataObjects,
>>>>>>> 20f347d6bf4a2bc89fc1bb812bdf4c6aae84fada
        comentarios_column: comentariosColumn,
      })
      .select()
      .single();

<<<<<<< HEAD
    console.log("✔ Nueva versión creada:", version.id);

    /* -------------------------
       4. GUARDAR DATA EN CHUNKS
       ------------------------- */
    const chunks = chunkArray(dataObjects, 300);

    for (const chunk of chunks) {
      await supabase.from("dataset_rows").insert(
        chunk.map((row) => ({
          version_id: version.id,
          data: row,
        }))
      );
    }

    /* -------------------------
       5. ANALIZAR COMENTARIOS (async)
       ------------------------- */
    if (comentariosColumn) {
      supabase.functions.invoke("analizar-comentarios", {
        body: { versionId: version.id },
=======
    if (insertError) throw insertError;

    console.log(`Versión ${nextVersionNumber} creada con ID: ${newVersion.id}`);

    // Analizar comentarios de forma asíncrona (sin bloquear la respuesta)
    if (newVersion && comentariosColumn) {
      console.log('Iniciando análisis de comentarios en background...');
      
      // Invocar la función de análisis usando el cliente de Supabase
      supabase.functions.invoke('analizar-comentarios', {
        body: { versionId: newVersion.id }
      }).catch(error => {
        console.error('Error iniciando análisis de comentarios:', error);
>>>>>>> 20f347d6bf4a2bc89fc1bb812bdf4c6aae84fada
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
<<<<<<< HEAD
        version,
        stats: {
          filas: dataObjects.length,
          facultades: facArr.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("❌ Error :", e);
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
=======
        version: newVersion,
        stats: {
          registros: dataObjects.length,
          facultades: facultadesUnicas.size,
          carreras: Object.values(carrerasPorFacultad).reduce((sum, set) => sum + set.size, 0)
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error en crear-version:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error && error.stack ? error.stack : 'No stack trace';
    
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: errorDetails,
        type: error?.constructor?.name || typeof error
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
>>>>>>> 20f347d6bf4a2bc89fc1bb812bdf4c6aae84fada
  }
});
