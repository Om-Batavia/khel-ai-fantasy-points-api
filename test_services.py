import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app
from schemas import ExpectedFantasyFinalRequest, FantasyPointFeatures
from services import calculate_expected_fantasy_final, load_api_model_bundle, predict_fantasy_points


class UnrealisticModel:
    def predict(self, rows):
        return [4671.25 for _ in rows]


class ExpectedFantasyFinalTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        with open("model_training/sample_input.json", encoding="utf-8") as handle:
            cls.sample_input = json.load(handle)

    def test_dataset_backed_payload_reports_risk_and_selection(self):
        with open("sample_player_match_payload.json", encoding="utf-8") as handle:
            payload = ExpectedFantasyFinalRequest(**json.load(handle))

        with tempfile.TemporaryDirectory() as empty_model_dir:
            previous_model_dir = os.environ.get("MATCHIQ_MODEL_DIR")
            os.environ["MATCHIQ_MODEL_DIR"] = empty_model_dir
            try:
                response = calculate_expected_fantasy_final(payload)
            finally:
                if previous_model_dir is None:
                    os.environ.pop("MATCHIQ_MODEL_DIR", None)
                else:
                    os.environ["MATCHIQ_MODEL_DIR"] = previous_model_dir

        self.assertEqual(response.supporting_values["model_mode"], "real_model")
        self.assertEqual(response.model_source, "bayesian_statistical_fallback")
        self.assertIsNone(response.supervised_ml_prediction)
        self.assertFalse(response.ml_prediction_valid)
        self.assertTrue(response.fallback_used)
        self.assertEqual(response.final_prediction, response.expected_fantasy_points)
        self.assertIn("Bayesian/statistical fallback", response.interpretation_summary)
        self.assertEqual(response.selection_value_label, "Must Pick")
        self.assertIn("risk_level", response.supporting_values)

    def test_unrealistic_ml_prediction_uses_statistical_fallback(self):
        with open("sample_player_match_payload.json", encoding="utf-8") as handle:
            payload = ExpectedFantasyFinalRequest(**json.load(handle))
        real_model_dir = Path(__file__).resolve().parents[2] / "models"
        previous_model_dir = os.environ.get("MATCHIQ_MODEL_DIR")
        os.environ["MATCHIQ_MODEL_DIR"] = str(real_model_dir)
        try:
            with patch("joblib.load", return_value=UnrealisticModel()):
                response = calculate_expected_fantasy_final(payload)
        finally:
            if previous_model_dir is None:
                os.environ.pop("MATCHIQ_MODEL_DIR", None)
            else:
                os.environ["MATCHIQ_MODEL_DIR"] = previous_model_dir

        self.assertFalse(response.ml_prediction_valid)
        self.assertTrue(response.fallback_used)
        self.assertIsNone(response.supervised_ml_prediction)
        self.assertEqual(response.final_prediction, response.expected_fantasy_points)
        self.assertIn("outside realistic range", response.fallback_reason)

    def test_demo_model_rejects_massively_out_of_range_match_gap(self):
        with open("sample_player_match_payload.json", encoding="utf-8") as handle:
            raw_payload = json.load(handle)
        for row in raw_payload["player_match_rows"]:
            row["model_mode"] = "demo_only"
        payload = ExpectedFantasyFinalRequest(**raw_payload)

        response = calculate_expected_fantasy_final(payload)

        self.assertFalse(response.ml_prediction_valid)
        self.assertTrue(response.fallback_used)
        self.assertIsNone(response.supervised_ml_prediction)
        self.assertEqual(response.final_prediction, response.expected_fantasy_points)
        self.assertIn("days_since_last_match", response.fallback_reason)
        self.assertIn("training range", response.fallback_reason)

    def test_health_confirms_packaged_pickle(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["model_loaded"])
        self.assertEqual(response.json()["feature_count"], 22)

    def test_predict_uses_exact_training_features(self):
        bundle = load_api_model_bundle()
        self.assertEqual(list(FantasyPointFeatures.model_fields), bundle["feature_columns"])
        response = self.client.post("/predict", json=self.sample_input)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["model_name"], "linear_regression")
        self.assertEqual(response.json()["model_mode"], "demo_only")
        self.assertGreaterEqual(response.json()["predicted_fantasy_points"], 0)

    def test_batch_prediction(self):
        response = self.client.post("/predict/batch", json={"rows": [self.sample_input, self.sample_input]})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 2)

    def test_invalid_pressure_rate_is_rejected(self):
        invalid = dict(self.sample_input)
        invalid["historical_avg_confidence"] = 1.5
        response = self.client.post("/predict", json=invalid)
        self.assertEqual(response.status_code, 422)

    def test_required_submission_artifacts_exist(self):
        base = Path("model_training")
        for filename in (
            "train_model.py",
            "model.pkl",
            "feature_columns.json",
            "metrics.json",
            "sample_input.json",
            "README.md",
        ):
            self.assertTrue((base / filename).exists(), filename)

    def test_prediction_warning_marks_synthetic_data(self):
        response = predict_fantasy_points(FantasyPointFeatures(**self.sample_input))
        self.assertIn("Synthetic demo model", response.warning)


if __name__ == "__main__":
    unittest.main()
