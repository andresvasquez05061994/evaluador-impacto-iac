-- Lista de correos y dominios que pueden leer o escribir escenarios.
-- No modifica filas de public.projects. No borra políticas de 002:
-- agrega una política RESTRICTIVE que se suma (AND) a las de dueño/admin.
--
-- Con las tablas vacías nadie pasa. El alta de correos es un INSERT manual
-- en private.allowed_emails / private.allowed_domains (ver README), no aquí,
-- porque los correos autorizados no se conocen al aplicar el script.

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE TABLE IF NOT EXISTS private.allowed_emails (
  email text PRIMARY KEY CHECK (
    email = lower(email)
    AND position('@' in email) > 1
  )
);

CREATE TABLE IF NOT EXISTS private.allowed_domains (
  domain text PRIMARY KEY CHECK (
    domain = lower(domain)
    AND position('@' in domain) = 0
    AND length(domain) > 0
  )
);

ALTER TABLE private.allowed_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.allowed_domains ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE private.allowed_emails FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE private.allowed_domains FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.is_email_allowed()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM private.allowed_emails
      WHERE email = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
    OR EXISTS (
      SELECT 1
      FROM private.allowed_domains
      WHERE domain = lower(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 2))
        AND split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 2) <> ''
    );
$$;

REVOKE ALL ON FUNCTION private.is_email_allowed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_email_allowed() TO authenticated;

DROP POLICY IF EXISTS "projects_require_allowlist" ON public.projects;

CREATE POLICY "projects_require_allowlist"
  ON public.projects
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING ((SELECT private.is_email_allowed()))
  WITH CHECK ((SELECT private.is_email_allowed()));
