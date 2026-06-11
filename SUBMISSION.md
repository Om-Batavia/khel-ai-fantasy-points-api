# Khel.ai Agent Arena 1 - API Documentation Submission

## Student

Om-Batavia (Student 5)

## API

Khel AI Pressure-Enriched Fantasy Points API

## Prediction

Predicts a cricket player's next-match fantasy points from 22 leakage-safe
historical form, role, opportunity, pressure, and confidence features.

## Deliverables

- API documentation: `API_DOCUMENTATION.md`
- Model card: Sections 7 and 15 of `API_DOCUMENTATION.md`
- Training script: `model_training/train_model.py`
- Trained model: `model_training/model.pkl`
- Feature schema: `model_training/feature_columns.json`
- Metrics: `model_training/metrics.json`
- Sample request: `model_training/sample_input.json`
- Sample response: `model_training/sample_response.json`
- Model note: `model_training/README.md`
- Batch endpoint: `POST /predict-batch`

## Links

- GitHub repository: https://github.com/Om-Batavia/khel-ai-fantasy-points-api
- Hosted API: Pending hosting-account authorization
- Swagger documentation: Pending hosting-account authorization
- Render deployment setup: https://dashboard.render.com/blueprint/new?repo=https://github.com/Om-Batavia/khel-ai-fantasy-points-api

## Main Endpoints

- `GET /health`
- `GET /model-info`
- `POST /predict`
- `POST /predict-batch`
- `GET /docs`

## Evaluation Summary

- Test MAE: 26.577 fantasy points
- Test RMSE: 33.530 fantasy points
- Test R2: -0.037
- Career-average baseline MAE: 29.065 fantasy points
- Dataset mode: synthetic demonstration only

The model improves MAE and RMSE over the baseline, but its negative test R2 and
small synthetic dataset mean it is not suitable for production or high-stakes
selection decisions.
