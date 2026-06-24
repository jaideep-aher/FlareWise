# Models

This project ships three modeling approaches. Here is where each one lives.

## Naive baseline

The majority-class and random-by-prior baselines are computed at evaluation time, not stored as a file. See `scripts/evaluate-models.mjs` and the results in `data/outputs/model_comparison.json`.

## Classical model

TF-IDF multinomial logistic regression, trained from scratch in JavaScript. The trained artifact is committed at `src/lib/ml/model.json`. Retrain it with `npm run train:local-nlp`.

## Deep learning model

DistilBERT fine-tuned on the symptom corpus, exported to ONNX for in-browser inference through Transformers.js.

- The deployed weights are the quantized export at `distilbert-symptom-domain/onnx/model_quantized.onnx`, committed here along with the tokenizer and config files.
- The same model is mirrored on the Hugging Face Hub at `jaydeep123423/mira-symptom-domain`, which is what the running app loads at runtime (`src/lib/transformerModel.ts`).
- The full precision `model.onnx` (256MB) is not committed because it exceeds the GitHub file limit and the app only uses the quantized version. It is reproducible from `notebooks/finetune_distilbert.ipynb`.
