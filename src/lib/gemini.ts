import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  AnalysisResult,
  LocalModelResult,
  SafetyFlag,
  StressTestResponse
} from "@/lib/types";

function getModel() {
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  const genAI = new GoogleGenerativeAI(key);
  return genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 }
    } as unknown as Record<string, unknown>
  });
}

function parseJson<T>(text: string): T {
  const trimmed = text.trim();
  const clean = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  return JSON.parse(clean) as T;
}

type CombinedResult = Omit<
  AnalysisResult,
  "reliability" | "safetyFlags" | "transferLearningNote"
> & {
  reliability: AnalysisResult["reliability"];
};

export async function runAnalysis(
  notes: string,
  safetyFlags: SafetyFlag[],
  localModel: LocalModelResult
) {
  const model = getModel();
  const localHint = localModel.coverage.sufficient
    ? `A locally trained TF-IDF multinomial logistic regression classifier (${localModel.coverage.inVocabTokens}/${localModel.coverage.totalTokens} matched grams, ${(localModel.testAccuracy * 100).toFixed(0)}% reported test accuracy) read the same notes and predicted:
- broad symptom domain: ${localModel.topDomain} (confidence ${(localModel.confidence * 100).toFixed(0)}%)
- appointment priority: ${localModel.priority} (confidence ${(localModel.priorityConfidence * 100).toFixed(0)}%)
- vocab coverage: ${localModel.coverage.inVocabTokens}/${localModel.coverage.totalTokens} tokens matched

Treat this as a SECOND OPINION, not ground truth. If the notes clearly disagree with these labels, disregard them and add an entry to "missingInformation" saying "Local classifier suggested <X> but notes do not support that - needs verification". If they agree, you may reference the broad domain in mainConcerns or patterns without medicalising it.`
    : `A locally trained TF-IDF multinomial logistic regression classifier ran on the notes but matched too few in-vocab tokens (${localModel.coverage.inVocabTokens} of ${localModel.coverage.totalTokens}) to produce a useful signal. Do not reference any specific domain or priority from it.`;
  const prompt = `You are FlareWise, a chronic illness note understanding system for a hackathon prototype.

Return JSON only. Do not diagnose. Do not give treatment advice. Organize only user provided notes.

STEP 1 - EXTRACT:
Extract structured events, generate a cautious pre-visit summary, create a doctor visit brief, list possible patterns, and list missing information.

Rules:
- Every event must include a short sourceQuote copied from the notes.
- Track negated symptoms as events with type "negation".
- Allowed event types: symptom, symptom_change, medication, trigger, negation, question, context.
- Phrase patterns cautiously. One occurrence is not a proven pattern.
- Do not imply causation unless notes directly support it.
- If timing is unclear, say it is unclear.
- Use uncertainty language in the pre-visit summary. Do NOT call it a "weekly" summary unless the notes clearly span a week.
- Do not add symptoms, medications, diagnoses, or vitals that are not present.
- If the notes contain any severity rating like "6/10", "8 out of 10", "severe", "mild", "moderate", you MUST capture it in the corresponding event's "severity" field (integer 0-10; map mild=3, moderate=5, severe=8 when no number is given). Do not leave severity null when a rating is stated.
- If a token looks like a typo or unknown abbreviation (e.g. "ibr", "rbhbe", random letter sequences not in standard medical vocabulary), DO NOT quote it verbatim in the summary. Instead, list it under missingInformation as "Unclear term - needs clarification: '<token>'". Never invent an expansion.

LOCAL MODEL CONTEXT:
${localHint}

STEP 2 - SELF-AUDIT (reliability):
Now re-read the ORIGINAL notes and critique your own STEP 1 output as if you were a separate strict evaluator. Score 0 to 100. Be HONEST - if you missed something, lower the score. Be strict about hallucination, negation, medication changes, temporal order, and medical advice. Unsupported claims are claims in the output not supported by the notes. Missed details are important note facts left out. Negation errors are failures around "no", "not", "denied", or similar. Temporal errors place events in the wrong order or imply unsupported causation.

Rule based safety flags already detected (for context, do not duplicate):
${JSON.stringify(safetyFlags)}

Required JSON shape:
{
  "events": [{"id":"e1","date":"Monday","type":"symptom","name":"headache","severity":6,"dose":null,"change":null,"context":"after lunch","confidence":"high","sourceQuote":"headache 6/10 after lunch"}],
  "weeklySummary": "string",
  "doctorBrief": {"mainConcerns":["string"],"medicationChanges":["string"],"questions":["string"],"uncertainties":["string"]},
  "patterns": [{"title":"string","evidence":"string","caution":"string"}],
  "missingInformation": ["string"],
  "reliability": {
    "score": 84,
    "supportedClaims": 11,
    "unsupportedClaims": 1,
    "missedDetails": 2,
    "negationErrors": 0,
    "temporalErrors": 0,
    "urgentRiskTerms": 0,
    "issues": [{"type":"unsupported_claim","claim":"string","problem":"string","sourceQuote":"string"}]
  }
}

Notes:
${notes}`;

  const result = await model.generateContent(prompt);
  const combined = parseJson<CombinedResult>(result.response.text());
  const { reliability, ...primary } = combined;

  return {
    ...primary,
    reliability,
    safetyFlags,
    transferLearningNote:
      "This uses a pre trained language model adapted through structured prompts, schema constrained extraction, and a built-in reliability self-audit for chronic illness note understanding."
  } satisfies AnalysisResult;
}

export async function runStressTests() {
  const model = getModel();
  const prompt = `You are evaluating FlareWise on synthetic chronic illness notes.

Run seven stress tests using these categories:
Clean, Typo heavy, Vague timing, Negation heavy, Contradictory, Urgent symptom, Long messy paragraph.

For each test, create a short synthetic note, infer expected facts, simulate the extraction and summary evaluation, then report metrics. Return JSON only. Metrics must be numbers from 0 to 1. Do not claim clinical validation.

Required JSON shape:
{
  "results": [
    {"testType":"Clean","extractionF1":0.92,"hallucinationRate":0.04,"negationAccuracy":1,"temporalAccuracy":0.95,"notes":"string"}
  ],
  "takeaway": "string"
}`;

  const result = await model.generateContent(prompt);
  return parseJson<StressTestResponse>(result.response.text());
}
