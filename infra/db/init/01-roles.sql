-- ----------------------------------------------------------------------------
-- System Roles
-- ----------------------------------------------------------------------------

-- Create postgres role if it doesn't exist (needed for GoTrue compatibility)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'postgres'
) THEN CREATE ROLE postgres WITH LOGIN SUPERUSER;
END IF;
END $$;

DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'anon'
) THEN CREATE ROLE anon NOLOGIN;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'authenticated'
) THEN CREATE ROLE authenticated NOLOGIN;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'authenticator'
) THEN CREATE ROLE authenticator NOLOGIN;
END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'service_role'
  ) THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END
$$;

-- Grant roles to current user (needed for RLS impersonation)
-- NOTE: Only grant postgres role if it exists (might not exist if custom POSTGRES_USER is used)
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'postgres'
) THEN
GRANT postgres TO CURRENT_USER;
END IF;
END $$;

GRANT authenticator TO CURRENT_USER;
