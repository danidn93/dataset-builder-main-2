-- Crear tabla de perfiles de usuario
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Habilitar RLS en profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Crear tabla de facultades
CREATE TABLE public.facultades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Habilitar RLS en facultades
ALTER TABLE public.facultades ENABLE ROW LEVEL SECURITY;

-- Políticas para facultades (lectura pública)
CREATE POLICY "Anyone can view facultades"
  ON public.facultades FOR SELECT
  USING (true);

-- Crear tabla de carreras
CREATE TABLE public.carreras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facultad_id UUID REFERENCES public.facultades(id) ON DELETE CASCADE NOT NULL,
  nombre TEXT NOT NULL,
  codigo TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(facultad_id, nombre)
);

-- Habilitar RLS en carreras
ALTER TABLE public.carreras ENABLE ROW LEVEL SECURITY;

-- Políticas para carreras (lectura pública)
CREATE POLICY "Anyone can view carreras"
  ON public.carreras FOR SELECT
  USING (true);

-- Crear tabla de datasets
CREATE TABLE public.datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Habilitar RLS en datasets
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;

-- Políticas para datasets
CREATE POLICY "Users can view their own datasets"
  ON public.datasets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own datasets"
  ON public.datasets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own datasets"
  ON public.datasets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own datasets"
  ON public.datasets FOR DELETE
  USING (auth.uid() = user_id);

-- Crear tabla de versiones de datasets
CREATE TABLE public.dataset_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(dataset_id, version_number)
);

-- Habilitar RLS en dataset_versions
ALTER TABLE public.dataset_versions ENABLE ROW LEVEL SECURITY;

-- Políticas para dataset_versions
CREATE POLICY "Users can view versions of their own datasets"
  ON public.dataset_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.datasets
      WHERE datasets.id = dataset_versions.dataset_id
      AND datasets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create versions for their own datasets"
  ON public.dataset_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.datasets
      WHERE datasets.id = dataset_versions.dataset_id
      AND datasets.user_id = auth.uid()
    )
  );

-- Crear tabla de links compartidos
CREATE TABLE public.share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK (link_type IN ('quick', 'facultad', 'carrera')),
  facultad_id UUID REFERENCES public.facultades(id) ON DELETE CASCADE,
  carrera_id UUID REFERENCES public.carreras(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  filters JSONB,
  charts JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at TIMESTAMPTZ
);

-- Habilitar RLS en share_links
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- Políticas para share_links (lectura pública por token)
CREATE POLICY "Anyone can view share links by token"
  ON public.share_links FOR SELECT
  USING (true);

CREATE POLICY "Dataset owners can create share links"
  ON public.share_links FOR INSERT
  WITH CHECK (
    dataset_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.datasets
      WHERE datasets.id = share_links.dataset_id
      AND datasets.user_id = auth.uid()
    )
  );

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_datasets_updated_at
  BEFORE UPDATE ON public.datasets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Función para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para crear perfil al registrarse
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Crear índices para mejor performance
CREATE INDEX idx_carreras_facultad_id ON public.carreras(facultad_id);
CREATE INDEX idx_datasets_user_id ON public.datasets(user_id);
CREATE INDEX idx_dataset_versions_dataset_id ON public.dataset_versions(dataset_id);
CREATE INDEX idx_share_links_token ON public.share_links(token);
CREATE INDEX idx_share_links_facultad_id ON public.share_links(facultad_id);
CREATE INDEX idx_share_links_carrera_id ON public.share_links(carrera_id);