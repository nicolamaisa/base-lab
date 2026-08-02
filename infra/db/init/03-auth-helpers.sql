-- ----------------------------------------------------------------------------
-- Auth helpers
-- ----------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(
      current_setting('request.jwt.claim.sub', true),
      ''
    ),
    (
      NULLIF(
        current_setting('request.jwt.claims', true),
        ''
      )::jsonb ->> 'sub'
    )
  )::uuid;
$$;