"""Reproducibly train the packaged demo-only fantasy-points model."""

import csv
import json
from pathlib import Path

from joblib import dump
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler


BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "training_data.csv"
MODEL_PATH = BASE_DIR / "model.pkl"
FEATURE_PATH = BASE_DIR / "feature_columns.json"
METRICS_PATH = BASE_DIR / "metrics.json"
TARGET = "fantasy_points"

FEATURE_COLUMNS = [
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
    "historical_dot_recovery_rate",
]


def evaluate(actual, predicted):
    return {
        "mae": round(float(mean_absolute_error(actual, predicted)), 3),
        "rmse": round(float(mean_squared_error(actual, predicted) ** 0.5), 3),
        "r2": round(float(r2_score(actual, predicted)), 3),
        "rows": len(actual),
    }


def load_rows():
    with DATA_PATH.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    rows.sort(key=lambda row: (row["match_date"], row["match_id"], row["player_name"]))
    return rows


def matrix(rows):
    return [[float(row[column]) for column in FEATURE_COLUMNS] for row in rows]


def targets(rows):
    return [float(row[TARGET]) for row in rows]


def main():
    rows = load_rows()
    train_end = int(len(rows) * 0.70)
    validation_end = int(len(rows) * 0.85)
    train = rows[:train_end]
    validation = rows[train_end:validation_end]
    test = rows[validation_end:]

    model = make_pipeline(StandardScaler(), LinearRegression())
    model.fit(matrix(train), targets(train))
    dump(model, MODEL_PATH)

    feature_payload = {
        "feature_columns": FEATURE_COLUMNS,
        "target_column": TARGET,
        "model_mode": "demo_only",
        "leakage_rule": "All features must be calculated strictly before the target match.",
    }
    FEATURE_PATH.write_text(json.dumps(feature_payload, indent=2) + "\n", encoding="utf-8")

    metrics = {
        "model_name": "linear_regression",
        "model_version": "2.0.0",
        "model_mode": "demo_only",
        "source_dataset": "HimanshuKhale/datasets_cricket",
        "canonical_rows": 264,
        "training_rows": len(rows),
        "split_strategy": "chronological_70_15_15",
        "splits": {
            "train": len(train),
            "validation": len(validation),
            "test": len(test),
        },
        "linear_regression": {
            "train": evaluate(targets(train), model.predict(matrix(train))),
            "validation": evaluate(targets(validation), model.predict(matrix(validation))),
            "test": evaluate(targets(test), model.predict(matrix(test))),
        },
        "career_average_baseline": {
            "test": evaluate(targets(test), [float(row["career_avg_before_match"]) for row in test])
        },
        "warning": (
            "Small synthetic/faux dataset. Metrics demonstrate the API and modelling workflow only "
            "and are not evidence of production predictive accuracy."
        ),
    }
    METRICS_PATH.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
