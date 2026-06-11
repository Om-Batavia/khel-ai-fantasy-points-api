from datetime import date
from typing import Any, Optional

from pydantic import BaseModel, Field


class PlayerInfo(BaseModel):
    player_id: Optional[str] = None
    player_name: Optional[str] = None
    role: Optional[str] = Field(default="all_rounder")


class BattingEventProbabilities(BaseModel):
    run_0: float = Field(..., ge=0, le=1)
    run_1: float = Field(..., ge=0, le=1)
    run_2: float = Field(..., ge=0, le=1)
    run_3: float = Field(..., ge=0, le=1)
    four: float = Field(..., ge=0, le=1)
    six: float = Field(..., ge=0, le=1)
    dismissal: float = Field(..., ge=0, le=1)


class BowlingEventProbabilities(BaseModel):
    dot_ball: float = Field(..., ge=0, le=1)
    wicket: float = Field(..., ge=0, le=1)
    maiden_over: float = Field(..., ge=0, le=1)
    economy_bonus: float = Field(..., ge=0, le=1)


class FieldingEventProbabilities(BaseModel):
    catch: float = Field(..., ge=0, le=1)
    run_out: float = Field(..., ge=0, le=1)
    stumping: float = Field(..., ge=0, le=1)


class EventPointValues(BaseModel):
    run_0: float = 0
    run_1: float = 1
    run_2: float = 2
    run_3: float = 3
    four: float = 5
    six: float = 8
    dismissal: float = -2
    dot_ball: float = 1
    wicket: float = 25
    maiden_over: float = 12
    economy_bonus: float = 6
    catch: float = 8
    run_out: float = 12
    stumping: float = 12


class SelectionThresholds(BaseModel):
    must_pick_min: float = 60
    strong_pick_min: float = 40
    risk_pick_min: float = 20


class PlayerMatchRecord(BaseModel):
    match_id: Optional[str] = None
    player_id: Optional[str] = None
    player_name: str
    team_id: Optional[str] = None
    team_name: Optional[str] = None
    opponent_team_id: Optional[str] = None
    opponent_team_name: Optional[str] = None
    match_date: date
    venue: Optional[str] = None
    role: Optional[str] = None
    batting_position: Optional[int] = None
    runs: int = Field(default=0, ge=0)
    balls_faced: int = Field(default=0, ge=0)
    strike_rate: Optional[float] = Field(default=None, ge=0)
    fours: int = Field(default=0, ge=0)
    sixes: int = Field(default=0, ge=0)
    was_out: bool = False
    wickets: int = Field(default=0, ge=0)
    overs_bowled: float = Field(default=0, ge=0)
    runs_conceded: int = Field(default=0, ge=0)
    economy: Optional[float] = Field(default=None, ge=0)
    catches: int = Field(default=0, ge=0)
    run_outs: int = Field(default=0, ge=0)
    stumpings: int = Field(default=0, ge=0)
    match_result: Optional[str] = None
    fantasy_points: Optional[float] = Field(default=None, ge=0)
    model_mode: Optional[str] = None


class PressureConfidenceRecord(BaseModel):
    match_id: Optional[str] = None
    match_date: date
    opponent_team_id: Optional[str] = None
    opponent_team_name: Optional[str] = None
    over_number: Optional[int] = Field(default=None, ge=0)
    sample_balls: int = Field(default=0, ge=0)
    avg_pressure: float = Field(..., ge=0, le=1)
    avg_confidence: float = Field(..., ge=0, le=1)
    opening_confidence: Optional[float] = Field(default=None, ge=0, le=1)
    closing_confidence: Optional[float] = Field(default=None, ge=0, le=1)
    confidence_change: float = Field(default=0, ge=-1, le=1)
    confidence_slope: float = Field(default=0, ge=-1, le=1)
    avg_control: float = Field(default=0, ge=0, le=1)
    high_pressure_control: float = Field(default=0, ge=0, le=1)
    pressure_resilience: float = Field(default=0, ge=0, le=1)
    dot_recovery_rate: float = Field(default=0, ge=0, le=1)
    model_mode: Optional[str] = None


class ExpectedFantasyFinalRequest(BaseModel):
    player: PlayerInfo = Field(default_factory=PlayerInfo)
    opponent_team_id: Optional[str] = None
    opponent_team_name: Optional[str] = None
    venue: Optional[str] = None
    target_match_date: Optional[date] = None
    adjusted_posterior: Optional[float] = Field(default=None, ge=0)
    player_match_rows: Optional[list[PlayerMatchRecord]] = Field(default=None, min_length=3)
    pressure_confidence_rows: Optional[list[PressureConfidenceRecord]] = Field(default=None, min_length=1)
    form_trend_score: Optional[float] = Field(default=None, ge=0, le=100)
    opponent_posterior: Optional[float] = Field(default=None, ge=0)
    batting_event_probabilities: Optional[BattingEventProbabilities] = None
    bowling_event_probabilities: Optional[BowlingEventProbabilities] = None
    fielding_event_probabilities: Optional[FieldingEventProbabilities] = None
    event_point_values: EventPointValues = Field(default_factory=EventPointValues)
    selection_thresholds: SelectionThresholds = Field(default_factory=SelectionThresholds)


class ComponentBreakdown(BaseModel):
    batting_expected_points: float
    bowling_expected_points: float
    fielding_expected_points: float
    event_breakdown: dict[str, float]


class DerivedVariablesUsed(BaseModel):
    batting_event_probabilities: dict[str, float]
    bowling_event_probabilities: dict[str, float]
    fielding_event_probabilities: dict[str, float]
    event_point_values: dict[str, float]
    selection_thresholds: dict[str, float]


class ExpectedFantasyFinalResponse(BaseModel):
    metric: str
    label: str
    expected_fantasy_points: float
    final_prediction: float
    supervised_ml_prediction: Optional[float] = None
    ml_prediction_valid: bool
    fallback_used: bool
    fallback_reason: Optional[str] = None
    model_source: str
    best_model_name: Optional[str] = None
    risk_level: Optional[str] = None
    interpretation_summary: str
    selection_value_label: str
    component_breakdown: ComponentBreakdown
    derived_variables_used: DerivedVariablesUsed
    explanation: str
    supporting_values: dict[str, Any]
    player_id: Optional[str]
    player_name: Optional[str]


class FantasyPointFeatures(BaseModel):
    career_avg_before_match: float
    recent_2_avg_before_match: float
    recent_3_avg_before_match: float
    recent_5_avg_before_match: float
    prior_match_count: float = Field(..., ge=1)
    days_since_last_match: float = Field(..., ge=0)
    historical_balls_faced_avg_before_match: float = Field(..., ge=0)
    historical_overs_bowled_avg_before_match: float = Field(..., ge=0)
    historical_runs_avg_before_match: float = Field(..., ge=0)
    historical_wickets_avg_before_match: float = Field(..., ge=0)
    bayesian_posterior_before_match: float
    adjusted_posterior_before_match: float
    is_batter: float = Field(..., ge=0, le=1)
    is_bowler: float = Field(..., ge=0, le=1)
    is_allrounder: float = Field(..., ge=0, le=1)
    is_wicketkeeper: float = Field(..., ge=0, le=1)
    historical_avg_pressure_faced: float = Field(..., ge=0, le=1)
    historical_avg_confidence: float = Field(..., ge=0, le=1)
    historical_confidence_slope: float = Field(..., ge=-1, le=1)
    historical_high_pressure_control: float = Field(..., ge=0, le=1)
    historical_pressure_resilience: float = Field(..., ge=0, le=1)
    historical_dot_recovery_rate: float = Field(..., ge=0, le=1)


class FantasyPredictionResponse(BaseModel):
    predicted_fantasy_points: float
    prediction_unit: str
    model_name: str
    model_version: str
    model_mode: str
    feature_count: int
    warning: str


class BatchPredictionRequest(BaseModel):
    rows: list[FantasyPointFeatures] = Field(..., min_length=1, max_length=100)


class BatchPredictionResponse(BaseModel):
    predictions: list[FantasyPredictionResponse]
    count: int
