"""
LLM-based message classification using OpenAI GPT-4o-mini.

Uses structured outputs to classify messages into predefined categories
with high accuracy and semantic understanding.
"""

import os
from typing import Optional
from openai import OpenAI
from pydantic import BaseModel, Field

from fde_slackbot.classifier.models import MessageCategory, ClassificationResult


class LLMClassificationResponse(BaseModel):
    """Structured response from OpenAI for message classification."""

    category: MessageCategory = Field(
        description="The classified category of the message"
    )
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Confidence score between 0.0 and 1.0"
    )
    reasoning: str = Field(
        description="Brief explanation of why this category was chosen"
    )


class LLMClassifier:
    """
    LLM-based classifier using OpenAI GPT-4o-mini with structured outputs.

    Provides high-quality semantic classification with detailed reasoning.
    More expensive than embedding-based classification (~$0.15 per 1M tokens)
    but handles edge cases and ambiguous messages better.
    """

    SYSTEM_PROMPT = """You are a classifier for a Slack channel monitoring system. Your job is to categorize messages into one of the following types:

**bug_report**: Message describes a technical problem, error, or unexpected behavior
- Examples: "Login button doesn't work", "Getting error 500", "App crashes when I click save"

**feature_request**: Message suggests a new capability or improvement
- Examples: "Can we add dark mode?", "Would be nice to export to PDF", "We should support SSO"

**support_question**: Message asks for help with using existing functionality
- Examples: "How do I reset my password?", "Where can I find the settings?", "What's the keyboard shortcut?"

**general_question**: Other questions that don't fit support or feature requests
- Examples: "Is anyone available?", "What's the status of project X?", "When is the deadline?"

**irrelevant**: Casual conversation, greetings, thanks, acknowledgments, off-topic
- Examples: "Thanks!", "Good morning!", "lol", "ok", "👍", "Anyone up for lunch?"

Classify the message accurately and provide a confidence score."""

    def __init__(
        self,
        model: str = "gpt-4o-mini",
        api_key: Optional[str] = None,
    ):
        """
        Initialize the LLM classifier.

        Args:
            model: OpenAI model name (default: gpt-4o-mini)
            api_key: OpenAI API key (if None, reads from OPENAI_API_KEY env var)
        """
        self.model = model
        self.client = OpenAI(api_key=api_key or os.getenv("OPENAI_API_KEY"))

        if not self.client.api_key:
            raise ValueError(
                "OpenAI API key not found. Set OPENAI_API_KEY environment variable "
                "or pass api_key parameter."
            )

    def classify(self, message_text: str) -> ClassificationResult:
        """
        Classify a message using OpenAI GPT-4o-mini with structured outputs.

        Args:
            message_text: The message text to classify

        Returns:
            ClassificationResult with category, confidence, and metadata

        Raises:
            Exception: If OpenAI API call fails
        """
        if not message_text or not message_text.strip():
            return ClassificationResult(
                category="irrelevant",
                confidence=1.0,
                is_relevant=False,
                method="embedding",  # Use same method name for consistency
            )

        try:
            # Call OpenAI with structured output
            completion = self.client.beta.chat.completions.parse(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {"role": "user", "content": f"Classify this message:\n\n{message_text}"}
                ],
                response_format=LLMClassificationResponse,
                temperature=0.0,  # Deterministic for consistent classification
            )

            # Parse structured response
            response = completion.choices[0].message.parsed

            # Convert to ClassificationResult
            is_relevant = response.category != "irrelevant"

            return ClassificationResult(
                category=response.category,
                confidence=response.confidence,
                is_relevant=is_relevant,
                method="embedding",  # Use same method name for backward compatibility
            )

        except Exception as e:
            # Log error and fallback to irrelevant with low confidence
            print(f"LLM classification error: {e}")
            return ClassificationResult(
                category="irrelevant",
                confidence=0.0,
                is_relevant=False,
                method="embedding",
            )

    def classify_batch(self, messages: list[str]) -> list[ClassificationResult]:
        """
        Classify multiple messages.

        Note: This makes sequential API calls. For high-volume use cases,
        consider implementing async batch processing.

        Args:
            messages: List of message texts to classify

        Returns:
            List of ClassificationResults
        """
        return [self.classify(msg) for msg in messages]


def classify_with_llm(
    message_text: str,
    model: str = "gpt-4o-mini",
    api_key: Optional[str] = None,
) -> str:
    """
    Convenience function to classify a single message and return just the category.

    Args:
        message_text: The message text to classify
        model: OpenAI model name
        api_key: OpenAI API key (optional)

    Returns:
        Category string: bug_report, feature_request, support_question,
                        general_question, or irrelevant
    """
    classifier = LLMClassifier(model=model, api_key=api_key)
    result = classifier.classify(message_text)
    return result.category
