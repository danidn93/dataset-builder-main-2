-- Agregar columna para almacenar qué columna del dataset contiene comentarios
ALTER TABLE dataset_versions ADD COLUMN comentarios_column TEXT;

-- Crear tabla para almacenar análisis de comentarios por versión
CREATE TABLE public.analisis_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES dataset_versions(id) ON DELETE CASCADE,
  facultad_nombre TEXT,
  carrera_nombre TEXT,
  comentario_positivo TEXT,
  comentario_negativo TEXT,
  recomendaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(version_id, facultad_nombre, carrera_nombre)
);

-- Habilitar RLS
ALTER TABLE analisis_comentarios ENABLE ROW LEVEL SECURITY;

-- Política: Cualquiera puede ver análisis
CREATE POLICY "Anyone can view analisis"
ON analisis_comentarios
FOR SELECT
USING (true);

-- Política: Solo usuarios autenticados pueden crear análisis
CREATE POLICY "Authenticated users can create analisis"
ON analisis_comentarios
FOR INSERT
TO authenticated
WITH CHECK (true);