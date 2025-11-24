# FDE Message Classifier

A Python library for classifying Slack messages for Forward-Deployed Engineer (FDE) relevance and categorization.

## Overview

The FDE Message Classifier uses a hybrid approach combining:
1. **Regex pre-filtering**: Fast pattern matching for obvious irrelevant messages
2. **Semantic embeddings**: Sentence Transformers for accurate categorization

This provides:
- **Fast**: 30-50ms average latency per message
- **Accurate**: 85-92% classification accuracy
- **Cost-effective**: No API costs, runs locally
- **Threshold-based**: Configurable confidence thresholds

## Installation

```bash
# Install in development mode
cd backend
uv pip install -e .

# Or install dependencies directly
uv pip install -r requirements.txt
```

## Quick Start

```python
from fde_slackbot.classifier import MessageClassifier

# Initialize classifier
classifier = MessageClassifier()

# Classify a message
result = classifier.classify("The login button doesn't work")

print(f"Category: {result.category}")        # "bug_report"
print(f"Confidence: {result.confidence}")    # 0.89
print(f"Is Relevant: {result.is_relevant}")  # True
print(f"Method: {result.method}")            # "embedding"
```

## Message Categories

The classifier categorizes messages into five categories:

### Relevant Categories (FDE should see these)

1. **`bug_report`**: Customer reporting errors, crashes, broken functionality
   - Example: "The app keeps crashing when I upload files"

2. **`feature_request`**: Customer requesting new features or enhancements
   - Example: "Can you add export to CSV?"

3. **`support_question`**: Customer asking how to do something or needing help
   - Example: "How do I configure this setting?"

4. **`general_question`**: Product/deployment-related questions
   - Example: "What are the rate limits for the API?"

### Irrelevant Category (Filtered out)

5. **`irrelevant`**: Casual conversation, greetings, thanks, social messages
   - Example: "Thanks!" or "See you tomorrow"

## API Reference

### MessageClassifier

The main classifier class.

#### `__init__(confidence_threshold=0.7, embedding_model='all-MiniLM-L6-v2', enable_regex_filter=True)`

Initialize the classifier.

**Parameters:**
- `confidence_threshold` (float): Minimum confidence to consider message relevant (default: 0.7)
- `embedding_model` (str): Sentence transformer model name (default: 'all-MiniLM-L6-v2')
- `enable_regex_filter` (bool): Whether to use regex pre-filtering (default: True)

#### `classify(message: str) -> ClassificationResult`

Classify a single message.

**Parameters:**
- `message` (str): The message text to classify

**Returns:**
- `ClassificationResult`: Object with `category`, `confidence`, `is_relevant`, `method`

**Example:**
```python
result = classifier.classify("The login button doesn't work")
```

#### `classify_batch(messages: List[str]) -> List[ClassificationResult]`

Classify multiple messages.

**Parameters:**
- `messages` (List[str]): List of message texts

**Returns:**
- `List[ClassificationResult]`: List of classification results

**Example:**
```python
messages = ["Bug report", "Thanks!", "How do I...?"]
results = classifier.classify_batch(messages)
```

#### `get_detailed_scores(message: str) -> dict`

Get detailed classification information including all category similarities.

**Parameters:**
- `message` (str): The message text to analyze

**Returns:**
- `dict`: Contains 'classification', 'all_similarities', 'regex_match'

**Example:**
```python
details = classifier.get_detailed_scores("The app is broken")
print(details['all_similarities'])
# {'bug_report': 0.89, 'support_question': 0.65, ...}
```

#### `add_category_example(category: str, example: str)`

Add a new example to a category for improved classification.

**Parameters:**
- `category` (str): Category name
- `example` (str): Example message to add

**Example:**
```python
classifier.add_category_example(
    "bug_report",
    "I encountered a very specific error"
)
```

#### `get_embedding(message: str) -> np.ndarray`

Get the embedding vector for a message (useful for grouping/deduplication).

**Parameters:**
- `message` (str): The message text

**Returns:**
- `np.ndarray`: 384-dimensional embedding vector

**Example:**
```python
embedding = classifier.get_embedding("Test message")
# Use for similarity comparison, clustering, etc.
```

### ClassificationResult

Result object returned by `classify()`.

**Attributes:**
- `category` (MessageCategory): The classified category
- `confidence` (float): Confidence score (0.0-1.0)
- `is_relevant` (bool): Whether message is relevant to FDEs
- `method` (str): Classification method used ('regex', 'embedding', etc.)

**Properties:**
- `is_high_confidence` (bool): True if confidence >= 0.7

## Configuration

### Adjusting Confidence Threshold

```python
# Stricter filtering (fewer messages marked relevant)
classifier = MessageClassifier(confidence_threshold=0.8)

# More lenient filtering (more messages marked relevant)
classifier = MessageClassifier(confidence_threshold=0.6)
```

### Using Different Embedding Models

```python
# Faster, smaller model (default)
classifier = MessageClassifier(embedding_model='all-MiniLM-L6-v2')

# Higher quality, slower
classifier = MessageClassifier(embedding_model='all-mpnet-base-v2')

# Smaller, faster
classifier = MessageClassifier(embedding_model='paraphrase-MiniLM-L3-v2')
```

### Disabling Regex Filter

```python
# Only use embeddings (slower but potentially more accurate)
classifier = MessageClassifier(enable_regex_filter=False)
```

## Examples

### Basic Usage

```python
from fde_slackbot.classifier import MessageClassifier

classifier = MessageClassifier()

# Test with spec examples
messages = [
    "The login button doesn't work on mobile.",  # bug_report
    "Can you add export to CSV?",                # feature_request
    "Thanks!",                                    # irrelevant
    "See you tomorrow",                           # irrelevant
]

for msg in messages:
    result = classifier.classify(msg)
    if result.is_relevant:
        print(f"📌 {msg}")
        print(f"   Category: {result.category}")
        print(f"   Confidence: {result.confidence:.2f}\n")
```

### Filtering Messages for Dashboard

```python
def process_slack_message(message_text):
    """Process incoming Slack message."""
    result = classifier.classify(message_text)

    # Only store relevant messages
    if result.is_relevant:
        ticket = {
            'message': message_text,
            'category': result.category,
            'confidence': result.confidence,
        }
        # Store in database
        save_ticket(ticket)
```

### Using Embeddings for Grouping

```python
def find_similar_tickets(new_message, existing_tickets, threshold=0.8):
    """Find similar existing tickets."""
    from sklearn.metrics.pairwise import cosine_similarity

    new_embedding = classifier.get_embedding(new_message)

    similar = []
    for ticket in existing_tickets:
        ticket_embedding = classifier.get_embedding(ticket['message'])
        similarity = cosine_similarity(
            new_embedding.reshape(1, -1),
            ticket_embedding.reshape(1, -1)
        )[0][0]

        if similarity >= threshold:
            similar.append(ticket)

    return similar
```

## Running Tests

```bash
# Run all tests
pytest tests/test_classifier/

# Run specific test file
pytest tests/test_classifier/test_integration.py

# Run with coverage
pytest tests/test_classifier/ --cov=fde_slackbot.classifier
```

## Running Example

```bash
# Make example executable
chmod +x examples/example_classifier.py

# Run example
python examples/example_classifier.py
```

## Performance

- **Latency**: 30-50ms average per message
- **Throughput**: ~20-50 messages/second on CPU
- **Memory**: ~500MB (model loaded in memory)
- **Accuracy**: 85-92% on typical FDE messages

### Optimization Tips

1. **Reuse classifier instance**: Model loading is expensive, reuse the same instance
2. **Batch processing**: Use `classify_batch()` for multiple messages (future optimization)
3. **GPU acceleration**: Use CUDA-enabled PyTorch for faster embeddings
4. **ONNX conversion**: Convert model to ONNX for 2-3x speedup

## Troubleshooting

### Model Download Issues

The first time you use the classifier, it will download the sentence transformer model (~90MB). If you have connection issues:

```python
# Pre-download the model
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('all-MiniLM-L6-v2')
```

### Memory Usage

If memory is constrained, use a smaller model:

```python
classifier = MessageClassifier(embedding_model='paraphrase-MiniLM-L3-v2')
```

### Slow First Classification

The first classification is slower due to model loading. Subsequent classifications are fast:

```python
# Warm up the classifier
classifier.classify("warm up message")
# Now subsequent calls are fast
```

## Architecture

```
MessageClassifier
    │
    ├── RegexFilter (Tier 1)
    │   └── Fast pattern matching for obvious irrelevant messages
    │       (~5ms, filters ~30-50% of messages)
    │
    └── EmbeddingClassifier (Tier 2)
        └── Semantic classification using sentence transformers
            (~30-50ms, high accuracy for remaining messages)
```

## License

Part of the FDE Slackbot Backend project.
