import json
from functools import lru_cache
from pathlib import Path

from joblib import load

from .schemas import PredictionInput, PredictionResponse


MODEL_DIR = Path(__file__).resolve().parent / "model"
MODEL_PATH = MODEL_DIR / "model.pkl"
FEATURES_PATH = MODEL_DIR / "feature_columns.json"
METRICS_PATH = MODEL_DIR / "metrics.json"


@lru_cache(maxsize=1)
def load_model_bundle():
    required = (MODEL_PATH, FEATURES_PATH, METRICS_PATH)
    missing = [path.name for path in required if not path.exists()]
    if missing:
        raise RuntimeError(f"Missing required model artifacts: {', '.join(missing)}")

    feature_payload = json.loads(FEATURES_PATH.read_text(encoding="utf-8"))
    metrics = json.loads(METRICS_PATH.read_text(encoding="utf-8"))
    feature_columns = feature_payload["feature_columns"]
    schema_columns = list(PredictionInput.model_fields)
    if feature_columns != schema_columns:
        raise RuntimeError("API schema does not match feature_columns.json.")

    return {
        "model": load(MODEL_PATH),
        "feature_columns": feature_columns,
        "feature_metadata": feature_payload,
        "metrics": metrics,
    }


def prediction_label(value):
    if value >= 60:
        return "Strong Fantasy Potential"
    if value >= 35:
        return "Moderate Fantasy Potential"
    return "Low Fantasy Potential"


def cricket_explanation(features, prediction):
    form_direction = (
        "recent form is above the career level"
        if features.recent_5_avg_before_match > features.career_avg_before_match
        else "recent form is at or below the career level"
    )
    pressure_direction = (
        "historical pressure resilience is relatively strong"
        if features.historical_pressure_resilience >= 0.6
        else "historical pressure resilience is limited"
    )
    role = "all-round contribution" if features.is_allrounder else (
        "bowling contribution" if features.is_bowler else "batting contribution"
    )
    return (
        f"In cricket terms, the model predicts {prediction:.2f} fantasy points. It sees that {form_direction}, "
        f"{pressure_direction}, and the player's profile mainly reflects {role}. "
        "This is a synthetic-data demonstration, so the value should support a dashboard workflow "
        "rather than a real selection decision."
    )


def predict_one(features):
    bundle = load_model_bundle()
    values = features.model_dump()
    ordered = [[values[column] for column in bundle["feature_columns"]]]
    prediction = max(0.0, float(bundle["model"].predict(ordered)[0]))
    metrics = bundle["metrics"]
    return PredictionResponse(
        prediction=round(prediction, 2),
        prediction_label=prediction_label(prediction),
        model_name=metrics["model_name"],
        model_version=metrics["model_version"],
        features_used=bundle["feature_columns"],
        confidence_note=(
            "No probability confidence is reported. Test MAE is 26.577 fantasy points and "
            "test R2 is -0.037 on a 33-row synthetic holdout."
        ),
        explanation=cricket_explanation(features, prediction),
        model_mode=metrics["model_mode"],
    )
