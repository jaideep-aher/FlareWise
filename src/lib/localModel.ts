import model from "@/lib/ml/model.json";
import type { LocalModelResult } from "@/lib/types";

type LRHead = {
  task: string;
  labels: string[];
  bias: Record<string, number>;
  weights: Record<string, Record<string, number>>;
  metrics: {
    train: { accuracy: number; total: number };
    test: { accuracy: number; total: number };
    intake?: { accuracy: number; total: number };
  };
};

type ModelArtifact = {
  name: string;
  modelType: string;
  sourceDataset: string;
  sourceUrl: string;
  vocabulary: string[];
  idf: Record<string, number>;
  models: { domain: LRHead; priority: LRHead };
};

const ARTIFACT = model as unknown as ModelArtifact;
const VOCAB_SET = new Set(ARTIFACT.vocabulary);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && token.length < 24);
}

function featurize(text: string): string[] {
  const tokens = tokenize(text);
  const grams = [...tokens];
  for (let i = 0; i < tokens.length - 1; i += 1) {
    grams.push(`${tokens[i]}_${tokens[i + 1]}`);
  }
  return grams;
}

function tfidfVector(text: string): Map<string, number> {
  const grams = featurize(text);
  const tf = new Map<string, number>();
  for (const gram of grams) {
    if (!VOCAB_SET.has(gram)) continue;
    tf.set(gram, (tf.get(gram) || 0) + 1);
  }
  const total = grams.length || 1;
  const vector = new Map<string, number>();
  let sumSq = 0;
  for (const [gram, count] of tf) {
    const value = (count / total) * ARTIFACT.idf[gram];
    vector.set(gram, value);
    sumSq += value * value;
  }
  const norm = Math.sqrt(sumSq) || 1;
  for (const [gram, value] of vector) vector.set(gram, value / norm);
  return vector;
}

function softmax(scores: number[]): number[] {
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - max));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / total);
}

type Prediction = { label: string; confidence: number };

function predictSentence(head: LRHead, sentence: string): Prediction[] {
  const features = tfidfVector(sentence);
  const scores = head.labels.map((label) => {
    let s = head.bias[label] || 0;
    const w = head.weights[label] || {};
    for (const [gram, value] of features) {
      const wv = w[gram];
      if (wv !== undefined) s += wv * value;
    }
    return s;
  });
  const probs = softmax(scores);
  return head.labels
    .map((label, i) => ({ label, confidence: probs[i] }))
    .sort((a, b) => b.confidence - a.confidence);
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function readableLabel(label: string): string {
  if (label === "no_clear_domain") return "No clear domain";
  return label
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function aggregate(
  head: LRHead,
  sentences: string[],
  nullClass: string | null
): { ranking: Prediction[]; signalSentences: number } {
  const totals: Record<string, number> = {};
  let signalSentences = 0;

  for (const sentence of sentences) {
    if (tokenize(sentence).length < 2) continue;
    const top = predictSentence(head, sentence)[0];
    if (!top) continue;
    if (nullClass && top.label === nullClass && top.confidence > 0.4) continue;
    totals[top.label] = (totals[top.label] || 0) + top.confidence;
    signalSentences += 1;
  }
  if (signalSentences === 0) {
    return {
      ranking: head.labels.map((label) => ({
        label,
        confidence: label === nullClass ? 1 : 0
      })),
      signalSentences: 0
    };
  }

  const sum = Object.values(totals).reduce((a, b) => a + b, 0);
  const ranking = head.labels
    .map((label) => ({ label, confidence: (totals[label] || 0) / sum }))
    .sort((a, b) => b.confidence - a.confidence);
  return { ranking, signalSentences };
}

const MIN_IN_VOCAB_TOKENS = 4;
const MIN_CONFIDENCE_MARGIN = 0.15;

function vocabCoverage(text: string) {
  const all = featurize(text);
  const inVocab = all.filter((token) => VOCAB_SET.has(token));
  return { totalTokens: all.length, inVocabTokens: inVocab.length };
}

function decide(
  ranking: Prediction[],
  sufficient: boolean,
  signalSentences: number,
  nullClass: string | null
): { label: string; confidence: number } {
  if (signalSentences === 0 && nullClass) {
    return { label: readableLabel(nullClass), confidence: 1 };
  }
  if (!sufficient) {
    return { label: "Insufficient signal", confidence: 0 };
  }
  const top = ranking[0];
  const second = ranking[1]?.confidence ?? 0;
  if (top.confidence - second < MIN_CONFIDENCE_MARGIN) {
    return { label: "Mixed signal", confidence: top.confidence };
  }
  return { label: readableLabel(top.label), confidence: top.confidence };
}

export function classifyWithLocalModel(text: string): LocalModelResult {
  const sentences = splitSentences(text);
  const coverage = vocabCoverage(text);
  const sufficient = coverage.inVocabTokens >= MIN_IN_VOCAB_TOKENS;

  const domain = aggregate(ARTIFACT.models.domain, sentences, "no_clear_domain");
  const priority = aggregate(ARTIFACT.models.priority, sentences, null);

  const domainDecision = decide(
    domain.ranking,
    sufficient,
    domain.signalSentences,
    "no_clear_domain"
  );
  const priorityDecision = decide(priority.ranking, sufficient, priority.signalSentences, null);
  const reportedAccuracy =
    ARTIFACT.models.domain.metrics.intake?.accuracy ??
    ARTIFACT.models.domain.metrics.test.accuracy;

  return {
    modelName: ARTIFACT.name,
    modelType: ARTIFACT.modelType,
    task: `${ARTIFACT.models.domain.task}; ${ARTIFACT.models.priority.task}`,
    sourceDataset: ARTIFACT.sourceDataset,
    sourceUrl: ARTIFACT.sourceUrl,
    topDomain: domainDecision.label,
    confidence: domainDecision.confidence,
    topPredictions: domain.ranking.slice(0, 4).map((prediction) => ({
      domain: readableLabel(prediction.label),
      confidence: prediction.confidence
    })),
    priority: priorityDecision.label,
    priorityConfidence: priorityDecision.confidence,
    priorityPredictions: priority.ranking.slice(0, 3).map((prediction) => ({
      priority: readableLabel(prediction.label),
      confidence: prediction.confidence
    })),
    coverage: { ...coverage, sufficient },
    testAccuracy: reportedAccuracy,
    priorityTestAccuracy: ARTIFACT.models.priority.metrics.test.accuracy,
    trainingRows: ARTIFACT.models.domain.metrics.train.total,
    testRows: ARTIFACT.models.domain.metrics.test.total
  };
}
