-- Add embedding provider settings to allow switching between sentence-transformers and OpenAI embeddings
-- WARNING: Changing embedding provider mid-stream will cause new messages to not match existing concerns

-- Add embedding provider column
ALTER TABLE public.settings
ADD COLUMN embedding_provider TEXT NOT NULL DEFAULT 'sentence-transformers'
    CHECK (embedding_provider IN ('sentence-transformers', 'openai'));

-- Add embedding model column (replaces grouping_model)
ALTER TABLE public.settings
ADD COLUMN embedding_model TEXT NOT NULL DEFAULT 'all-MiniLM-L6-v2';

-- Update the default row with current values
UPDATE public.settings
SET
    embedding_provider = 'sentence-transformers',
    embedding_model = 'all-MiniLM-L6-v2'
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;

-- Add comments for documentation
COMMENT ON COLUMN public.settings.embedding_provider IS 'Provider for semantic grouping embeddings: "sentence-transformers" (local, free) or "openai" (API, paid). WARNING: Changing this will prevent new messages from matching existing concerns.';
COMMENT ON COLUMN public.settings.embedding_model IS 'Model name for embeddings. For sentence-transformers: "all-MiniLM-L6-v2" (384d), "all-mpnet-base-v2" (768d). For openai: "text-embedding-3-small" (1536d), "text-embedding-3-large" (3072d)';

-- Note: We keep grouping_model for backward compatibility, but embedding_model is now the source of truth
COMMENT ON COLUMN public.settings.grouping_model IS 'DEPRECATED: Use embedding_model instead. Kept for backward compatibility.';
