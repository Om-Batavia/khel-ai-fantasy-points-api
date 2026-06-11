# Model Card: Pressure-Enriched Fantasy Points

## Model

- Task: regression
- Target: next-match fantasy points
- Algorithm: `StandardScaler` followed by `LinearRegression`
- Artifact: `model.pkl`
- Mode: `demo_only`
- Source: synthetic/faux `HimanshuKhale/datasets_cricket`
- Canonical rows: 264
- Leakage-safe modelling rows: 220
- Split: chronological 70/15/15 (154 train, 33 validation, 33 test)

The model estimates fantasy points from information available before a match:
career and recent form, opportunity, role, Bayesian form estimates, and historical
pressure/confidence behaviour.

## Evaluation

| Model | Test MAE | Test RMSE | Test R2 |
|---|---:|---:|---:|
| Career-average baseline | 29.065 | 37.407 | -0.291 |
| Linear Regression | 26.577 | 33.530 | -0.037 |

MAE means the prediction misses by about 26.6 fantasy points on average. RMSE
penalizes large misses more strongly. Negative R2 means this tiny synthetic
test set does not support a claim of reliable real-world prediction, even
though Linear Regression beats the career-average baseline on MAE and RMSE.

## Intended Use

Use this artifact to demonstrate model loading, validation, single/batch
inference, API integration, and dashboard wiring. Do not use it for betting,
real team selection, production ranking, or claims about real players.

## Leakage Controls

Every feature is computed from matches before the target match. Current-match
runs, wickets, strike rate, economy, fantasy points, fielding events, composite
scores, and match result are not model inputs.

## Reproduction

Run `python train_model.py`. Training is an offline step. The API never imports
or calls this script and never fits a model during a request.
