from pydantic import BaseModel, ConfigDict, Field


class PredictionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    career_avg_before_match: float = Field(..., ge=0, le=250)
    recent_2_avg_before_match: float = Field(..., ge=0, le=250)
    recent_3_avg_before_match: float = Field(..., ge=0, le=250)
    recent_5_avg_before_match: float = Field(..., ge=0, le=250)
    prior_match_count: float = Field(..., ge=1, le=1000)
    days_since_last_match: float = Field(..., ge=0, le=3650)
    historical_balls_faced_avg_before_match: float = Field(..., ge=0, le=120)
    historical_overs_bowled_avg_before_match: float = Field(..., ge=0, le=20)
    historical_runs_avg_before_match: float = Field(..., ge=0, le=200)
    historical_wickets_avg_before_match: float = Field(..., ge=0, le=10)
    bayesian_posterior_before_match: float = Field(..., ge=0, le=250)
    adjusted_posterior_before_match: float = Field(..., ge=0, le=250)
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


class PredictionResponse(BaseModel):
    prediction: float
    prediction_label: str
    model_name: str
    model_version: str
    features_used: list[str]
    confidence_note: str
    explanation: str
    model_mode: str


class BatchPredictionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rows: list[PredictionInput] = Field(..., min_length=1, max_length=100)


class BatchPredictionResponse(BaseModel):
    predictions: list[PredictionResponse]
    count: int
