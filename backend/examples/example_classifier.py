#!/usr/bin/env python3
"""
Example usage of the FDE Message Classifier.

This script demonstrates how to use the classifier to categorize
Slack messages for FDE relevance.
"""

from fde_slackbot.classifier import MessageClassifier


def main():
    """Run example classifications."""
    print("FDE Message Classifier - Example Usage\n")
    print("=" * 60)

    # Initialize the classifier
    print("\n1. Initializing classifier...")
    classifier = MessageClassifier()
    print("✅ Classifier initialized successfully!")

    # Test messages from the spec
    test_messages = [
        # Bug reports
        "The login button doesn't work on mobile.",
        "I'm getting a 500 error when I try to save",
        "App crashes when I upload files",
        # Feature requests
        "Can you add export to CSV?",
        "Would be nice to have dark mode",
        "Please support bulk editing",
        # Support questions
        "How do I configure this setting?",
        "Need help with the onboarding process",
        "Can you walk me through the setup?",
        # General questions
        "Where can I find the documentation?",
        "What are the rate limits for the API?",
        "How does billing work?",
        # Irrelevant messages
        "Thanks!",
        "See you tomorrow",
        "lol",
        "👍",
    ]

    # Classify each message
    print("\n2. Classifying messages...\n")
    print("-" * 60)

    for i, message in enumerate(test_messages, 1):
        result = classifier.classify(message)

        # Format output
        relevance_icon = "✅" if result.is_relevant else "❌"
        print(f"\n{i}. Message: \"{message}\"")
        print(f"   {relevance_icon} Relevant: {result.is_relevant}")
        print(f"   📁 Category: {result.category}")
        print(f"   🎯 Confidence: {result.confidence:.2f}")
        print(f"   🔧 Method: {result.method}")

    # Demonstrate batch classification
    print("\n" + "=" * 60)
    print("\n3. Batch Classification Example\n")
    print("-" * 60)

    batch_messages = [
        "The app is completely broken",
        "Can we add a new feature?",
        "Thanks for the help!",
    ]

    results = classifier.classify_batch(batch_messages)

    for msg, result in zip(batch_messages, results):
        print(f"\n'{msg}'")
        print(f"  → {result.category} (confidence: {result.confidence:.2f})")

    # Demonstrate detailed scores
    print("\n" + "=" * 60)
    print("\n4. Detailed Classification Scores\n")
    print("-" * 60)

    test_message = "The login button doesn't work"
    print(f"\nAnalyzing: \"{test_message}\"\n")

    details = classifier.get_detailed_scores(test_message)

    print(f"Final Classification: {details['classification'].category}")
    print(f"Confidence: {details['classification'].confidence:.2f}")
    print(f"\nAll Category Similarities:")
    for category, score in sorted(
        details["all_similarities"].items(), key=lambda x: x[1], reverse=True
    ):
        print(f"  {category:20s}: {score:.3f}")

    # Demonstrate adding custom examples
    print("\n" + "=" * 60)
    print("\n5. Adding Custom Category Examples\n")
    print("-" * 60)

    custom_message = "I need assistance with deployment configuration"
    print(f"\nBefore adding example:")
    result_before = classifier.classify(custom_message)
    print(f"  Category: {result_before.category}")
    print(f"  Confidence: {result_before.confidence:.2f}")

    # Add a similar example to support_question category
    classifier.add_category_example(
        "support_question", "I need help with the deployment configuration"
    )

    print(f"\nAfter adding example:")
    result_after = classifier.classify(custom_message)
    print(f"  Category: {result_after.category}")
    print(f"  Confidence: {result_after.confidence:.2f}")

    print("\n" + "=" * 60)
    print("\n✅ Example completed successfully!")
    print("\nNext steps:")
    print("  - Integrate this classifier into your Slack bot")
    print("  - Use result.is_relevant to filter messages")
    print("  - Use result.category to organize tickets")
    print("  - Use classifier.get_embedding() for grouping/deduplication")


if __name__ == "__main__":
    main()
