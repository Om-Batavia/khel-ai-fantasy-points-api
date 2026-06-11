from fastapi import FastAPI, HTTPException

from schemas import (
    BatchPredictionRequest,
    BatchPredictionResponse,
    ExpectedFantasyFinalRequest,
    ExpectedFantasyFinalResponse,
    FantasyPointFeatures,
    FantasyPredictionResponse,
)
from services import calculate_expected_fantasy_final, load_api_model_bundle, predict_fantasy_points


app = FastAPI(
    title="Student 5 - Expected Fantasy Points Final Output API",
    description="Returns expected fantasy points, selection label, component breakdown, and explanation.",
    version="2.0.0",
)


@app.get("/")
def home():
    return {
        "api_name": "Expected Fantasy Points Final Output API",
        "student": "Student 5",
        "endpoint": "/student5/expected-fantasy-final",
        "prediction_endpoint": "/predict",
        "batch_prediction_endpoint": "/predict/batch",
        "health_endpoint": "/health",
        "swagger_docs": "/docs",
    }


@app.get("/health")
def health():
    try:
        bundle = load_api_model_bundle()
        return {
            "status": "healthy",
            "model_loaded": True,
            "model_file": bundle["model_path"].name,
            "feature_count": len(bundle["feature_columns"]),
            "model_mode": bundle["metrics"]["model_mode"],
        }
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/predict", response_model=FantasyPredictionResponse)
def predict(payload: FantasyPointFeatures):
    try:
        return predict_fantasy_points(payload)
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/predict/batch", response_model=BatchPredictionResponse)
def predict_batch(payload: BatchPredictionRequest):
    predictions = [predict_fantasy_points(row) for row in payload.rows]
    return BatchPredictionResponse(predictions=predictions, count=len(predictions))


@app.post("/student5/expected-fantasy-final", response_model=ExpectedFantasyFinalResponse)
def expected_fantasy_final(payload: ExpectedFantasyFinalRequest):
    try:
        return calculate_expected_fantasy_final(payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
