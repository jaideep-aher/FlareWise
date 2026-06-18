import type {
  AgreementReport,
  LocalModelResult,
  MethodOpinion,
  TransformerResult
} from "@/lib/types";

// Compares the two TRAINED models on the symptom-area (domain) task:
//   1. the from-scratch TF-IDF + logistic regression classifier (classical ML), and
//   2. a fine-tuned DistilBERT transformer (neural).
//
// Both were trained on the same 7-domain task, so this is a genuine head-to-head.
// When they disagree we surface it - a split between a classical and a neural
// model on the same input is exactly the kind of limitation the evaluation is
// meant to expose, and it tells the reader to treat that note's domain with care.

const NON_COMMITTAL = new Set([
  "mixed signal",
  "insufficient signal",
  "no clear domain"
]);

function normalize(label: string): string {
  return label.trim().toLowerCase();
}

export function compareDomains(
  localModel: LocalModelResult,
  transformer: TransformerResult | null
): AgreementReport | null {
  if (!transformer) return null;

  const classicalDomain = localModel.topDomain;
  const neuralDomain = transformer.topDomain;

  const opinions: MethodOpinion[] = [
    {
      method: "TF-IDF + logistic regression",
      kind: "classical",
      verdict: classicalDomain,
      detail: `Confidence ${Math.round(localModel.confidence * 100)}%`
    },
    {
      method: "DistilBERT (fine-tuned)",
      kind: "transformer",
      verdict: neuralDomain,
      detail: `Confidence ${Math.round(transformer.domainConfidence * 100)}%`
    }
  ];

  // If the classical model is non-committal (meta-only or mixed note), an
  // agree/disagree verdict isn't meaningful.
  if (NON_COMMITTAL.has(normalize(classicalDomain))) {
    return {
      opinions,
      agree: true,
      note: `The classical model did not commit to a single domain (${classicalDomain}), so there is nothing firm to compare against. The fine-tuned model leaned toward ${neuralDomain}.`
    };
  }

  const agree = normalize(classicalDomain) === normalize(neuralDomain);
  const note = agree
    ? `Both trained models independently classified the symptom area as ${classicalDomain}, which raises confidence in that read.`
    : `The classical model read this as ${classicalDomain} while the fine-tuned transformer read it as ${neuralDomain}. A split between the two models means this note's domain is ambiguous and worth a human glance.`;

  return { opinions, agree, note };
}
