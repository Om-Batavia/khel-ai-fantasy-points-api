# Khel AI Pressure-Enriched Fantasy Points API

## 1. API Name

**Khel AI Pressure-Enriched Fantasy Points API**

## 2. Student Name

**Student 5: Om-Batavia**

## 3. API Purpose

The API predicts how many fantasy points a cricket player may score in their
next match. It uses historical information that is available before the match,
including form, playing role, batting and bowling opportunity, and engineered
pressure/confidence indicators.

Fantasy points are not a score out of 10. They use the fantasy scoring scale
from the dataset.

## 4. Cricket Problem Being Solved

Selecting players from career average alone is unreliable. A career average can
hide recent improvement, loss of form, reduced batting time, fewer bowling
overs, role changes, and poor performance under pressure.

This API converts that problem into supervised regression:

- **Input:** 22 leakage-safe historical features.
- **Target:** fantasy points in the player's next chronological match.
- **Output:** a numeric fantasy-points estimate and an interpretation band.

Current-match runs, wickets, strike rate, economy, catches, run-outs, stumpings,
result, and fantasy points are excluded. Using them would reveal the outcome the
model is supposed to predict.

## 5. Why This API Is Useful for Khel AI

Khel AI can use the prediction as an explainable pre-match player-ranking
signal. It adds more context than a raw career average because it combines:

- recent and long-term form;
- historical batting and bowling opportunity;
- player role;
- Bayesian-smoothed performance;
- historical pressure resilience, control, and recovery.

The API can support fantasy shortlists, player comparisons, squad-level batch
predictions, automated reports, and AI-generated explanations. The current
artifact is demo-only, but its API contract can later serve a real-data model.

## 6. Prediction Target

| Property | Value |
|---|---|
| Target variable | `fantasy_points` |
| Prediction type | Regression |
| Prediction timing | Before the player's next match |
| Unit | Fantasy points |
| Lower bound returned | 0 |

## 7. Model Used

The saved model is a scikit-learn pipeline:

1. `StandardScaler` standardizes the 22 numeric features.
2. `LinearRegression` learns a weighted linear relationship between those
   features and next-match fantasy points.

The fitted pipeline is saved as `api/model/model.pkl`. The API loads this file
once through a cached model loader and only calls `.predict()` during requests.
It never calls `.fit()` or retrains the model.

## 8. Dataset Used

- Source: `HimanshuKhale/datasets_cricket`
- Dataset type: synthetic/faux cricket data
- Canonical player-match rows: 264
- Leakage-safe rows with prior player history: 220
- Date range: July 1, 2026 to July 12, 2026
- Unique players: 44
- Unique teams: 4
- Model mode: `demo_only`
- Split: chronological 70/15/15
- Train/validation/test rows: 154/33/33

The dataset is suitable for demonstrating the modelling and API workflow. It is
not evidence of real predictive performance.

## 9. Feature Columns

The exact ordered feature contract is stored in
`api/model/feature_columns.json`.

| Group | Features |
|---|---|
| Form | `career_avg_before_match`, `recent_2_avg_before_match`, `recent_3_avg_before_match`, `recent_5_avg_before_match` |
| History | `prior_match_count`, `days_since_last_match` |
| Opportunity | `historical_balls_faced_avg_before_match`, `historical_overs_bowled_avg_before_match`, `historical_runs_avg_before_match`, `historical_wickets_avg_before_match` |
| Bayesian form | `bayesian_posterior_before_match`, `adjusted_posterior_before_match` |
| Role | `is_batter`, `is_bowler`, `is_allrounder`, `is_wicketkeeper` |
| Pressure/confidence | `historical_avg_pressure_faced`, `historical_avg_confidence`, `historical_confidence_slope`, `historical_high_pressure_control`, `historical_pressure_resilience`, `historical_dot_recovery_rate` |

Every feature is calculated from matches before the target match.

## 10. Input Schema

`POST /predict` accepts one JSON object with exactly these fields:

| Field | Type | Allowed range |
|---|---|---:|
| `career_avg_before_match` | number | 0-250 |
| `recent_2_avg_before_match` | number | 0-250 |
| `recent_3_avg_before_match` | number | 0-250 |
| `recent_5_avg_before_match` | number | 0-250 |
| `prior_match_count` | number | 1-1000 |
| `days_since_last_match` | number | 0-3650 |
| `historical_balls_faced_avg_before_match` | number | 0-120 |
| `historical_overs_bowled_avg_before_match` | number | 0-20 |
| `historical_runs_avg_before_match` | number | 0-200 |
| `historical_wickets_avg_before_match` | number | 0-10 |
| `bayesian_posterior_before_match` | number | 0-250 |
| `adjusted_posterior_before_match` | number | 0-250 |
| `is_batter` | number | 0 or 1 |
| `is_bowler` | number | 0 or 1 |
| `is_allrounder` | number | 0 or 1 |
| `is_wicketkeeper` | number | 0 or 1 |
| `historical_avg_pressure_faced` | number | 0-1 |
| `historical_avg_confidence` | number | 0-1 |
| `historical_confidence_slope` | number | -1 to 1 |
| `historical_high_pressure_control` | number | 0-1 |
| `historical_pressure_resilience` | number | 0-1 |
| `historical_dot_recovery_rate` | number | 0-1 |

`POST /predict-batch` accepts:

```json
{
  "rows": [
    { "the_same_22_fields": "..." }
  ]
}
```

The batch must contain between 1 and 100 rows.

## 11. Output Schema

| Field | Type | Meaning |
|---|---|---|
| `prediction` | number | Predicted fantasy points |
| `prediction_label` | string | Low, Moderate, or Strong Fantasy Potential |
| `model_name` | string | Model identifier |
| `model_version` | string | Version for traceability |
| `features_used` | string array | Exact ordered model features |
| `confidence_note` | string | Honest test-error context, not a probability |
| `explanation` | string | Simple cricket interpretation |
| `model_mode` | string | `demo_only` |

Prediction labels are display bands:

- `< 35`: Low Fantasy Potential
- `35-59.99`: Moderate Fantasy Potential
- `>= 60`: Strong Fantasy Potential

## 12. Sample Request

```bash
curl -X POST "http://127.0.0.1:8001/predict" \
  -H "Content-Type: application/json" \
  --data @api/model/sample_input.json
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

## 13. Sample Response

This response was generated from the packaged `.pkl` model:

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
  "explanation": "In cricket terms, the model predicts 47.35 fantasy points. It sees that recent form is at or below the career level, historical pressure resilience is limited, and the player's profile mainly reflects bowling contribution. This is a synthetic-data demonstration, so the value should support a dashboard workflow rather than a real selection decision.",
  "model_mode": "demo_only"
}
```

## 14. Model Metrics

| Model | Test MAE | Test RMSE | Test R2 |
|---|---:|---:|---:|
| Career-average baseline | 29.065 | 37.407 | -0.291 |
| Linear Regression | 26.577 | 33.530 | -0.037 |

- **MAE:** The model misses by about 26.6 fantasy points on average.
- **RMSE:** Large prediction errors increase this metric more strongly.
- **R2:** The negative value means the synthetic test data does not show
  reliable generalization.
- **Baseline comparison:** Linear Regression improves test MAE by 2.488 points
  and RMSE by 3.877 points compared with the career-average baseline.

The model beats the baseline, but the metrics are not strong enough for
real-world predictive claims.

## 15. Model Card

| Required field | Value |
|---|---|
| Model Name | `linear_regression` |
| Model Version | `2.0.0` |
| Prediction Type | Regression |
| Target Variable | `fantasy_points` |
| Algorithm | `StandardScaler` + `LinearRegression` |
| Training Data | Synthetic/faux `HimanshuKhale/datasets_cricket` |
| Number of Rows | 264 canonical; 220 leakage-safe modelling rows |
| Feature Columns | 22 historical features listed in Section 9 |
| Metrics | Test MAE 26.577, RMSE 33.530, R2 -0.037 |
| Best Use Case | Demonstrating pre-match prediction, API integration, batch inference, dashboard wiring, and model comparison |
| Bad Use Case | Betting, production fantasy selection, real player evaluation, or any high-stakes decision |
| Known Limitations | Tiny synthetic dataset, weak R2, engineered pressure proxies, and missing match context |
| Can this be integrated into Khel AI? Why? | Yes. It has a stable JSON contract, batch inference, explanations, model metadata, validation, and a replaceable versioned artifact. |

## 16. Validation Rules

- All 22 fields are required.
- Extra fields are rejected.
- Invalid strings or incompatible data types are rejected.
- Role flags must be between 0 and 1.
- Pressure/confidence rates must be between 0 and 1.
- Confidence slope must be between -1 and 1.
- Cricket quantities have sensible non-negative upper bounds.
- Batch requests must contain 1-100 rows.
- The schema is compared with `feature_columns.json` when the model loads.
- Invalid input returns HTTP 422 with field-level details.
- Missing or inconsistent model artifacts return HTTP 503.

## 17. Known Limitations

- The dataset is synthetic/faux.
- The canonical dataset has only 264 rows.
- The test set contains only 33 rows.
- Negative test R2 indicates weak generalization.
- Pressure and confidence are engineered performance proxies, not measured
  player psychology.
- The model does not include confirmed XI, injuries, toss, weather, detailed
  venue conditions, batting-order changes, or opposition line-up quality.
- The fantasy target depends on the scoring rules used to create it.
- Prediction labels are not calibrated probabilities.
- Linear relationships may miss complex interactions.
- The API expects precomputed features; it does not generate them from raw
  scorecards during a request.

## 18. Future Improvements

1. Retrain on a larger real ball-by-ball and player-match dataset.
2. Add venue, opponent, playing XI, batting position, toss, and weather context.
3. Validate pressure features against real match situations and commentary.
4. Compare regularized linear models and tree models after sufficient real data exists.
5. Add rolling-origin evaluation across tournaments and seasons.
6. Add prediction intervals or calibrated uncertainty.
7. Add model monitoring for feature drift and prediction error.
8. Add per-feature contribution explanations for dashboard users.
9. Automate feature generation from Khel AI's match data pipeline.
10. Version real and demo models separately without changing the API contract.

## 19. Hosted API URL

- **Status:** Pending deployment.
- **Local API:** `http://127.0.0.1:8001`
- **Local Swagger:** `http://127.0.0.1:8001/docs`

The project includes `render.yaml` and a Dockerfile for Render, Hugging Face
Spaces, Koyeb, Railway, or another container host. A public URL cannot be
truthfully listed until deployment credentials and a Git-backed source are
available.

## 20. GitHub Repository URL

- **Status:** Pending publication.
- **Repository URL:** Pending publication.

A real repository URL must be added after the project is pushed. A guessed URL
is intentionally not listed because fabricated repository evidence carries a
major rubric penalty.

## API Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | API and student identification |
| GET | `/health` | API and model status |
| GET | `/model-info` | Model card data, features, metrics, and version |
| POST | `/predict` | Single-player prediction |
| POST | `/predict-batch` | Squad/batch prediction for 1-100 rows |
| GET | `/docs` | Swagger documentation |

## Khel AI Integration Map

| Khel AI area | Integration |
|---|---|
| Match dashboard | Rank likely high-value players before a fixture |
| Player dashboard | Show predicted points, form band, role, and pressure explanation |
| Bowler dashboard | Use bowling opportunity, wicket history, and pressure resilience for bowler projections |
| Live-style dashboard | Display the pre-match projection beside live actual points; do not recalculate with current-match leakage |
| AI agent tool | Let an agent request one or many projections and summarize the reasons |
| Prediction panel | Compare model output with career-average fallback |
| Fantasy points panel | Sort a squad by predicted fantasy points and prediction band |
| Match analysis report | Include pre-match forecasts, actual outcomes, errors, and model version |
| Squad comparison | Call `/predict-batch` for both teams and compare role-balanced options |

Recommended operational flow:

1. Compute features in the Khel AI backend before the fixture.
2. Call `/predict` for one player or `/predict-batch` for a squad.
3. Cache by player, match, feature timestamp, and model version.
4. Display the demo warning with every synthetic-model prediction.
5. Fall back to career average when inference is unavailable.
6. Log predictions and later outcomes for monitoring.

## Run Locally

```bash
pip install -r api/requirements.txt
uvicorn api.main:app --host 127.0.0.1 --port 8001
```

Open `http://127.0.0.1:8001/docs`.
