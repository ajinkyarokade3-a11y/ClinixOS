"""Micro (bigram) and Small (trigram) statistical language models.

Bigram (µLM):  P(w2 | w1)      — one preceding pharmaceutical term.
Trigram (SLM): P(w3 | w1, w2)  — two preceding terms, with backoff to the
               bigram distribution and then to the unigram distribution when
               a context was never observed. Laplace (add-one) smoothing is
               applied so unseen events keep a small non-zero probability.
"""
from collections import Counter
from app.services.pharmacy_corpus import build_vocab


class BigramLM:
    name = "micro-bigram"

    def __init__(self):
        tokenized, vocab = build_vocab()
        self.vocab = vocab
        self.vocab_size = len(vocab)
        self.unigram_counts: Counter[str] = Counter()
        self.bigram_counts: Counter[tuple[str, str]] = Counter()
        self.context_counts: Counter[str] = Counter()
        for sent in tokenized:
            seq = ["<s>", *sent, "</s>"]
            for tok in seq:
                self.unigram_counts[tok] += 1
            for a, b in zip(seq, seq[1:]):
                self.bigram_counts[(a, b)] += 1
                self.context_counts[a] += 1
        self.total_tokens = sum(self.unigram_counts.values())

    def prob(self, prev: str, word: str) -> float:
        V = self.vocab_size + 2  # + <s>, </s>
        return (self.bigram_counts.get((prev, word), 0) + 1) / (self.context_counts.get(prev, 0) + V)

    def distribution(self, prev: str) -> dict[str, float]:
        candidates = [*self.vocab, "</s>"]
        probs = {w: self.prob(prev, w) for w in candidates}
        total = sum(probs.values())
        return {w: round(p / total, 6) for w, p in probs.items()}

    def predict(self, context: list[str], top_k: int = 5) -> list[dict]:
        prev = context[-1] if context else "<s>"
        dist = self.distribution(prev)
        ranked = sorted(dist.items(), key=lambda kv: kv[1], reverse=True)[:top_k]
        return [{"word": w, "probability": p} for w, p in ranked]


class TrigramLM:
    name = "small-trigram"

    def __init__(self, bigram: BigramLM | None = None):
        self.bigram = bigram or BigramLM()
        tokenized, _ = build_vocab()
        self.trigram_counts: Counter[tuple[str, str, str]] = Counter()
        self.context_counts: Counter[tuple[str, str]] = Counter()
        for sent in tokenized:
            seq = ["<s>", "<s>", *sent, "</s>"]
            for a, b, c in zip(seq, seq[1:], seq[2:]):
                self.trigram_counts[(a, b, c)] += 1
                self.context_counts[(a, b)] += 1
        self.vocab_size = self.bigram.vocab_size

    def prob(self, w1: str, w2: str, word: str) -> float:
        V = self.vocab_size + 2
        trigram_hit = self.trigram_counts.get((w1, w2, word), 0)
        ctx = self.context_counts.get((w1, w2), 0)
        if ctx > 0:
            return (trigram_hit + 1) / (ctx + V)
        # Backoff: unseen two-word context falls back to the bigram model.
        return self.bigram.prob(w2, word)

    def distribution(self, w1: str, w2: str) -> dict[str, float]:
        candidates = [*self.bigram.vocab, "</s>"]
        probs = {w: self.prob(w1, w2, w) for w in candidates}
        total = sum(probs.values())
        return {w: round(p / total, 6) for w, p in probs.items()}

    def predict(self, context: list[str], top_k: int = 5) -> list[dict]:
        if len(context) >= 2:
            w1, w2 = context[-2], context[-1]
        elif len(context) == 1:
            w1, w2 = "<s>", context[-1]
        else:
            w1, w2 = "<s>", "<s>"
        dist = self.distribution(w1, w2)
        ranked = sorted(dist.items(), key=lambda kv: kv[1], reverse=True)[:top_k]
        return [{"word": w, "probability": p} for w, p in ranked]


_bigram_model: BigramLM | None = None
_trigram_model: TrigramLM | None = None


def get_bigram() -> BigramLM:
    global _bigram_model
    if _bigram_model is None:
        _bigram_model = BigramLM()
    return _bigram_model


def get_trigram() -> TrigramLM:
    global _trigram_model
    if _trigram_model is None:
        _trigram_model = TrigramLM(get_bigram())
    return _trigram_model
