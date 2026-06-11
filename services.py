import json
import math
import os
import csv
from functools import lru_cache
from pathlib import Path

from schemas import (
    ComponentBreakdown,
    DerivedVariablesUsed,
    ExpectedFantasyFinalRequest,
    ExpectedFantasyFinalResponse,
    FantasyPointFeatures,
    FantasyPredictionResponse,
)


BATTING_EVENTS = ["run_0", "run_1", "run_2", "run_3", "four", "six", "dismissal"]
BOWLING_EVENTS = ["dot_ball", "wicket", "maiden_over", "economy_bonus"]
FIELDING_EVENTS = ["catch", "run_out", "stumping"]
ML_FEATURE_COLUMNS = [
    "career_avg_before_match",
    "career_median_before_match",
    "career_std_before_match",
    "recent_3_avg_before_match",
    "recent_5_avg_before_match",
    "recent_10_avg_before_match",
    "recent_3_std_before_match",
    "recent_5_std_before_match",
    "recent_10_std_before_match",
    "prior_match_count",
    "days_since_last_match",
    "form_slope_5",
    "form_slope_10",
    "volatility_5",
    "volatility_10",
    "player_vs_opponent_avg_before_match",
    "player_vs_opponent_count_before_match",
    "player_vs_opponent_std_before_match",
    "bayesian_posterior_before_match",
    "adjusted_posterior_before_match",
    "opponent_uncertainty_penalty",
    "opponent_evidence_weight",
    "player_at_venue_avg_before_match",
    "venue_avg_score_before_match",
    "venue_sample_size_before_match",
    "team_vs_opponent_context",
    "historical_balls_faced_avg_before_match",
    "historical_overs_bowled_avg_before_match",
    "historical_wickets_avg_before_match",
    "historical_runs_avg_before_match",
    "batting_opportunity_proxy",
    "bowling_opportunity_proxy",
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
API_MODEL_DIR = Path(__file__).resolve().parent / "model_training"
PROJECT_ROOT = Path(__file__).resolve().parents[2]
REAL_MODEL_DIR = PROJECT_ROOT / "models"
MAX_REALISTIC_FANTASY_POINTS = 200.0
DEMO_WARNING = (
    "Synthetic demo model: use for API and workflow demonstration only, "
    "not real predictive accuracy or production fantasy decisions."
)


@lru_cache(maxsize=1)
def load_api_model_bundle():
    model_dir = Path(os.environ.get("MATCHIQ_MODEL_DIR", API_MODEL_DIR))
    model_path = model_dir / "model.pkl"
    feature_path = model_dir / "feature_columns.json"
    metrics_path = model_dir / "metrics.json"
    missing = [str(path) for path in (model_path, feature_path, metrics_path) if not path.exists()]
    if missing:
        raise RuntimeError(f"Required pre-trained artifacts are missing: {', '.join(missing)}")

    from joblib import load

    feature_payload = json.loads(feature_path.read_text(encoding="utf-8"))
    metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
    columns = feature_payload.get("feature_columns", feature_payload)
    return {
        "model": load(model_path),
        "feature_columns": columns,
        "metrics": metrics,
        "model_path": model_path,
    }


def predict_fantasy_points(features: FantasyPointFeatures) -> FantasyPredictionResponse:
    bundle = load_api_model_bundle()
    values = features.model_dump()
    expected = bundle["feature_columns"]
    if list(values) != expected:
        raise ValueError("API input schema does not match feature_columns.json.")
    prediction = max(0.0, float(bundle["model"].predict([[values[column] for column in expected]])[0]))
    metrics = bundle["metrics"]
    return FantasyPredictionResponse(
        predicted_fantasy_points=round(prediction, 2),
        prediction_unit="fantasy points (not a score out of 10)",
        model_name=metrics["model_name"],
        model_version=metrics["model_version"],
        model_mode=metrics["model_mode"],
        feature_count=len(expected),
        warning=DEMO_WARNING,
    )


def calculate_expected_fantasy_final(payload: ExpectedFantasyFinalRequest) -> ExpectedFantasyFinalResponse:
    point_values = payload.event_point_values.model_dump()
    thresholds = payload.selection_thresholds.model_dump()

    row_projection = _projection_from_player_match_rows(payload)
    if row_projection:
        batting_breakdown, bowling_breakdown, fielding_breakdown, model_mode, risk_level = row_projection
        batting_probabilities = {}
        bowling_probabilities = {}
        fielding_probabilities = {}
    else:
        if not (
            payload.batting_event_probabilities
            and payload.bowling_event_probabilities
            and payload.fielding_event_probabilities
        ):
            raise ValueError("Provide event probabilities or player_match_rows.")
        batting_probabilities = payload.batting_event_probabilities.model_dump()
        bowling_probabilities = payload.bowling_event_probabilities.model_dump()
        fielding_probabilities = payload.fielding_event_probabilities.model_dump()
        batting_breakdown = _expected_breakdown(batting_probabilities, point_values, BATTING_EVENTS)
        bowling_breakdown = _expected_breakdown(bowling_probabilities, point_values, BOWLING_EVENTS)
        fielding_breakdown = _expected_breakdown(fielding_probabilities, point_values, FIELDING_EVENTS)
        model_mode = "demo_payload_mode"
        risk_level = "Medium"

    batting_expected = sum(batting_breakdown.values())
    bowling_expected = sum(bowling_breakdown.values())
    fielding_expected = sum(fielding_breakdown.values())
    pressure_context = _pressure_context_values(payload)
    context_multiplier = _context_multiplier(payload, pressure_context)
    batting_expected *= context_multiplier
    bowling_expected *= context_multiplier
    fielding_expected *= context_multiplier
    expected_points = batting_expected + bowling_expected + fielding_expected
    event_breakdown = {**batting_breakdown, **bowling_breakdown, **fielding_breakdown}
    selection_label = _selection_label(expected_points, thresholds)
    supervised_result = _supervised_ml_prediction(payload, model_mode)
    supervised_prediction = supervised_result["prediction"]
    best_model_name = supervised_result["model_name"]
    ml_prediction_valid = supervised_result["valid"]
    fallback_used = not ml_prediction_valid
    fallback_reason = supervised_result["reason"]
    final_prediction = supervised_prediction if ml_prediction_valid else expected_points
    model_source = "supervised_ml" if ml_prediction_valid else "bayesian_statistical_fallback"
    interpretation_summary = _interpretation_summary(
        expected_points,
        supervised_prediction,
        selection_label,
        risk_level,
        model_source,
        best_model_name,
    )

    return ExpectedFantasyFinalResponse(
        metric="expected_fantasy_points_final_output",
        label=selection_label,
        expected_fantasy_points=_round_float(expected_points, 2),
        final_prediction=_round_float(final_prediction, 2),
        supervised_ml_prediction=_round_float(supervised_prediction, 2) if supervised_prediction is not None else None,
        ml_prediction_valid=ml_prediction_valid,
        fallback_used=fallback_used,
        fallback_reason=fallback_reason,
        model_source=model_source,
        best_model_name=best_model_name,
        risk_level=risk_level,
        interpretation_summary=interpretation_summary,
        selection_value_label=selection_label,
        component_breakdown=ComponentBreakdown(
            batting_expected_points=_round_float(batting_expected, 2),
            bowling_expected_points=_round_float(bowling_expected, 2),
            fielding_expected_points=_round_float(fielding_expected, 2),
            event_breakdown={key: _round_float(value, 3) for key, value in event_breakdown.items()},
        ),
        derived_variables_used=DerivedVariablesUsed(
            batting_event_probabilities=batting_probabilities,
            bowling_event_probabilities=bowling_probabilities,
            fielding_event_probabilities=fielding_probabilities,
            event_point_values=point_values,
            selection_thresholds=thresholds,
        ),
        explanation=_build_explanation(expected_points, selection_label, thresholds),
        supporting_values={
            "model_mode": model_mode,
            "model_source": model_source,
            "best_model_name": best_model_name,
            "ml_prediction_valid": ml_prediction_valid,
            "fallback_used": fallback_used,
            "fallback_reason": fallback_reason,
            "risk_level": risk_level,
            "interpretation_summary": interpretation_summary,
            "formula": "expected_fantasy_points = sum(event_probability * event_point_value)",
            "decision_rule": "Must Pick >= must_pick_min; Strong Pick >= strong_pick_min; Risk Pick >= risk_pick_min; Avoid otherwise.",
            "anti_leakage_rule": (
                "When target_match_date is supplied, player_match_rows on or after that date are excluded "
                "before expected fantasy value is calculated."
            ),
            "uncertainty_note": "Selection is based on expected value because each event is uncertain and represented by probability.",
            "analysis_mode": "hybrid_pressure_context" if pressure_context["sample_size"] else "player_match",
            "pressure_context": pressure_context,
            "context_multiplier": _round_float(context_multiplier, 3),
        },
        player_id=payload.player.player_id,
        player_name=payload.player.player_name,
    )


def _supervised_ml_prediction(payload: ExpectedFantasyFinalRequest, payload_model_mode: str):
    if not payload.player_match_rows:
        return _invalid_ml_result("Supervised ML requires player_match_rows.")
    model_path, model_name, model_dir = _preferred_model_path(payload_model_mode)
    if model_path is None:
        expected_dir = model_dir or (REAL_MODEL_DIR if payload_model_mode == "real_model" else API_MODEL_DIR)
        return _invalid_ml_result(f"Required {payload_model_mode} model artifacts are missing from {expected_dir}.")

    artifact_mode = _artifact_model_mode(model_path.parent)
    if payload_model_mode == "real_model" and artifact_mode != "real_model":
        return _invalid_ml_result(
            f"Refused {artifact_mode} artifact for real_model payload.",
            model_name=model_name,
        )
    if "demo" in payload_model_mode and artifact_mode == "real_model":
        return _invalid_ml_result(
            "Refused real_model artifact for demo payload.",
            model_name=model_name,
        )

    feature_columns = _load_feature_columns(model_path.parent)
    feature_values = _ml_feature_values(payload)
    if feature_values is None:
        return _invalid_ml_result("Unable to build supervised ML features.", model_name=model_name)
    missing_features = [column for column in feature_columns if column not in feature_values]
    if missing_features:
        return _invalid_ml_result(
            f"Model feature contract is missing values for: {', '.join(missing_features)}.",
            model_name=model_name,
        )
    out_of_distribution_reason = _out_of_distribution_reason(
        feature_values,
        _load_feature_ranges(model_path.parent),
    )
    if out_of_distribution_reason:
        return _invalid_ml_result(out_of_distribution_reason, model_name=model_name)

    features = [float(feature_values[column]) for column in feature_columns]
    try:
        from joblib import load
        model = load(model_path)
        prediction = float(model.predict([features])[0])
    except Exception as exc:
        return _invalid_ml_result(f"Supervised ML prediction failed: {exc}", model_name=model_name)

    if not math.isfinite(prediction):
        return _invalid_ml_result(
            "ML prediction rejected because output was NaN or infinite.",
            model_name=model_name,
        )
    if prediction < 0 or prediction > MAX_REALISTIC_FANTASY_POINTS:
        return _invalid_ml_result(
            "ML prediction rejected because output was outside realistic range 0-200.",
            model_name=model_name,
        )
    return {
        "prediction": prediction,
        "model_name": model_name,
        "valid": True,
        "reason": None,
    }


def _preferred_model_path(payload_model_mode: str):
    configured_dir = os.environ.get("MATCHIQ_MODEL_DIR")
    if configured_dir:
        model_dir = Path(configured_dir)
    elif payload_model_mode == "real_model":
        model_dir = REAL_MODEL_DIR
    else:
        model_dir = API_MODEL_DIR

    packaged_model = model_dir / "model.pkl"
    if packaged_model.exists():
        return packaged_model, "linear_regression", model_dir
    best_model = model_dir / "best_model.pkl"
    if best_model.exists():
        return best_model, _best_model_name(model_dir), model_dir
    metrics_path = model_dir / "model_metrics.json"
    if metrics_path.exists():
        try:
            metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
            best_model_name = metrics.get("best_supervised_model_name") or metrics.get("best_model_name")
            if best_model_name:
                candidate = model_dir / f"{best_model_name}.pkl"
                if candidate.exists():
                    return candidate, best_model_name, model_dir
        except (OSError, json.JSONDecodeError):
            pass
    for filename in ("linear_regression.pkl", "ridge_regression.pkl", "hist_gradient_boosting.pkl", "random_forest.pkl"):
        candidate = model_dir / filename
        if candidate.exists():
            return candidate, candidate.stem, model_dir
    return None, None, model_dir


def _artifact_model_mode(model_dir: Path) -> str:
    for filename in ("model_metrics.json", "metrics.json"):
        metrics_path = model_dir / filename
        if not metrics_path.exists():
            continue
        try:
            metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        mode = metrics.get("dataset_mode") or metrics.get("model_mode")
        if mode:
            return mode
        if metrics.get("demo_dataset") is True:
            return "demo_only"
    feature_path = model_dir / "feature_columns.json"
    if feature_path.exists():
        try:
            feature_payload = json.loads(feature_path.read_text(encoding="utf-8"))
            mode = feature_payload.get("dataset_mode") or feature_payload.get("model_mode")
            if mode:
                return mode
        except (OSError, json.JSONDecodeError, AttributeError):
            pass
    return "real_model" if (model_dir / "best_model.pkl").exists() else "unknown"


def _load_feature_ranges(model_dir: Path) -> dict[str, dict[str, float]]:
    range_path = model_dir / "feature_ranges.json"
    if range_path.exists():
        try:
            payload = json.loads(range_path.read_text(encoding="utf-8"))
            return payload.get("feature_ranges", payload)
        except (OSError, json.JSONDecodeError, AttributeError):
            return {}

    training_path = model_dir / "training_data.csv"
    if not training_path.exists():
        return {}
    try:
        with training_path.open(newline="", encoding="utf-8") as handle:
            rows = list(csv.DictReader(handle))
        values = [
            float(row["days_since_last_match"])
            for row in rows
            if row.get("days_since_last_match") not in ("", None)
        ]
    except (OSError, ValueError, KeyError):
        return {}
    if not values:
        return {}
    return {"days_since_last_match": {"min": min(values), "max": max(values)}}


def _out_of_distribution_reason(feature_values, feature_ranges):
    days_range = feature_ranges.get("days_since_last_match")
    if not days_range:
        return None
    value = float(feature_values["days_since_last_match"])
    minimum = float(days_range["min"])
    maximum = float(days_range["max"])
    tolerance = max(30.0, 5.0 * max(maximum - minimum, 1.0))
    if value < max(0.0, minimum - tolerance) or value > maximum + tolerance:
        return (
            f"ML prediction rejected because days_since_last_match={value:.1f} is far outside "
            f"the training range {minimum:.1f}-{maximum:.1f}."
        )
    return None


def _invalid_ml_result(reason: str, model_name=None):
    return {
        "prediction": None,
        "model_name": model_name,
        "valid": False,
        "reason": reason,
    }


def _best_model_name(model_dir: Path):
    metrics_path = model_dir / "model_metrics.json"
    if not metrics_path.exists():
        return "best_model"
    try:
        metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return "best_model"
    return metrics.get("best_supervised_model_name") or metrics.get("best_model_name") or "best_model"


def _load_feature_columns(model_dir: Path):
    feature_path = model_dir / "feature_columns.json"
    if not feature_path.exists():
        return ML_FEATURE_COLUMNS
    try:
        payload = json.loads(feature_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return ML_FEATURE_COLUMNS
    if isinstance(payload, dict):
        columns = payload.get("feature_columns")
    else:
        columns = payload
    return columns if columns else ML_FEATURE_COLUMNS


def _ml_feature_vector(payload: ExpectedFantasyFinalRequest, feature_columns: list[str]):
    feature_values = _ml_feature_values(payload)
    if feature_values is None:
        return None
    try:
        return [float(feature_values[column]) for column in feature_columns]
    except KeyError:
        return None


def _ml_feature_values(payload: ExpectedFantasyFinalRequest):
    player_id = payload.player.player_id
    player_name = (payload.player.player_name or "").strip().lower()
    target_date = payload.target_match_date
    rows = [
        row for row in payload.player_match_rows
        if (player_id and row.player_id == player_id)
        or (player_name and row.player_name.strip().lower() == player_name)
    ]
    if target_date:
        rows = [row for row in rows if row.match_date < target_date]
    if not rows:
        return None
    rows = sorted(rows, key=lambda row: (row.match_date, row.match_id or "", row.player_name))
    target_values = [_row_fantasy_points(row) for row in rows]
    career_avg = _mean(target_values)
    career_median = _median(target_values)
    career_std = _population_standard_deviation(target_values, career_avg)
    recent_2 = target_values[-2:]
    recent_3 = target_values[-3:]
    recent_5 = target_values[-5:]
    recent_10 = target_values[-10:]
    opponent_name = (payload.opponent_team_name or "").strip().lower()
    venue = (payload.venue or "").strip().lower()
    opponent_values = [
        _row_fantasy_points(row) for row in rows
        if opponent_name and (row.opponent_team_name or "").strip().lower() == opponent_name
    ]
    venue_values = [
        _row_fantasy_points(row) for row in rows
        if venue and (row.venue or "").strip().lower() == venue
    ]
    opponent_avg = _mean(opponent_values) if opponent_values else career_avg
    opponent_std = _population_standard_deviation(opponent_values, opponent_avg) if opponent_values else career_std
    venue_avg = _mean(venue_values) if venue_values else career_avg
    opponent_sample_size = len(opponent_values)
    posterior_weight = _safe_divide(opponent_sample_size, opponent_sample_size + 5)
    bayesian_posterior = ((1 - posterior_weight) * career_avg) + (posterior_weight * opponent_avg)
    opponent_uncertainty_penalty = _safe_divide(1, (opponent_sample_size + 1) ** 0.5)
    adjusted_posterior = bayesian_posterior + (0.15 * _slope(recent_10)) - (0.03 * career_std) - opponent_uncertainty_penalty
    balls_avg = _mean([row.balls_faced for row in rows])
    overs_avg = _mean([row.overs_bowled for row in rows])
    wickets_avg = _mean([row.wickets for row in rows])
    runs_avg = _mean([row.runs for row in rows])
    days_since_last_match = (target_date - rows[-1].match_date).days if target_date else 0
    role_text = " ".join((row.role or "") for row in rows).lower()
    is_batter = 1.0 if "bat" in role_text or balls_avg >= 10 else 0.0
    is_bowler = 1.0 if "bowl" in role_text or overs_avg >= 1.5 else 0.0
    is_wicketkeeper = 1.0 if "wicket" in role_text or "keeper" in role_text else 0.0
    is_allrounder = 1.0 if ("all" in role_text and "round" in role_text) or (is_batter and is_bowler) else 0.0
    pressure_context = _pressure_context_values(payload)
    return {
        "career_avg_before_match": career_avg,
        "career_median_before_match": career_median,
        "career_std_before_match": career_std,
        "recent_2_avg_before_match": _mean(recent_2),
        "recent_3_avg_before_match": _mean(recent_3),
        "recent_5_avg_before_match": _mean(recent_5),
        "recent_10_avg_before_match": _mean(recent_10),
        "recent_2_std_before_match": _population_standard_deviation(recent_2, _mean(recent_2)),
        "recent_3_std_before_match": _population_standard_deviation(recent_3, _mean(recent_3)),
        "recent_5_std_before_match": _population_standard_deviation(recent_5, _mean(recent_5)),
        "recent_10_std_before_match": _population_standard_deviation(recent_10, _mean(recent_10)),
        "prior_match_count": float(len(rows)),
        "days_since_last_match": float(max(days_since_last_match, 0)),
        "form_slope_5": _slope(recent_5),
        "form_slope_10": _slope(recent_10),
        "volatility_5": _population_standard_deviation(recent_5, _mean(recent_5)),
        "volatility_10": _population_standard_deviation(recent_10, _mean(recent_10)),
        "player_vs_opponent_avg_before_match": opponent_avg,
        "player_vs_opponent_count_before_match": float(opponent_sample_size),
        "player_vs_opponent_std_before_match": opponent_std,
        "bayesian_posterior_before_match": bayesian_posterior,
        "adjusted_posterior_before_match": adjusted_posterior,
        "opponent_uncertainty_penalty": opponent_uncertainty_penalty,
        "opponent_evidence_weight": posterior_weight,
        "player_at_venue_avg_before_match": venue_avg,
        "venue_avg_score_before_match": venue_avg,
        "venue_sample_size_before_match": float(len(venue_values)),
        "team_vs_opponent_context": career_avg,
        "historical_balls_faced_avg_before_match": balls_avg,
        "historical_overs_bowled_avg_before_match": overs_avg,
        "historical_wickets_avg_before_match": wickets_avg,
        "historical_runs_avg_before_match": runs_avg,
        "batting_opportunity_proxy": balls_avg,
        "bowling_opportunity_proxy": overs_avg,
        "is_batter": is_batter,
        "is_bowler": is_bowler,
        "is_allrounder": is_allrounder,
        "is_wicketkeeper": is_wicketkeeper,
        "historical_avg_pressure_faced": pressure_context["avg_pressure"],
        "historical_avg_confidence": pressure_context["avg_confidence"],
        "historical_confidence_slope": pressure_context["confidence_slope"],
        "historical_high_pressure_control": pressure_context["high_pressure_control"],
        "historical_pressure_resilience": pressure_context["pressure_resilience"],
        "historical_dot_recovery_rate": pressure_context["dot_recovery_rate"],
    }


def _row_fantasy_points(row) -> float:
    if row.fantasy_points is not None:
        return row.fantasy_points
    return _batting_points(row) + _bowling_points(row) + _fielding_points(row)


def _pressure_context_values(payload: ExpectedFantasyFinalRequest):
    rows = payload.pressure_confidence_rows or []
    if payload.target_match_date:
        rows = [row for row in rows if row.match_date < payload.target_match_date]
    if not rows:
        return {
            "sample_size": 0,
            "avg_pressure": 0.0,
            "avg_confidence": 0.5,
            "confidence_slope": 0.0,
            "high_pressure_control": 0.5,
            "pressure_resilience": 0.5,
            "dot_recovery_rate": 0.5,
        }
    return {
        "sample_size": len(rows),
        "avg_pressure": _mean([row.avg_pressure for row in rows]),
        "avg_confidence": _mean([row.avg_confidence for row in rows]),
        "confidence_slope": _mean([row.confidence_slope for row in rows]),
        "high_pressure_control": _mean([row.high_pressure_control for row in rows]),
        "pressure_resilience": _mean([row.pressure_resilience for row in rows]),
        "dot_recovery_rate": _mean([row.dot_recovery_rate for row in rows]),
    }


def _context_multiplier(payload: ExpectedFantasyFinalRequest, context):
    if not context["sample_size"] and payload.form_trend_score is None and payload.opponent_posterior is None:
        return 1.0
    pressure_signal = (
        (0.35 * (context["avg_confidence"] - 0.5))
        + (0.25 * (context["pressure_resilience"] - context["avg_pressure"]))
        + (0.20 * (context["high_pressure_control"] - 0.5))
        + (0.10 * context["confidence_slope"])
        + (0.10 * (context["dot_recovery_rate"] - 0.5))
    )
    form_signal = ((payload.form_trend_score - 50) / 100) if payload.form_trend_score is not None else 0.0
    opponent_signal = 0.0
    if payload.opponent_posterior is not None:
        opponent_signal = max(-0.5, min((payload.opponent_posterior - 50) / 100, 0.5))
    return max(0.85, min(1.15, 1 + pressure_signal + (0.08 * form_signal) + (0.08 * opponent_signal)))


def _model_source(supervised_prediction, model_mode: str) -> str:
    if supervised_prediction is not None:
        return "supervised_ml"
    if "demo" in (model_mode or "").lower():
        return "demo_only"
    return "bayesian_statistical_fallback"


def _interpretation_summary(expected_points, supervised_prediction, selection_label, risk_level, model_source, best_model_name):
    if supervised_prediction is None:
        return (
            f"Bayesian/statistical fallback projects {expected_points:.2f} points with {risk_level} risk "
            f"and a {selection_label} recommendation."
        )
    delta = supervised_prediction - expected_points
    direction = "above" if delta >= 0 else "below"
    return (
        f"{best_model_name} predicts {supervised_prediction:.2f} points, {abs(delta):.2f} {direction} "
        f"the Bayesian/statistical estimate of {expected_points:.2f}. Recommendation: {selection_label}; "
        f"risk: {risk_level}; source: {model_source}."
    )


def _projection_from_player_match_rows(payload: ExpectedFantasyFinalRequest):
    if not payload.player_match_rows:
        return None

    player_id = payload.player.player_id
    player_name = (payload.player.player_name or "").strip().lower()
    opponent_id = payload.opponent_team_id
    opponent_name = (payload.opponent_team_name or "").strip().lower()

    rows = [
        row for row in payload.player_match_rows
        if (player_id and row.player_id == player_id)
        or (player_name and row.player_name.strip().lower() == player_name)
    ]
    if payload.target_match_date:
        rows = [row for row in rows if row.match_date < payload.target_match_date]
    if opponent_id or opponent_name:
        opponent_rows = [
            row for row in rows
            if (opponent_id and row.opponent_team_id == opponent_id)
            or (opponent_name and (row.opponent_team_name or "").strip().lower() == opponent_name)
        ]
        if opponent_rows:
            rows = opponent_rows
    if not rows:
        raise ValueError("No historical player_match_rows matched the requested player/opponent before the target date.")

    batting_values = [_batting_points(row) for row in rows]
    bowling_values = [_bowling_points(row) for row in rows]
    fielding_values = [_fielding_points(row) for row in rows]
    batting_expected = _mean(batting_values)
    bowling_expected = _mean(bowling_values)
    fielding_expected = _mean(fielding_values)
    if payload.adjusted_posterior is not None:
        scale = _safe_divide(payload.adjusted_posterior, batting_expected + bowling_expected + fielding_expected)
        batting_expected *= scale
        bowling_expected *= scale
        fielding_expected *= scale

    volatility = _population_standard_deviation(
        [b + w + f for b, w, f in zip(batting_values, bowling_values, fielding_values)],
        batting_expected + bowling_expected + fielding_expected,
    )
    risk_level = "High" if volatility >= 25 else "Medium" if volatility >= 12 else "Low"
    return (
        {"historical_batting_value": batting_expected},
        {"historical_bowling_value": bowling_expected},
        {"historical_fielding_value": fielding_expected},
        payload.player_match_rows[0].model_mode or "real_model",
        risk_level,
    )


def _batting_points(row) -> float:
    strike_rate = row.strike_rate if row.strike_rate is not None else _safe_divide(row.runs * 100, row.balls_faced)
    dismissal = -2 if row.was_out else 0
    strike_bonus = 4 if row.balls_faced >= 10 and strike_rate >= 150 else -4 if row.balls_faced >= 10 and strike_rate < 90 else 0
    return row.runs + row.fours + (2 * row.sixes) + dismissal + strike_bonus


def _bowling_points(row) -> float:
    economy_bonus = 0
    if row.overs_bowled >= 2 and row.economy is not None:
        economy_bonus = 6 if row.economy <= 6 else -4 if row.economy >= 10 else 0
    return (25 * row.wickets) + economy_bonus


def _fielding_points(row) -> float:
    return (8 * row.catches) + (12 * row.run_outs) + (12 * row.stumpings)


def _expected_breakdown(probabilities: dict[str, float], point_values: dict[str, float], events: list[str]) -> dict[str, float]:
    return {event: probabilities[event] * point_values[event] for event in events}


def _selection_label(expected_points: float, thresholds: dict[str, float]) -> str:
    if expected_points >= thresholds["must_pick_min"]:
        return "Must Pick"
    if expected_points >= thresholds["strong_pick_min"]:
        return "Strong Pick"
    if expected_points >= thresholds["risk_pick_min"]:
        return "Risk Pick"
    return "Avoid"


def _build_explanation(expected_points: float, label: str, thresholds: dict[str, float]) -> str:
    return (
        f"The expected fantasy points are {_round_float(expected_points, 2)}. "
        "This is a decision under uncertainty because every possible batting, bowling, and fielding event "
        "is weighted by its probability and point value before selection is judged. "
        f"Using thresholds must_pick_min={thresholds['must_pick_min']}, strong_pick_min={thresholds['strong_pick_min']}, "
        f"and risk_pick_min={thresholds['risk_pick_min']}, "
        f"the selection value label is {label}."
    )


def _mean(values: list[float]) -> float:
    return _safe_divide(sum(values), len(values))


def _median(values: list[float]) -> float:
    if not values:
        return 0.0
    values = sorted(values)
    middle = len(values) // 2
    if len(values) % 2:
        return values[middle]
    return (values[middle - 1] + values[middle]) / 2


def _population_standard_deviation(values: list[float], average: float) -> float:
    variance = _safe_divide(sum((value - average) ** 2 for value in values), len(values))
    return variance ** 0.5


def _slope(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    x_mean = (len(values) - 1) / 2
    y_mean = _mean(values)
    numerator = sum((index - x_mean) * (value - y_mean) for index, value in enumerate(values))
    denominator = sum((index - x_mean) ** 2 for index in range(len(values)))
    return _safe_divide(numerator, denominator)


def _safe_divide(numerator: float, denominator: float) -> float:
    if denominator == 0:
        return 0.0
    return numerator / denominator


def _round_float(value: float, decimals: int = 3) -> float:
    return round(float(value), decimals)
