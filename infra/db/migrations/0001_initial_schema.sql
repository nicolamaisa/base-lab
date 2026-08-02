-- ----------------------------------------------------------------------------
-- API Base initial application schema
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------

CREATE TYPE public.base_enum AS ENUM (
    'draft',
    'ready',
    'archived'
);

CREATE TYPE public.base_run_status AS ENUM (
    'pending',
    'running',
    'completed',
    'failed'
);

CREATE TYPE public.llm_model_pull_status AS ENUM (
    'pending',
    'running',
    'completed',
    'failed'
);

-- ----------------------------------------------------------------------------
-- Shared functions
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Base tables
-- ----------------------------------------------------------------------------

CREATE TABLE public.base_table (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    base_type public.base_enum NOT NULL DEFAULT 'draft',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.base_run (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    prompt text NOT NULL,
    status public.base_run_status NOT NULL DEFAULT 'pending',
    configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
    response text,
    raw_response jsonb,
    error_code text,
    error_message text,
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT base_run_status_not_empty CHECK (
        length(trim(status::text)) > 0
    ),
    CONSTRAINT base_run_prompt_not_empty CHECK (length(trim(prompt)) > 0),
    CONSTRAINT base_run_configuration_is_object CHECK (
        jsonb_typeof(configuration) = 'object'
    ),
    CONSTRAINT base_run_raw_response_is_object CHECK (
        raw_response IS NULL
        OR jsonb_typeof(raw_response) = 'object'
    )
);

CREATE TABLE public.ai_invocations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    run_id uuid NOT NULL REFERENCES public.base_run (id) ON DELETE CASCADE,
    task_type text NOT NULL,
    context_type text,
    context_id uuid,
    provider text NOT NULL,
    model_key text NOT NULL,
    status public.base_run_status NOT NULL DEFAULT 'pending',
    request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    response_payload jsonb,
    input_tokens integer,
    output_tokens integer,
    total_tokens integer,
    latency_ms integer,
    error_code text,
    error_message text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ai_invocations_task_type_not_empty CHECK (length(trim(task_type)) > 0),
    CONSTRAINT ai_invocations_provider_format CHECK (
        length(provider) BETWEEN 1 AND 64
        AND provider ~ '^[a-z0-9][a-z0-9._-]*$'
    ),
    CONSTRAINT ai_invocations_model_key_not_empty CHECK (length(trim(model_key)) > 0)
);

-- ----------------------------------------------------------------------------
-- Remote model catalog
-- ----------------------------------------------------------------------------

CREATE TABLE public.llm_model_catalog (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    provider text NOT NULL,
    model_key text NOT NULL,
    display_name text NOT NULL,
    enabled boolean NOT NULL DEFAULT true,
    is_default boolean NOT NULL DEFAULT false,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT llm_model_catalog_remote_provider CHECK (
        provider <> 'ollama'
        AND length(provider) BETWEEN 1 AND 64
        AND provider ~ '^[a-z0-9][a-z0-9._-]*$'
    ),
    CONSTRAINT llm_model_catalog_model_key_not_empty CHECK (
        length(trim(model_key)) > 0
        AND length(model_key) <= 300
    ),
    CONSTRAINT llm_model_catalog_display_name_not_empty CHECK (
        length(trim(display_name)) > 0
        AND length(display_name) <= 200
    ),
    CONSTRAINT llm_model_catalog_metadata_is_object CHECK (
        jsonb_typeof(metadata) = 'object'
    ),
    CONSTRAINT llm_model_catalog_default_is_enabled CHECK (
        NOT is_default
        OR enabled
    ),
    CONSTRAINT llm_model_catalog_owner_provider_model_unique UNIQUE (owner_id, provider, model_key)
);

-- ----------------------------------------------------------------------------
-- Persistent local model pulls
-- ----------------------------------------------------------------------------

CREATE TABLE public.llm_model_pulls (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    provider text NOT NULL,
    model_key text NOT NULL,
    status public.llm_model_pull_status NOT NULL DEFAULT 'pending',
    gateway_request_id uuid,
    progress_status text,
    layer_digest text,
    layer_completed_bytes bigint,
    layer_total_bytes bigint,
    layer_percent double precision,
    error_code text,
    error_message text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT llm_model_pulls_provider_valid CHECK (
        length(provider) BETWEEN 1 AND 64
        AND provider ~ '^[a-z0-9][a-z0-9._-]*$'
    ),
    CONSTRAINT llm_model_pulls_model_key_valid CHECK (
        length(trim(model_key)) BETWEEN 1 AND 200
        AND model_key ~ '^[a-zA-Z0-9][a-zA-Z0-9._:/-]*$'
    ),
    CONSTRAINT llm_model_pulls_layer_completed_bytes_valid CHECK (
        layer_completed_bytes IS NULL
        OR layer_completed_bytes >= 0
    ),
    CONSTRAINT llm_model_pulls_layer_total_bytes_valid CHECK (
        layer_total_bytes IS NULL
        OR layer_total_bytes >= 0
    ),
    CONSTRAINT llm_model_pulls_layer_percent_valid CHECK (
        layer_percent IS NULL
        OR layer_percent BETWEEN 0 AND 100
    ),
    CONSTRAINT llm_model_pulls_metadata_is_object CHECK (
        jsonb_typeof(metadata) = 'object'
    ),
    CONSTRAINT llm_model_pulls_terminal_timestamp CHECK (
        (
            status IN ('completed', 'failed')
            AND completed_at IS NOT NULL
        )
        OR (
            status IN ('pending', 'running')
            AND completed_at IS NULL
        )
    ),
    CONSTRAINT llm_model_pulls_error_state CHECK (
        status = 'failed'
        OR (
            error_code IS NULL
            AND error_message IS NULL
        )
    )
);

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------

CREATE INDEX base_owner_created_idx ON public.base_table (owner_id, created_at DESC);

CREATE INDEX base_owner_status_idx ON public.base_table (owner_id, base_type);

CREATE INDEX base_run_owner_created_idx ON public.base_run (owner_id, created_at DESC);

CREATE INDEX base_run_status_idx ON public.base_run (status);

CREATE INDEX ai_invocations_owner_created_at_idx ON public.ai_invocations (owner_id, created_at DESC);

CREATE INDEX ai_invocations_context_idx ON public.ai_invocations (context_type, context_id);

CREATE INDEX ai_invocations_status_idx ON public.ai_invocations (status);

CREATE INDEX llm_model_catalog_owner_provider_enabled_idx ON public.llm_model_catalog (
    owner_id,
    provider,
    enabled,
    display_name
);

CREATE UNIQUE INDEX llm_model_catalog_one_default_per_provider_idx ON public.llm_model_catalog (owner_id, provider)
WHERE
    is_default;

CREATE INDEX llm_model_pulls_owner_created_idx ON public.llm_model_pulls (owner_id, created_at DESC);

CREATE INDEX llm_model_pulls_status_updated_idx ON public.llm_model_pulls (status, updated_at);

CREATE UNIQUE INDEX llm_model_pulls_one_active_model_idx ON public.llm_model_pulls (owner_id, provider, model_key)
WHERE
    status IN ('pending', 'running');

-- ----------------------------------------------------------------------------
-- Updated-at triggers
-- ----------------------------------------------------------------------------

CREATE TRIGGER base_table_set_updated_at
BEFORE UPDATE ON public.base_table
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER base_run_set_updated_at
BEFORE UPDATE ON public.base_run
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER llm_model_catalog_set_updated_at
BEFORE UPDATE ON public.llm_model_catalog
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER llm_model_pulls_set_updated_at
BEFORE UPDATE ON public.llm_model_pulls
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Permissions
-- ----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT
SELECT, INSERT,
UPDATE, DELETE ON TABLE public.base_table, public.base_run, public.ai_invocations, public.llm_model_catalog, public.llm_model_pulls TO authenticated;

GRANT ALL PRIVILEGES ON TABLE public.base_table,
public.base_run,
public.ai_invocations,
public.llm_model_catalog,
public.llm_model_pulls TO service_role;

GRANT USAGE,
SELECT
    ON ALL SEQUENCES IN SCHEMA public TO authenticated,
    service_role;