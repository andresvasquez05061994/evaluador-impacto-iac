-- Cierre de acceso anónimo al portafolio.
-- Aditiva: no borra filas, no trunca, no elimina columnas y no reasigna dueños.
-- No vuelva a ejecutar 001_projects.sql después de este script: 001 recrea
-- las políticas abiertas (USING true) que aquí se reemplazan.
--
-- Las filas ya guardadas quedan con owner_id NULL. No se modifican.
-- Un usuario con app_metadata.role = admin puede verlas y editarlas.
-- El paso manual para asignarles dueño está en el README; no va en esta migración
-- porque el usuario administrador todavía no existe cuando se aplica el SQL.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.projects.owner_id IS
  'Usuario de Supabase Auth dueño del escenario. NULL conserva filas anteriores a esta migración; solo las ve un administrador hasta el paso manual de asignación.';

CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects (owner_id);

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

-- El rol se lee de app_metadata. Ese claim lo asigna el administrador; el usuario no puede cambiarlo.
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

CREATE OR REPLACE FUNCTION private.set_project_owner()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- SQL Editor (y otras sesiones sin JWT de usuario): no hay auth.uid().
  -- Se respeta el owner_id que trae la sentencia (así el paso manual puede
  -- asignar las filas históricas). La API anónima no llega aquí: no tiene GRANT.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT private.is_admin() OR NEW.owner_id IS NULL THEN
      NEW.owner_id := auth.uid();
    END IF;
  ELSIF OLD.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  ELSE
    NEW.owner_id := OLD.owner_id;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.set_project_owner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.set_project_owner() TO authenticated;

DROP TRIGGER IF EXISTS projects_set_owner ON public.projects;
CREATE TRIGGER projects_set_owner
  BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION private.set_project_owner();

REVOKE ALL ON TABLE public.projects FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.projects FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.projects TO authenticated;

DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;
DROP POLICY IF EXISTS "projects_delete" ON public.projects;

DROP POLICY IF EXISTS "projects_select_owner_or_admin" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_own" ON public.projects;
DROP POLICY IF EXISTS "projects_update_owner_or_admin" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_owner_or_admin" ON public.projects;

CREATE POLICY "projects_select_owner_or_admin"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR (SELECT private.is_admin())
  );

CREATE POLICY "projects_insert_own"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    OR (SELECT private.is_admin())
  );

CREATE POLICY "projects_update_owner_or_admin"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR (SELECT private.is_admin())
  )
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    OR (SELECT private.is_admin())
  );

CREATE POLICY "projects_delete_owner_or_admin"
  ON public.projects
  FOR DELETE
  TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR (SELECT private.is_admin())
  );
