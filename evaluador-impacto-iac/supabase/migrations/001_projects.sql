-- Portafolio de escenarios del Evaluador de Impacto IAC
-- Ejecutar en Supabase → SQL Editor (o con Supabase CLI)

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  org TEXT NOT NULL DEFAULT '',
  sector TEXT NOT NULL DEFAULT 'Sin clasificar',
  process_type TEXT NOT NULL DEFAULT 'Proceso manual',
  narrative TEXT NOT NULL DEFAULT '',
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_org ON public.projects (org);
CREATE INDEX IF NOT EXISTS idx_projects_saved_at ON public.projects (saved_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_org_saved_at ON public.projects (org, saved_at DESC);

CREATE OR REPLACE FUNCTION public.set_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS projects_updated_at ON public.projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_projects_updated_at();

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;
DROP POLICY IF EXISTS "projects_delete" ON public.projects;

CREATE POLICY "projects_select"
  ON public.projects FOR SELECT
  USING (true);

CREATE POLICY "projects_insert"
  ON public.projects FOR INSERT
  WITH CHECK (true);

CREATE POLICY "projects_update"
  ON public.projects FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "projects_delete"
  ON public.projects FOR DELETE
  USING (true);
