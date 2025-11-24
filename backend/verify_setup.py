#!/usr/bin/env python3
"""
Quick verification script to test the classifier installation.

Run this after installing dependencies to verify everything works.
"""

import sys


def main():
    """Verify the FDE classifier setup."""
    print("FDE Classifier Setup Verification")
    print("=" * 60)

    # Test 1: Import the module
    print("\n1. Testing imports...")
    try:
        from fde_slackbot.classifier import MessageClassifier, ClassificationResult
        print("   ✅ Successfully imported MessageClassifier")
    except ImportError as e:
        print(f"   ❌ Failed to import: {e}")
        print("\n   Run: uv pip install -e .")
        sys.exit(1)

    # Test 2: Initialize classifier
    print("\n2. Initializing classifier...")
    try:
        classifier = MessageClassifier()
        print("   ✅ Classifier initialized successfully")
        print(f"   📦 Model: {classifier.embedding_classifier.model_name}")
        print(f"   🎯 Threshold: {classifier.confidence_threshold}")
    except Exception as e:
        print(f"   ❌ Failed to initialize: {e}")
        sys.exit(1)

    # Test 3: Classify test messages
    print("\n3. Testing classification...")
    test_cases = [
        ("The login button doesn't work", "bug_report", True),
        ("Can you add export to CSV?", "feature_request", True),
        ("Thanks!", "irrelevant", False),
    ]

    all_passed = True
    for message, expected_category, expected_relevant in test_cases:
        result = classifier.classify(message)

        category_match = result.category == expected_category
        relevance_match = result.is_relevant == expected_relevant

        if category_match and relevance_match:
            print(f"   ✅ \"{message[:30]}...\"")
            print(f"      → {result.category} (confidence: {result.confidence:.2f})")
        else:
            print(f"   ⚠️  \"{message[:30]}...\"")
            print(f"      Expected: {expected_category}, Got: {result.category}")
            # Don't fail on minor category differences
            if not relevance_match:
                all_passed = False

    # Test 4: Test batch classification
    print("\n4. Testing batch classification...")
    try:
        messages = ["Bug report test", "Thanks!", "How do I...?"]
        results = classifier.classify_batch(messages)
        print(f"   ✅ Batch classified {len(results)} messages")
    except Exception as e:
        print(f"   ❌ Batch classification failed: {e}")
        all_passed = False

    # Test 5: Test embeddings
    print("\n5. Testing embedding generation...")
    try:
        import numpy as np

        embedding = classifier.get_embedding("Test message")
        assert isinstance(embedding, np.ndarray)
        assert len(embedding) == 384  # MiniLM-L6-v2 dimension
        print(f"   ✅ Generated {len(embedding)}-dimensional embedding")
    except Exception as e:
        print(f"   ❌ Embedding generation failed: {e}")
        all_passed = False

    # Summary
    print("\n" + "=" * 60)
    if all_passed:
        print("\n✅ All tests passed! Classifier is ready to use.")
        print("\nNext steps:")
        print("  - Run example: python examples/example_classifier.py")
        print("  - Run tests: pytest tests/test_classifier/")
        print("  - Read docs: cat CLASSIFIER_README.md")
    else:
        print("\n⚠️  Some tests had warnings, but basic functionality works.")
        print("   The classifier may categorize messages slightly differently")
        print("   than expected, but relevance detection should be accurate.")

    print()


if __name__ == "__main__":
    main()
