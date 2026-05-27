-- EcoPulse Analytics Schema - GDPR-Conscious Sustainability Telemetry
-- Database: PostgreSQL (Supabase Compatible)
-- Initial Migration: 20260527000000_init_analytics_schema.sql

BEGIN;

-- ==========================================
-- 1. REFERENCE TABLES
-- ==========================================

-- model_catalog: Stores LLM engine metadata and energy draw assumptions
CREATE TABLE IF NOT EXISTS public.model_catalog (
    model_id VARCHAR(50) PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    provider VARCHAR(100) NOT NULL,
    model_size VARCHAR(20) NOT NULL CHECK (model_size IN ('Small', 'Medium', 'Large', 'Extra Large', 'Auto')),
    kwh_per_1k_tokens NUMERIC(10, 6) NOT NULL,
    water_ml_per_1k_tokens NUMERIC(10, 4) NOT NULL,
    ewaste_mg_per_1k_tokens NUMERIC(10, 4) NOT NULL,
    suitability_tags VARCHAR(50)[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Populate model catalog with default EcoPulse models
INSERT INTO public.model_catalog (model_id, model_name, provider, model_size, kwh_per_1k_tokens, water_ml_per_1k_tokens, ewaste_mg_per_1k_tokens, suitability_tags)
VALUES
    ('eco-router', 'Green Eco-Router', 'Echo Pulse', 'Auto', 0.001500, 1.5000, 0.0150, ARRAY['routing', 'optimization']),
    ('gpt-4-opus', 'Claude 3 Opus / GPT-4', 'Anthropic / Microsoft', 'Extra Large', 0.012000, 12.0000, 0.1500, ARRAY['complex-reasoning', 'coding', 'heavy-analysis']),
    ('gpt-4o-sonnet', 'GPT-4o / Claude 3.5 Sonnet', 'Microsoft / Anthropic', 'Large', 0.004000, 4.0000, 0.0500, ARRAY['conversational', 'creative-writing', 'image-processing']),
    ('gpt-35-llama70', 'Llama 3 70B / GPT-3.5 Turbo', 'Meta / Microsoft', 'Medium', 0.001500, 1.5000, 0.0150, ARRAY['general-purpose', 'summarization', 'standard-tasks']),
    ('llama3-8b-flash', 'Llama 3 8B / Gemini 1.5 Flash', 'Meta / Google', 'Small', 0.000300, 0.3000, 0.0030, ARRAY['realtime-chat', 'simple-completions', 'low-latency'])
ON CONFLICT (model_id) DO UPDATE SET
    model_name = EXCLUDED.model_name,
    kwh_per_1k_tokens = EXCLUDED.kwh_per_1k_tokens,
    water_ml_per_1k_tokens = EXCLUDED.water_ml_per_1k_tokens,
    ewaste_mg_per_1k_tokens = EXCLUDED.ewaste_mg_per_1k_tokens;

-- ==========================================
-- 2. CORE ANALYTICS TABLES
-- ==========================================

-- user_sessions: Anonymous session tracking without storing PII (IPs, emails, names)
CREATE TABLE IF NOT EXISTS public.user_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_agent_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of browser User-Agent
    referrer VARCHAR(255) DEFAULT 'direct'::character varying, -- traffic referrer (e.g. github, dev.to)
    device_category VARCHAR(20) CHECK (device_category IN ('desktop', 'mobile', 'tablet')),
    session_started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    session_ended_at TIMESTAMP WITH TIME ZONE,
    total_audits_run INTEGER DEFAULT 0 NOT NULL,
    total_co2_saved_grams NUMERIC(12, 4) DEFAULT 0.0000 NOT NULL,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- audit_events: Log environmental footprint audits (strictly excludes raw prompts or uploaded content)
CREATE TABLE IF NOT EXISTS public.audit_events (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.user_sessions(session_id) ON DELETE SET NULL,
    selected_model_id VARCHAR(50) REFERENCES public.model_catalog(model_id),
    routed_model_id VARCHAR(50) REFERENCES public.model_catalog(model_id),
    was_routed BOOLEAN DEFAULT false NOT NULL,
    prompt_char_count INTEGER NOT NULL CHECK (prompt_char_count >= 0),
    prompt_token_estimate INTEGER NOT NULL CHECK (prompt_token_estimate >= 0),
    response_token_estimate INTEGER NOT NULL CHECK (response_token_estimate >= 0),
    total_tokens INTEGER NOT NULL CHECK (total_tokens >= 0),
    workload_class VARCHAR(50) NOT NULL, -- e.g., 'coding', 'summarization', 'image-analysis'
    complexity_level VARCHAR(20) NOT NULL CHECK (complexity_level IN ('Low', 'Medium', 'High')),
    estimated_kwh NUMERIC(12, 6) NOT NULL,
    estimated_co2_grams NUMERIC(12, 4) NOT NULL,
    estimated_water_ml NUMERIC(12, 4) NOT NULL,
    estimated_ewaste_mg NUMERIC(12, 4) NOT NULL,
    grid_intensity_gco2_kwh INTEGER NOT NULL CHECK (grid_intensity_gco2_kwh >= 0),
    region_id VARCHAR(50) NOT NULL DEFAULT 'national', -- broad regional grid identifier
    is_live_grid_data BOOLEAN DEFAULT false NOT NULL,
    audited_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- click_events: Log interface interactions and feature engagement metrics
CREATE TABLE IF NOT EXISTS public.click_events (
    click_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.user_sessions(session_id) ON DELETE CASCADE,
    element_id VARCHAR(100) NOT NULL, -- e.g., 'refresh-grid-btn', 'local-city-select'
    element_type VARCHAR(50) NOT NULL, -- e.g., 'button', 'select', 'modal'
    interaction_type VARCHAR(50) NOT NULL, -- e.g., 'click', 'change', 'submit'
    event_context JSONB DEFAULT '{}'::jsonb NOT NULL, -- stores contextual metadata e.g. {"selected_region": "13"}
    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- grid_observations: Log live carbon intensity values and generation mix for analytics
CREATE TABLE IF NOT EXISTS public.grid_observations (
    observation_id BIGSERIAL PRIMARY KEY,
    region_id VARCHAR(50) NOT NULL DEFAULT 'national',
    region_name VARCHAR(100) NOT NULL DEFAULT 'United Kingdom',
    intensity_actual INTEGER NOT NULL CHECK (intensity_actual >= 0),
    intensity_forecast INTEGER NOT NULL CHECK (intensity_forecast >= 0),
    intensity_index VARCHAR(20) NOT NULL CHECK (intensity_index IN ('very low', 'low', 'moderate', 'high')),
    fuel_mix JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g., [{"fuel": "wind", "perc": 45}]
    is_forecast BOOLEAN DEFAULT false NOT NULL,
    observed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- recommendations: Log optimization rules triggered and user adoption rates
CREATE TABLE IF NOT EXISTS public.recommendations (
    recommendation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.user_sessions(session_id) ON DELETE CASCADE,
    audit_id UUID REFERENCES public.audit_events(audit_id) ON DELETE SET NULL,
    rule_triggered VARCHAR(100) NOT NULL, -- e.g. 'high_intensity_heavy_model'
    advice_category VARCHAR(50) NOT NULL, -- e.g. 'Model Swap', 'Peak Shifting', 'Caching'
    action_suggested TEXT NOT NULL,
    potential_co2_savings_grams NUMERIC(10, 4) NOT NULL,
    is_adopted BOOLEAN DEFAULT false NOT NULL, -- true if user followed recommendation (e.g. ran router)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================
-- 3. INDEXING STRATEGY FOR TIME-SERIES & JOIN PERF
-- ==========================================

-- User Sessions lookup indexes
CREATE INDEX IF NOT EXISTS idx_sessions_last_active ON public.user_sessions(last_active_at DESC);

-- Audit Events indexes (heavy analytics queries run here)
CREATE INDEX IF NOT EXISTS idx_audit_session_id ON public.audit_events(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_time ON public.audit_events(audited_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_model_id ON public.audit_events(selected_model_id);
CREATE INDEX IF NOT EXISTS idx_audit_routed_model ON public.audit_events(routed_model_id);

-- Grid Observations indexes (frequent time-series rollups)
CREATE UNIQUE INDEX IF NOT EXISTS idx_grid_obs_unique ON public.grid_observations(region_id, observed_at, is_forecast);
CREATE INDEX IF NOT EXISTS idx_grid_obs_time ON public.grid_observations(observed_at DESC);

-- Recommendations indexes
CREATE INDEX IF NOT EXISTS idx_rec_session_id ON public.recommendations(session_id);
CREATE INDEX IF NOT EXISTS idx_rec_audit_id ON public.recommendations(audit_id);

-- Click Events indexes
CREATE INDEX IF NOT EXISTS idx_click_time ON public.click_events(clicked_at DESC);

-- ==========================================
-- 4. OBSERVABILITY & SYSTEM MAINTENANCE
-- ==========================================

-- Function to automatically update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_model_catalog_updated_at
    BEFORE UPDATE ON public.model_catalog
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
