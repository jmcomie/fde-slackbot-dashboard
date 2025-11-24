-- Create settings table for application configuration
-- Enforces singleton pattern (only one settings row allowed)

CREATE TABLE IF NOT EXISTS public.settings (
    -- Fixed UUID to enforce single row
    id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,

    -- Bot configuration
    bot_name TEXT,

    -- Classification configuration
    classification_method TEXT NOT NULL DEFAULT 'llm'
        CHECK (classification_method IN ('embedding', 'llm')),
    llm_model TEXT NOT NULL DEFAULT 'gpt-4o-mini',

    -- Grouping configuration (read-only, for display purposes)
    grouping_model TEXT NOT NULL DEFAULT 'all-MiniLM-L6-v2',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Enforce single row constraint
    CONSTRAINT single_settings_row CHECK (id = '00000000-0000-0000-0000-000000000001'::uuid)
);

-- Insert the single settings row with defaults
INSERT INTO public.settings (id)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read settings
CREATE POLICY "Allow read access to settings"
    ON public.settings
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Policy: Anyone can update settings (no INSERT/DELETE to preserve singleton)
CREATE POLICY "Allow update access to settings"
    ON public.settings
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER settings_updated_at
    BEFORE UPDATE ON public.settings
    FOR EACH ROW
    EXECUTE FUNCTION update_settings_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.settings IS 'Application-wide settings (singleton pattern - only one row allowed). Editable by anonymous and authenticated users.';
COMMENT ON COLUMN public.settings.bot_name IS 'Bot user ID or name to filter from message processing (e.g., U01234567 or BotName)';
COMMENT ON COLUMN public.settings.classification_method IS 'Method for classifying Slack messages: "embedding" (sentence-transformers) or "llm" (GPT-4o-mini)';
COMMENT ON COLUMN public.settings.llm_model IS 'OpenAI model name used for LLM classification';
COMMENT ON COLUMN public.settings.grouping_model IS 'Sentence-transformers model used for semantic grouping (read-only display)';
