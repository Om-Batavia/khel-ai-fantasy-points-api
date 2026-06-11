# API Package

This folder is the standalone deployment unit required by the sprint.

```text
api/
  main.py
  model_loader.py
  schemas.py
  requirements.txt
  README.md
  model/
    model.pkl
    feature_columns.json
    metrics.json
    sample_input.json
```

Run from the repository root:

```bash
pip install -r api/requirements.txt
uvicorn api.main:app --reload
```

Open `http://127.0.0.1:8000/docs`.

The model is loaded once through an `lru_cache`. Request handlers call only
`predict()`. Training remains in `model_training/train_model.py` and is never
executed by the API.
