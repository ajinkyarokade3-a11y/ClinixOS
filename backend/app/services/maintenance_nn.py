import numpy as np


class NumpyMLP:
    def __init__(self, input_size: int = 4, hidden_size: int = 16, output_size: int = 1, seed: int = 42):
        rng = np.random.RandomState(seed)
        self.W1 = rng.randn(input_size, hidden_size) * 0.5
        self.b1 = np.zeros((1, hidden_size))
        self.W2 = rng.randn(hidden_size, hidden_size) * 0.5
        self.b2 = np.zeros((1, hidden_size))
        self.W3 = rng.randn(hidden_size, output_size) * 0.5
        self.b3 = np.zeros((1, output_size))
        self.history: list[dict[str, float]] = []

    def _relu(self, x: np.ndarray) -> np.ndarray:
        return np.maximum(0, x)

    def _relu_deriv(self, x: np.ndarray) -> np.ndarray:
        return (x > 0).astype(float)

    def forward(self, X: np.ndarray) -> tuple[np.ndarray, dict]:
        z1 = X @ self.W1 + self.b1
        a1 = self._relu(z1)
        z2 = a1 @ self.W2 + self.b2
        a2 = self._relu(z2)
        z3 = a2 @ self.W3 + self.b3
        output = 1 / (1 + np.exp(-z3))
        cache = {"X": X, "z1": z1, "a1": a1, "z2": z2, "a2": a2, "z3": z3, "output": output}
        return output, cache

    def backward(self, cache: dict, y_true: np.ndarray, lr: float = 0.01) -> None:
        m = y_true.shape[0]
        output = cache["output"]
        dz3 = output - y_true
        dW3 = (cache["a2"].T @ dz3) / m
        db3 = np.sum(dz3, axis=0, keepdims=True) / m

        da2 = dz3 @ self.W3.T
        dz2 = da2 * self._relu_deriv(cache["z2"])
        dW2 = (cache["a1"].T @ dz2) / m
        db2 = np.sum(dz2, axis=0, keepdims=True) / m

        da1 = dz2 @ self.W2.T
        dz1 = da1 * self._relu_deriv(cache["z1"])
        dW1 = (cache["X"].T @ dz1) / m
        db1 = np.sum(dz1, axis=0, keepdims=True) / m

        self.W3 -= lr * dW3
        self.b3 -= lr * db3
        self.W2 -= lr * dW2
        self.b2 -= lr * db2
        self.W1 -= lr * dW1
        self.b1 -= lr * db1

    def train(self, X: np.ndarray, y: np.ndarray, epochs: int = 200,
              lr: float = 0.01, batch_size: int = 32, seed: int = 42) -> list[dict[str, float]]:
        self.history = []
        n = X.shape[0]
        rng = np.random.RandomState(seed)
        for epoch in range(epochs):
            indices = rng.permutation(n)
            X_shuffled = X[indices]
            y_shuffled = y[indices]

            for i in range(0, n, batch_size):
                X_batch = X_shuffled[i:i + batch_size]
                y_batch = y_shuffled[i:i + batch_size]
                _, cache = self.forward(X_batch)
                self.backward(cache, y_batch, lr)

            if epoch % 10 == 0 or epoch == epochs - 1:
                pred, _ = self.forward(X)
                loss = float(np.mean((pred - y) ** 2))
                self.history.append({"epoch": epoch, "loss": loss})

        return self.history

    def predict(self, X: np.ndarray) -> np.ndarray:
        output, _ = self.forward(X)
        return output


def normalize_features(hours: float, stress: float,
                       temperature: float | None, vibration: float | None) -> np.ndarray:
    h = min(hours / 10000.0, 1.0)
    s = stress / 100.0
    t = (temperature or 25.0) / 100.0
    v = (vibration or 0.0) / 50.0
    return np.array([[h, s, t, v]])


def denormalize_risk(pred: float) -> float:
    return min(max(pred * 100.0, 0.0), 100.0)
