import numpy as np
from app.services.maintenance_nn import NumpyMLP
from app.services.maintenance_data import generate_training_data


def train_model(epochs: int = 200, seed: int = 42) -> tuple[NumpyMLP, dict]:
    X_list, y_list = generate_training_data(count=500, seed=seed)
    X = np.array(X_list)
    y = np.array(y_list).reshape(-1, 1)

    split = int(0.8 * len(X))
    X_train, X_val = X[:split], X[split:]
    y_train, y_val = y[:split], y[split:]

    model = NumpyMLP(input_size=4, hidden_size=16, output_size=1, seed=seed)
    history = model.train(X_train, y_train, epochs=epochs, lr=0.05)

    val_pred = model.predict(X_val)
    val_loss = float(np.mean((val_pred - y_val) ** 2))

    train_pred = model.predict(X_train)
    mae = float(np.mean(np.abs(train_pred - y_train))) * 100
    rmse = float(np.sqrt(np.mean((train_pred - y_train) ** 2))) * 100
    ss_res = float(np.sum((y_train - train_pred) ** 2))
    ss_tot = float(np.sum((y_train - np.mean(y_train)) ** 2))
    r2 = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0.0

    metrics = {
        "epochs": epochs,
        "final_loss": history[-1]["loss"] if history else 0,
        "val_loss": val_loss,
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "r2_score": round(r2, 4),
        "training_history": history,
    }

    return model, metrics


def evaluate_model(model: NumpyMLP, X_test: np.ndarray, y_test: np.ndarray) -> dict:
    predictions = model.predict(X_test)
    mae = float(np.mean(np.abs(predictions - y_test))) * 100
    rmse = float(np.sqrt(np.mean((predictions - y_test) ** 2))) * 100
    mape = float(np.mean(np.abs((y_test - predictions) / (y_test + 1e-8)))) * 100
    ss_res = float(np.sum((y_test - predictions) ** 2))
    ss_tot = float(np.sum((y_test - np.mean(y_test)) ** 2))
    r2 = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0.0

    pred_list = []
    for i in range(min(20, len(y_test))):
        pred_list.append({
            "actual": round(float(y_test[i][0]) * 100, 2),
            "predicted": round(float(predictions[i][0]) * 100, 2),
            "error": round(abs(float(y_test[i][0]) - float(predictions[i][0])) * 100, 2),
        })

    return {
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "r2_score": round(r2, 4),
        "mape": round(mape, 4),
        "predictions": pred_list,
    }
