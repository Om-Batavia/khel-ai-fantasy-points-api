import json
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from api.main import app
from api.model_loader import load_model_bundle
from api.schemas import PredictionInput


class StandaloneApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.model_dir = Path("api/model")
        cls.sample = json.loads((cls.model_dir / "sample_input.json").read_text(encoding="utf-8"))

    def test_root(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["student_name"], "Student 5")

    def test_health(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["model_loaded"])

    def test_model_info(self):
        response = self.client.get("/model-info")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["target_variable"], "fantasy_points")
        self.assertEqual(len(response.json()["feature_columns"]), 22)
        self.assertIn("mae", response.json()["metrics"]["test"])

    def test_predict_response_contract(self):
        response = self.client.post("/predict", json=self.sample)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["prediction"], 47.35)
        self.assertEqual(body["prediction_label"], "Moderate Fantasy Potential")
        self.assertEqual(body["features_used"], load_model_bundle()["feature_columns"])
        self.assertIn("cricket", body["explanation"].lower())

    def test_predict_batch(self):
        response = self.client.post("/predict-batch", json={"rows": [self.sample, self.sample]})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 2)

    def test_missing_invalid_and_extra_fields_are_rejected(self):
        missing = dict(self.sample)
        missing.pop("career_avg_before_match")
        self.assertEqual(self.client.post("/predict", json=missing).status_code, 422)

        invalid = dict(self.sample)
        invalid["historical_avg_confidence"] = "high"
        self.assertEqual(self.client.post("/predict", json=invalid).status_code, 422)

        extra = dict(self.sample)
        extra["runs"] = 100
        self.assertEqual(self.client.post("/predict", json=extra).status_code, 422)

    def test_schema_matches_feature_file(self):
        self.assertEqual(list(PredictionInput.model_fields), load_model_bundle()["feature_columns"])

    def test_required_structure(self):
        for path in (
            "api/main.py",
            "api/model_loader.py",
            "api/schemas.py",
            "api/requirements.txt",
            "api/README.md",
            "api/model/model.pkl",
            "api/model/feature_columns.json",
            "api/model/metrics.json",
            "api/model/sample_input.json",
        ):
            self.assertTrue(Path(path).exists(), path)


if __name__ == "__main__":
    unittest.main()
