# Expected Fantasy Points Final Output API

## Purpose

This API predicts a player's **next-match fantasy points** from historical form,
role, opportunity, and pressure/confidence features known before the match.
Fantasy points are not out of 10; they use the dataset's fantasy scoring scale.

It is useful to Khel AI as a pre-match ranking signal for player cards, fantasy
shortlists, comparison views, and dashboard explanations. The implementation is
demo-only because `HimanshuKhale/datasets_cricket` is synthetic/faux data.

## Cricket Problem

A player's simple career average hides recency, changing opportunity, role, and
response to pressure. This regression model combines those signals to estimate
one numeric outcome: expected fantasy points in the next match. It does not use
performance from the match being predicted.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Verify the pre-trained `.pkl` is loaded |
| GET | `/model-info` | Return model type, target, features, version, and metrics |
| POST | `/predict` | Predict one row |
| POST | `/predict-batch` | Predict 1-100 rows |
| POST | `/student5/expected-fantasy-final` | Existing rich API 15 workflow |
| GET | `/docs` | Swagger/OpenAPI documentation |

The evaluator-facing deployment app is `api.main:app`. The existing root
`main.py` preserves the richer API 15 workflow for MATCHIQ compatibility.

## Input Schema

`POST /predict` requires exactly the 22 features listed in
`model_training/feature_columns.json`.

| Feature group | Fields |
|---|---|
| Form | `career_avg_before_match`, `recent_2_avg_before_match`, `recent_3_avg_before_match`, `recent_5_avg_before_match` |
| History | `prior_match_count`, `days_since_last_match` |
| Opportunity | `historical_balls_faced_avg_before_match`, `historical_overs_bowled_avg_before_match`, `historical_runs_avg_before_match`, `historical_wickets_avg_before_match` |
| Bayesian form | `bayesian_posterior_before_match`, `adjusted_posterior_before_match` |
| Role flags | `is_batter`, `is_bowler`, `is_allrounder`, `is_wicketkeeper` |
| Pressure/confidence | `historical_avg_pressure_faced`, `historical_avg_confidence`, `historical_confidence_slope`, `historical_high_pressure_control`, `historical_pressure_resilience`, `historical_dot_recovery_rate` |

All role flags are 0 or 1. Pressure/confidence rates are 0-1, while confidence
slope is -1 to 1.

## Output Schema

| Field | Meaning |
|---|---|
| `prediction` | Non-negative fantasy-points prediction |
| `prediction_label` | Low, Moderate, or Strong Fantasy Potential |
| `model_name`, `model_version` | Artifact identity |
| `features_used` | Exact ordered fields used by the model |
| `confidence_note` | Honest test-error context; not a probability |
| `explanation` | Simple cricket-language interpretation |
| `model_mode` | Always `demo_only` for this package |

## Sample Request

```bash
curl -X POST "http://127.0.0.1:8000/predict" \
  -H "Content-Type: application/json" \
  --data @model_training/sample_input.json
```

```json
{
  "career_avg_before_match": 32.25,
  "recent_2_avg_before_match": 4.0,
  "recent_3_avg_before_match": 34.6667,
  "recent_5_avg_before_match": 32.25,
  "prior_match_count": 4,
  "days_since_last_match": 2,
  "historical_balls_faced_avg_before_match": 5.75,
  "historical_overs_bowled_avg_before_match": 3,
  "historical_runs_avg_before_match": 9,
  "historical_wickets_avg_before_match": 0.75,
  "bayesian_posterior_before_match": 42.875,
  "adjusted_posterior_before_match": 38.586,
  "is_batter": 0,
  "is_bowler": 1,
  "is_allrounder": 0,
  "is_wicketkeeper": 0,
  "historical_avg_pressure_faced": 0.414,
  "historical_avg_confidence": 0.429,
  "historical_confidence_slope": 0.003,
  "historical_high_pressure_control": 0,
  "historical_pressure_resilience": 0.429,
  "historical_dot_recovery_rate": 1
}
```

## Sample Response

The checked response is stored in `model_training/sample_response.json`.

```json
{
  "prediction": 47.35,
  "prediction_label": "Moderate Fantasy Potential",
  "model_name": "linear_regression",
  "model_version": "2.0.0",
  "features_used": [
    "career_avg_before_match",
    "recent_2_avg_before_match",
    "recent_3_avg_before_match",
    "recent_5_avg_before_match",
    "prior_match_count",
    "days_since_last_match",
    "historical_balls_faced_avg_before_match",
    "historical_overs_bowled_avg_before_match",
    "historical_runs_avg_before_match",
    "historical_wickets_avg_before_match",
    "bayesian_posterior_before_match",
    "adjusted_posterior_before_match",
    "is_batter",
    "is_bowler",
    "is_allrounder",
    "is_wicketkeeper",
    "historical_avg_pressure_faced",
    "historical_avg_confidence",
    "historical_confidence_slope",
    "historical_high_pressure_control",
    "historical_pressure_resilience",
    "historical_dot_recovery_rate"
  ],
  "confidence_note": "No probability confidence is reported. Test MAE is 26.577 fantasy points and test R2 is -0.037 on a 33-row synthetic holdout.",
  "explanation": "The model predicts 47.35 fantasy points. It sees that recent form is at or below the career level, historical pressure resilience is limited, and the player's profile mainly reflects bowling contribution. This is a synthetic-data demonstration, so the value should support a dashboard workflow rather than a real selection decision.",
  "model_mode": "demo_only"
}
```

## Model Card and Metrics

The model is a `StandardScaler` plus `LinearRegression`, trained offline and
saved as `model_training/model.pkl`. The chronological split contains 154 train,
33 validation, and 33 test rows.

| Model | Test MAE | Test RMSE | Test R2 |
|---|---:|---:|---:|
| Career-average baseline | 29.065 | 37.407 | -0.291 |
| Linear Regression | 26.577 | 33.530 | -0.037 |

Lower MAE/RMSE is better. Linear Regression improves MAE by 2.488 points over
the baseline. Negative R2 shows weak generalization; the model is not suitable
for real predictive claims. Full details are in `model_training/metrics.json`
and `model_training/README.md`.

## Khel AI Integration

1. Khel AI computes the 22 historical features after a match or before a future fixture.
2. The backend calls `/predict` for one player or `/predict-batch` for a squad.
3. The response is cached by player, fixture, feature timestamp, and model version.
4. The dashboard displays predicted points with the demo warning and historical pressure context.
5. On timeout or validation failure, Khel AI falls back to the career-average baseline.
6. A future real-data artifact can keep the same schema and replace only the versioned model package.

The API should be called from the Khel AI backend, not directly from an
untrusted browser, so feature generation and model versioning stay controlled.

## Limitations

- The dataset is synthetic/faux and very small.
- Only 220 rows have prior history; test size is 33.
- Negative test R2 indicates poor real-world reliability.
- Features omit confirmed playing XI, venue/weather, injuries, toss, batting order changes, and opposition line-up strength.
- Pressure/confidence values are engineered proxies, not measured psychology.
- Predictions inherit the fantasy scoring rules used to create the target.
- This is not advice for betting or real fantasy-team selection.

## Run and Reproduce

```bash
pip install -r api/requirements.txt
python model_training/train_model.py
python -m unittest -v
uvicorn api.main:app --reload
```

Training is separate from serving. API requests load the cached `.pkl` and call
`predict`; they never retrain the model.

## Submission URLs

- Hosted API URL: **Pending deployment**
- Swagger URL: **Pending deployment**
- GitHub repository URL: **Pending publication**

Do not submit invented URLs. Deployment requires pushing this folder to a
GitHub repository and connecting that repository to the included `render.yaml`.
