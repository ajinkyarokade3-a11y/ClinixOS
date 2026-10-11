"""Domain-specific pharmacy corpus + preprocessing.

Covers drug dispensations, capsule counts, dosage frequencies and refill
instructions for hospital pharmacy / outpatient dispensary workflows.
All sentences are domain reference data written for this module.
"""
import re

RAW_SENTENCES = [
    "take twice daily after meals",
    "take twice daily before breakfast",
    "take once daily in the morning",
    "take once daily at bedtime",
    "take three times daily with water",
    "take one capsule twice daily",
    "take two capsules twice daily",
    "take one tablet once daily",
    "take two tablets three times daily",
    "dispense thirty capsules for thirty days",
    "dispense sixty tablets for thirty days",
    "dispense ninety capsules for ninety days",
    "refill after thirty days",
    "refill after ninety days",
    "no refill without doctor approval",
    "take five hundred milligrams twice daily",
    "take five hundred milligrams once daily",
    "take two hundred fifty milligrams three times daily",
    "take one thousand milligrams once daily",
    "shake well before use twice daily",
    "apply ointment twice daily to affected area",
    "take on empty stomach once daily",
    "take with food twice daily",
    "complete the full course even if feeling better",
    "store in a cool dry place away from sunlight",
    "keep out of reach of children",
    "return unused tablets to the pharmacy counter",
    "collect refill from outpatient dispensary after seven days",
    "verify capsule count before leaving the counter",
    "take insulin injection twice daily before meals",
    "take blood pressure tablet once daily in the morning",
]

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def tokenize(text: str) -> list[str]:
    """Lowercase alphanumeric tokenization used by both models."""
    return _TOKEN_RE.findall(text.lower())


def build_vocab(sentences: list[str] | None = None) -> tuple[list[list[str]], list[str]]:
    sentences = sentences or RAW_SENTENCES
    tokenized = [tokenize(s) for s in sentences]
    vocab = sorted({tok for sent in tokenized for tok in sent})
    return tokenized, vocab


def corpus_stats() -> dict:
    tokenized, vocab = build_vocab()
    total_tokens = sum(len(s) for s in tokenized)
    return {
        "sentences": len(tokenized),
        "total_tokens": total_tokens,
        "vocab_size": len(vocab),
        "vocabulary": vocab,
        "sample_sentences": RAW_SENTENCES[:5],
    }
