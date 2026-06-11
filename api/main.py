from fastapi import FastAPI, HTTPException

from .model_loader import load_model_bundle, predict_one
from .schemas import (
    BatchPredictionInput,
    BatchPredictionResponse,
    PredictionInput,
    PredictionResponse,
)


app = FastAPI(
    title="Khel AI Pressure-Enriched Fantasy Points API",
    description=(
        "Predicts next-match fantasy points from leakage-safe historical form, role, "
        "opportunity, pressure, and confidence features."
    ),
    version="2.1.0",
)


@app.get("/")
def root():
    return {
        "api_name": "Khel AI Pressure-Enriched Fantasy Points API",
        "student_name": "Student 5",
        "description": "Demo-only next-match fantasy-points prediction from pre-match historical features.",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    try:
        bundle = load_model_bundle()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {
        "status": "healthy",
        "model_loaded": True,
        "model_mode": bundle["metrics"]["model_mode"],
        "feature_count": len(bundle["feature_columns"]),
    }


@app.get("/model-info")
def model_info():
    try:
        bundle = load_model_bundle()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    metrics = bundle["metrics"]
    return {
        "model_type": "StandardScaler + LinearRegression",
        "model_name": metrics["model_name"],
        "model_version": metrics["model_version"],
        "target_variable": "fantasy_points",
        "feature_columns": bundle["feature_columns"],
        "model_mode": metrics["model_mode"],
        "source_dataset": metrics["source_dataset"],
        "split_strategy": metrics["split_strategy"],
        "metrics": {
            "test": metrics["linear_regression"]["test"],
            "career_average_baseline_test": metrics["career_average_baseline"]["test"],
        },
        "warning": metrics["warning"],
    }


@app.post("/predict", response_model=PredictionResponse)
def predict(payload: PredictionInput):
    try:
        return predict_one(payload)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/predict-batch", response_model=BatchPredictionResponse)
def predict_batch(payload: BatchPredictionInput):
    predictions = [predict_one(row) for row in payload.rows]
    return BatchPredictionResponse(predictions=predictions, count=len(predictions))


@app.post("/predict/batch", response_model=BatchPredictionResponse, include_in_schema=False)
def predict_batch_alias(payload: BatchPredictionInput):
    return predict_batch(payload)
