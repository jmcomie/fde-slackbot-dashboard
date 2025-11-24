import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useSettings } from '@/hooks/useSettings'
import { Save, Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import type { ClassificationMethod, EmbeddingProvider } from '@/types'

export default function Settings() {
  const { settings, loading, error, updating, updateSettings } = useSettings()
  const [showSuccess, setShowSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Form state
  const [botName, setBotName] = useState(settings?.bot_name || '')
  const [classificationMethod, setClassificationMethod] = useState<ClassificationMethod>(
    settings?.classification_method || 'llm'
  )
  const [llmContext, setLlmContext] = useState(settings?.llm_context || '')
  const [embeddingProvider, setEmbeddingProvider] = useState<EmbeddingProvider>(
    settings?.embedding_provider || 'sentence-transformers'
  )
  const [embeddingModel, setEmbeddingModel] = useState(settings?.embedding_model || 'all-MiniLM-L6-v2')

  // Update form state when settings load
  useEffect(() => {
    if (settings) {
      setBotName(settings.bot_name || '')
      setClassificationMethod(settings.classification_method)
      setLlmContext(settings.llm_context || '')
      setEmbeddingProvider(settings.embedding_provider)
      setEmbeddingModel(settings.embedding_model)
    }
  }, [settings])

  const handleSave = async () => {
    setSaveError(null)
    setShowSuccess(false)

    const result = await updateSettings({
      bot_name: botName.trim() || null,
      classification_method: classificationMethod,
      llm_context: llmContext.trim() || null,
      embedding_provider: embeddingProvider,
      embedding_model: embeddingModel,
    })

    if (result.success) {
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } else {
      setSaveError(result.error || 'Failed to save settings')
    }
  }

  const hasChanges =
    (settings?.bot_name || '') !== (botName.trim() || '') ||
    settings?.classification_method !== classificationMethod ||
    (settings?.llm_context || '') !== (llmContext.trim() || '') ||
    settings?.embedding_provider !== embeddingProvider ||
    settings?.embedding_model !== embeddingModel

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your dashboard preferences and integrations
          </p>
        </div>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>Failed to load settings: {error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure message classification, semantic grouping, and bot filtering
        </p>
      </div>

      {/* Success/Error Messages */}
      {showSuccess && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle2 className="h-5 w-5" />
              <p className="font-medium">Settings saved successfully!</p>
            </div>
          </CardContent>
        </Card>
      )}

      {saveError && (
        <Card className="border-destructive bg-red-50 dark:bg-red-950">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{saveError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Card 1: Message Classification */}
      <Card>
        <CardHeader>
          <CardTitle>Message Classification</CardTitle>
          <CardDescription>
            Choose how Slack messages are categorized before grouping
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="classification"
                value="llm"
                checked={classificationMethod === 'llm'}
                onChange={(e) => setClassificationMethod(e.target.value as ClassificationMethod)}
                className="mt-1"
              />
              <div>
                <div className="font-medium">LLM-based (GPT-4o-mini)</div>
                <div className="text-sm text-muted-foreground">
                  Uses OpenAI's GPT-4o-mini for semantic understanding and accurate classification.
                  Better handles edge cases and ambiguous messages.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="classification"
                value="embedding"
                checked={classificationMethod === 'embedding'}
                onChange={(e) => setClassificationMethod(e.target.value as ClassificationMethod)}
                className="mt-1"
              />
              <div>
                <div className="font-medium">Embedding-based</div>
                <div className="text-sm text-muted-foreground">
                  Uses sentence-transformers (all-MiniLM-L6-v2) with cosine similarity.
                  Faster and cheaper, but less accurate for ambiguous messages.
                </div>
              </div>
            </label>
          </div>

          {/* Conditional LLM Context Textarea */}
          {classificationMethod === 'llm' && (
            <div className="space-y-2 pt-2">
              <label htmlFor="llmContext" className="text-sm font-medium">
                Custom Context (Optional)
              </label>
              <textarea
                id="llmContext"
                value={llmContext}
                onChange={(e) => setLlmContext(e.target.value)}
                placeholder="e.g., This monitors Slack channels for Product X. Messages about Product X features, bugs, or usage are relevant."
                rows={3}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-y"
              />
              <p className="text-sm text-muted-foreground">
                Provide additional context to help the LLM understand what messages are relevant to your FDE support work.
                This context will be injected into the classification prompt.
              </p>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> Bug events (manually entered via /bugs page) always use the
              <code className="mx-1 px-1 bg-blue-100 dark:bg-blue-900 rounded">bug_report</code>
              category and skip classification.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Semantic Grouping */}
      <Card>
        <CardHeader>
          <CardTitle>Semantic Grouping</CardTitle>
          <CardDescription>
            How messages are matched to existing concerns using embeddings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <label className="text-sm font-medium">Embedding Provider</label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="embeddingProvider"
                value="sentence-transformers"
                checked={embeddingProvider === 'sentence-transformers'}
                onChange={(e) => setEmbeddingProvider(e.target.value as EmbeddingProvider)}
                className="mt-1"
              />
              <div>
                <div className="font-medium">sentence-transformers (Local)</div>
                <div className="text-sm text-muted-foreground">
                  Runs locally, free, fast (~20-50ms). Default model: all-MiniLM-L6-v2 (384 dimensions)
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="embeddingProvider"
                value="openai"
                checked={embeddingProvider === 'openai'}
                onChange={(e) => setEmbeddingProvider(e.target.value as EmbeddingProvider)}
                className="mt-1"
              />
              <div>
                <div className="font-medium">OpenAI API</div>
                <div className="text-sm text-muted-foreground">
                  API-based, paid (~$0.02/1M tokens), higher quality embeddings.
                  Model: text-embedding-3-small (1536 dimensions)
                </div>
              </div>
            </label>
          </div>

          {/* Warning about provider switching */}
          {embeddingProvider !== settings?.embedding_provider && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-md border border-yellow-200 dark:border-yellow-800">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium mb-1">⚠️ Warning: Changing embedding provider</p>
                <p>
                  Switching embedding providers will cause new messages to create separate concerns
                  instead of matching existing ones. Embeddings from different providers are incompatible.
                  Only change this setting when you have no open concerns, or when you want a fresh start.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 bg-muted rounded-md">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Semantic grouping uses embedding vectors and cosine similarity to match messages
              with related concerns. Messages in the same thread are always grouped together regardless
              of similarity score.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Bot Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Bot Configuration</CardTitle>
          <CardDescription>
            Filter out messages from your bot to prevent self-processing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="botName" className="text-sm font-medium">
              Bot Name / User ID
            </label>
            <input
              id="botName"
              type="text"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              placeholder="e.g., U01234567 or BotName"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-sm text-muted-foreground">
              Messages from this user will be ignored during processing.
              Enter either the Slack user ID (e.g., U01234567) or bot name.
            </p>
          </div>

          {!botName.trim() && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-md border border-yellow-200 dark:border-yellow-800">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                No bot filtering configured. Bot messages will be processed like regular messages.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-4">
        {hasChanges && (
          <p className="text-sm text-muted-foreground">
            You have unsaved changes
          </p>
        )}
        <Button
          onClick={handleSave}
          disabled={!hasChanges || updating}
          className="min-w-[120px]"
        >
          {updating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
