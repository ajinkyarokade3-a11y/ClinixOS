import numpy as np
import pytest
from app.services.maintenance_nn import NumpyMLP, normalize_features, denormalize_risk


def test_mlp_forward_shape():
    model = NumpyMLP(seed=42)
    X = np.random.rand(5, 4)
    output, cache = model.forward(X)
    assert output.shape == (5, 1)


def test_mlp_training_reduces_loss():
    X = np.random.rand(100, 4)
    y = np.random.rand(100, 1)
    model = NumpyMLP(seed=42)
    history = model.train(X, y, epochs=50, lr=0.05)
    assert len(history) > 0
    assert history[-1]["loss"] <= history[0]["loss"]


def test_normalize_features():
    features = normalize_features(5000, 50, 40, 10)
    assert features.shape == (1, 4)
    assert 0 <= features[0][0] <= 1
    assert 0 <= features[0][1] <= 1


def test_denormalize_risk():
    assert denormalize_risk(0.0) == 0.0
    assert denormalize_risk(1.0) == 100.0
    assert denormalize_risk(0.5) == 50.0


def test_mlp_reproducibility():
    X = np.random.rand(50, 4)
    y = np.random.rand(50, 1)
    m1 = NumpyMLP(seed=42)
    m2 = NumpyMLP(seed=42)
    m1.train(X, y, epochs=10, lr=0.05)
    m2.train(X, y, epochs=10, lr=0.05)
    p1 = m1.predict(X)
    p2 = m2.predict(X)
    assert np.allclose(p1, p2)
