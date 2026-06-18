import type { TransformerResult } from "@/lib/types";

// Neural opinion in the Mira pipeline: a DistilBERT transformer FINE-TUNED
// on the symptom->domain task (see notebooks/finetune_distilbert.ipynb), hosted
// on the Hugging Face Hub and run through Transformers.js (ONNX runtime, in
// process Node).
//
// It classifies the intake note into the same 7 clinical domains as the
// from-scratch TF-IDF + logistic regression model, so the two can be compared
// head to head on the results page. Reported held-out test accuracy ~99.5%.

const MODEL_ID = "jaydeep123423/mira-symptom-domain";
const FINETUNE_ACCURACY = 0.995; // held-out test accuracy from the Colab run
const FINETUNE_MACRO_F1 = 0.994;

type ClsOutput = Array<{ label: string; score: number }>;
type Classifier = (text: string, options?: Record<string, unknown>) => Promise<ClsOutput>;

let classifierPromise: Promise<Classifier> | null = null;

// The transformer library (and its native ONNX runtime) is imported lazily so a
// load failure in production degrades gracefully instead of taking down the
// whole analyze route at module-evaluation time. The Hub model (~64MB quantized)
// is pulled on first use and cached on disk for later requests.
function getClassifier(): Promise<Classifier> {
  if (!classifierPromise) {
    classifierPromise = (async () => {
      const { env, pipeline } = await import("@huggingface/transformers");
      env.allowRemoteModels = true;
      env.allowLocalModels = false;
      return pipeline("text-classification", MODEL_ID, {
        dtype: "q8"
      }) as unknown as Classifier;
    })();
  }
  return classifierPromise;
}

function readable(label: string): string {
  return label
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function classifyWithTransformer(text: string): Promise<TransformerResult | null> {
  const trimmed = text.trim();
  if (trimmed.length < 8) return null;

  try {
    const classifier = await getClassifier();
    const out = await classifier(trimmed, { top_k: 7 });
    const ranked = (Array.isArray(out) ? out : [out])
      .map((r) => ({ label: readable(r.label), score: r.score }))
      .sort((a, b) => b.score - a.score);
    if (ranked.length === 0) return null;

    return {
      modelName: "DistilBERT (fine-tuned)",
      modelId: MODEL_ID,
      topDomain: ranked[0].label,
      domainConfidence: ranked[0].score,
      domainLabels: ranked.slice(0, 4),
      accuracy: FINETUNE_ACCURACY,
      macroF1: FINETUNE_MACRO_F1
    };
  } catch {
    // If the model can't load, the rest of the pipeline still works; the
    // results page just omits the neural comparison.
    classifierPromise = null;
    return null;
  }
}
