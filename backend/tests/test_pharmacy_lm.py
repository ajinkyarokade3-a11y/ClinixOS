import pytest
from app.services.pharmacy_corpus import tokenize, build_vocab, corpus_stats
from app.services.pharmacy_lm import BigramLM, TrigramLM


def test_tokenize():
    assert tokenize("Take Twice Daily!") == ["take", "twice", "daily"]
    assert tokenize("500mg") == ["500mg"]
    assert tokenize("  ") == []


def test_vocab_built():
    tokenized, vocab = build_vocab()
    assert len(tokenized) > 20
    assert "daily" in vocab
    assert "milligrams" in vocab
    assert vocab == sorted(vocab)


def test_bigram_distribution_sums_to_one():
    model = BigramLM()
    dist = model.distribution("take")
    assert abs(sum(dist.values()) - 1.0) < 1e-4


def test_trigram_take_twice_predicts_daily():
    model = TrigramLM()
    preds = model.predict(["take", "twice"], top_k=3)
    assert preds[0]["word"] == "daily"


def test_trigram_five_hundred_predicts_milligrams():
    model = TrigramLM()
    preds = model.predict(["five", "hundred"], top_k=3)
    assert preds[0]["word"] == "milligrams"


def test_bigram_hundred_predicts_milligrams():
    model = BigramLM()
    preds = model.predict(["hundred"], top_k=3)
    assert preds[0]["word"] == "milligrams"


def test_unseen_context_no_crash():
    bigram = BigramLM()
    trigram = TrigramLM()
    assert len(bigram.predict(["xyzzy"], top_k=3)) == 3
    assert len(trigram.predict(["xyzzy", "plugh"], top_k=3)) == 3


def test_trigram_backoff_matches_bigram_for_unseen_context():
    bigram = BigramLM()
    trigram = TrigramLM(bigram)
    assert trigram.prob("xyzzy", "take", "daily") == pytest.approx(bigram.prob("take", "daily"))


def test_reproducibility():
    m1, m2 = TrigramLM(), TrigramLM()
    assert m1.predict(["take", "twice"]) == m2.predict(["take", "twice"])


def test_corpus_stats():
    stats = corpus_stats()
    assert stats["sentences"] > 20
    assert stats["total_tokens"] > stats["vocab_size"]
    assert len(stats["vocabulary"]) == stats["vocab_size"]
