# FDE Slackbot Backend

Backend system for the Forward-Deployed Engineer (FDE) Slackbot Dashboard.

## Project Structure

```
backend/
├── src/
│   └── fde_slackbot/          # Main package
│       ├── classifier/        # Message classification module
│       │   ├── classifier.py  # Main classifier orchestrator
│       │   ├── embeddings.py  # Embedding-based classification
│       │   ├── filters.py     # Regex pre-filtering
│       │   ├── config.py      # Configuration & category examples
│       │   └── models.py      # Pydantic result models
│       └── lib/               # Shared utilities
│           └── supabase_client.py  # Supabase database client
├── tests/                     # Test suite
│   └── test_classifier/
├── examples/                  # Example usage scripts
├── pyproject.toml            # Project configuration & dependencies
└── .env                      # Environment variables (not in git)
```

## Quick Start

### 1. Install Dependencies

Using `uv` (recommended):

```bash
cd backend
uv pip install -e .
```

Or using `pip`:

```bash
cd backend
pip install -e .
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
# Edit .env with your credentials
```

For local Supabase development:
```bash
export SUPABASE_ENV=local
```

For production:
```bash
export SUPABASE_ENV=production
# Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in .env
```

### 3. Run Example

```bash
python examples/example_classifier.py
```

## Components

### Message Classifier

The classifier module provides intelligent message categorization for FDE-relevant detection.

**Quick Example:**

```python
from fde_slackbot.classifier import MessageClassifier

classifier = MessageClassifier()
result = classifier.classify("The login button doesn't work")

print(result.category)      # "bug_report"
print(result.is_relevant)   # True
print(result.confidence)    # 0.89
```

**Categories:**
- `bug_report`: Errors, crashes, broken functionality
- `feature_request`: Requests for new features
- `support_question`: How-to questions, help requests
- `general_question`: Product/deployment questions
- `irrelevant`: Casual messages, greetings, thanks

📖 **See [CLASSIFIER_README.md](./CLASSIFIER_README.md) for detailed documentation**

### Supabase Client

Environment-aware Supabase client for database operations.

```python
from fde_slackbot.lib import get_supabase_client

supabase = get_supabase_client()
result = supabase.table('messages').select('*').execute()
```

## Development

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=fde_slackbot

# Run specific test file
pytest tests/test_classifier/test_integration.py
```

### Code Quality

```bash
# Format code
black src/ tests/

# Lint code
ruff check src/ tests/

# Type checking
mypy src/
```

## Dependencies

Core dependencies:
- `sentence-transformers`: For message embeddings
- `scikit-learn`: For similarity calculations
- `pydantic`: For data validation
- `supabase`: For database operations
- `python-dotenv`: For environment variables

Dev dependencies:
- `pytest`: Testing framework
- `black`: Code formatting
- `ruff`: Fast linting
- `mypy`: Type checking

## Architecture

### Message Classification Pipeline

```
Slack Message
    ↓
[Regex Filter] ← Fast pre-filtering (~5ms)
    ↓
[Embedding Classifier] ← Semantic classification (~30-50ms)
    ↓
ClassificationResult
    ↓
[Is Relevant?]
    ├─ Yes → Store in database
    └─ No → Ignore
```

### Performance

- **Latency**: 30-50ms average per message
- **Accuracy**: 85-92% classification accuracy
- **Throughput**: ~20-50 messages/second
- **Cost**: $0 (no API costs, runs locally)

## Configuration

### Classifier Configuration

Adjust confidence thresholds in your code:

```python
classifier = MessageClassifier(
    confidence_threshold=0.7,  # Minimum confidence for relevance
    embedding_model='all-MiniLM-L6-v2',  # Model to use
    enable_regex_filter=True,  # Use fast pre-filtering
)
```

Or modify defaults in `src/fde_slackbot/classifier/config.py`.

### Environment Variables

See `.env.example` for all available environment variables.

## Project Setup (uv)

This project uses the `src` layout, which is the modern Python packaging standard:

- Prevents accidental imports from local directory
- Works better with editable installs (`pip install -e .`)
- Ensures tests import from installed package
- Standard for distributable packages

To install in development mode:

```bash
uv pip install -e .
```

This makes the `fde_slackbot` package importable from anywhere.

## Troubleshooting

### Model Download Issues

The first time you use the classifier, it downloads the sentence transformer model (~90MB). If you encounter issues:

```bash
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"
```

### Import Errors

Make sure you've installed the package in development mode:

```bash
uv pip install -e .
```

### Supabase Connection Issues

Check your environment variables:

```bash
python -c "from fde_slackbot.lib import get_supabase_client; get_supabase_client()"
```

## Next Steps

1. **Integrate with Slack**: Use the classifier in your Slack event handler
2. **Store Results**: Save relevant messages to Supabase
3. **Build Dashboard**: Create frontend to display categorized messages
4. **Add Grouping**: Use embeddings for message grouping/deduplication

## Resources

- [CLASSIFIER_README.md](./CLASSIFIER_README.md) - Detailed classifier documentation
- [pyproject.toml](./pyproject.toml) - Project configuration
- [tests/](./tests/) - Test suite
- [examples/](./examples/) - Example scripts

## License

Part of the Nixo FDE Slackbot take-home project.
