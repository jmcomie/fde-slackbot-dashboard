-- Add llm_context column to settings table for customizable LLM classification prompts
-- This allows users to provide domain-specific context (e.g., product name, relevance criteria)

ALTER TABLE public.settings
ADD COLUMN llm_context TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.settings.llm_context IS 'Optional custom context injected into LLM classification prompt. Used to provide product/domain-specific information to help the LLM understand what messages are relevant (e.g., "This monitors Product X support channels").';
