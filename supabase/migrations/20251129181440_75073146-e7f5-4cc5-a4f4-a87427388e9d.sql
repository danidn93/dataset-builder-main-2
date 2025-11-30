-- Agregar columna version_id a share_links para referenciar la versión específica
ALTER TABLE share_links ADD COLUMN version_id UUID REFERENCES dataset_versions(id) ON DELETE CASCADE;

-- Actualizar la foreign key de dataset_id para que apunte correctamente a datasets
ALTER TABLE share_links DROP CONSTRAINT IF EXISTS share_links_dataset_id_fkey;
ALTER TABLE share_links ADD CONSTRAINT share_links_dataset_id_fkey 
  FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE;