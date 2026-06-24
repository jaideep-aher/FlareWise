
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const datasetUrl =
  "https://datasets-server.huggingface.co/rows?dataset=gretelai%2Fsymptom_to_diagnosis&config=default";

const labelsToDomain = {
  allergy: "respiratory_or_immune",
  arthritis: "musculoskeletal",
  "bronchial asthma": "respiratory_or_immune",
  "cervical spondylosis": "musculoskeletal",
  "chicken pox": "infection_or_fever",
  "common cold": "respiratory_or_immune",
  dengue: "infection_or_fever",
  diabetes: "metabolic_or_systemic",
  "dimorphic hemorrhoids": "gastrointestinal_or_urinary",
  "drug reaction": "skin_or_medication_reaction",
  "fungal infection": "skin_or_medication_reaction",
  "gastroesophageal reflux disease": "gastrointestinal_or_urinary",
  hypertension: "cardiovascular_or_neurologic",
  impetigo: "skin_or_medication_reaction",
  jaundice: "metabolic_or_systemic",
  malaria: "infection_or_fever",
  migraine: "cardiovascular_or_neurologic",
  "peptic ulcer disease": "gastrointestinal_or_urinary",
  pneumonia: "respiratory_or_immune",
  psoriasis: "skin_or_medication_reaction",
  typhoid: "infection_or_fever",
  "urinary tract infection": "gastrointestinal_or_urinary",
  "varicose veins": "cardiovascular_or_neurologic"
};

async function fetchRows(split) {
  const rows = [];
  for (let offset = 0; offset < 5000; offset += 100) {
    const url = `${datasetUrl}&split=${split}&offset=${offset}&length=100`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Dataset fetch failed: ${response.status}`);
    const payload = await response.json();
    if (!payload.rows?.length) break;
    for (const item of payload.rows) {
      rows.push({
        input: item.row.input_text,
        rawLabel: item.row.output_text,
        label: labelsToDomain[item.row.output_text] || "other"
      });
    }
  }
  return rows;
}
const INTAKE_META_TEMPLATES = [
  "I have tried {drug} for the pain.",
  "{drug} has been the only thing I tried so far.",
  "Took {drug} {amount} times this week.",
  "Started taking {drug} a few days ago.",
  "The doctor prescribed {drug} last visit.",
  "My doctor changed my medication last month.",
  "Last visit the doctor told me to come back if it got worse.",
  "I have an appointment with my primary care doctor next week.",
  "I tried rest and drinking more water.",
  "Tried staying hydrated and getting more sleep.",
  "Used a heating pad at home.",
  "No previous doctor visit for this.",
  "I have not seen a specialist about this yet.",
  "It started about {n} days ago.",
  "Started roughly {n} weeks back.",
  "About {n} months ago I noticed it first.",
  "It comes and goes, but mostly in the morning.",
  "Things got worse after a stressful week at work.",
  "I think stress might be a trigger.",
  "Honestly not sure what triggers it.",
  "I am not sure when exactly it started.",
  "I cannot remember the exact date.",
  "Severity is about {sev} out of 10.",
  "The pain is around {sev} on a 10 scale.",
  "Some days are better than others.",
  "Hard to focus at work because of this.",
  "It is affecting my sleep.",
  "I want to know if I need a specialist.",
  "I want to understand what is going on.",
  "I want a treatment plan that actually works.",
  "Wondering if I should change my prescription.",
  "Is this something I should worry about?",
  "What lifestyle changes would help?",
  "Should I get any tests done?",
  "I bought over the counter pain relief at the pharmacy.",
  "Used a humidifier last night.",
  "Took the day off work to rest.",
  "Tried elevating my legs.",
  "Started a new exercise routine recently.",
  "Cut back on caffeine this week.",
  "I have been drinking more water than usual."
];

const DRUGS = [
  "ibuprofen",
  "Advil",
  "Tylenol",
  "acetaminophen",
  "aspirin",
  "Aleve",
  "naproxen",
  "Motrin",
  "Benadryl",
  "the antibiotics",
  "my BP meds",
  "my inhaler",
  "the prescription",
  "an antihistamine"
];
const AMOUNTS = ["two", "three", "four", "a few", "several"];
const N_NUMS = ["2", "3", "4", "5", "7", "10", "14"];
const SEVS = ["3", "4", "5", "6", "7", "8"];

function fill(template) {
  return template
    .replace(/\{drug\}/g, () => DRUGS[Math.floor(Math.random() * DRUGS.length)])
    .replace(/\{amount\}/g, () => AMOUNTS[Math.floor(Math.random() * AMOUNTS.length)])
    .replace(/\{n\}/g, () => N_NUMS[Math.floor(Math.random() * N_NUMS.length)])
    .replace(/\{sev\}/g, () => SEVS[Math.floor(Math.random() * SEVS.length)]);
}

function synthesizeMeta(count) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const template = INTAKE_META_TEMPLATES[i % INTAKE_META_TEMPLATES.length];
    out.push({ input: fill(template), label: "no_clear_domain", rawLabel: "meta" });
  }
  return out;
}
const DOMAIN_ANCHORS = {
  cardiovascular_or_neurologic: [
    "My blood pressure has been high for weeks.",
    "Blood pressure readings are running high lately.",
    "I get dizzy in the mornings when I stand up.",
    "Sharp headaches behind my eyes for three days.",
    "Migraine with blurred vision and sensitivity to light.",
    "Persistent headaches and dizziness through the day.",
    "Lightheaded after climbing stairs.",
    "My BP medication is not controlling my blood pressure.",
    "Heart palpitations when I lie down at night.",
    "Numbness and tingling in my left arm.",
    "I feel faint when I stand up quickly.",
    "Pounding headaches every afternoon."
  ],
  gastrointestinal_or_urinary: [
    "Severe abdominal pain and nausea, vomiting twice today.",
    "Diarrhea and stomach cramps for the past two days.",
    "Heartburn after meals with a sour taste.",
    "Burning sensation when urinating, going more often.",
    "Lower abdominal pain with frequent urination.",
    "Constipation for the past week, very bloated.",
    "Acid reflux and indigestion every night.",
    "Vomiting and unable to keep food down."
  ],
  musculoskeletal: [
    "Joint pain and stiffness in my knees, worse in the morning.",
    "Lower back pain after lifting something heavy.",
    "Sharp pain in my shoulder when I raise my arm.",
    "Neck stiffness, hard to turn my head.",
    "Wrist pain from typing all day.",
    "Hip pain when walking up stairs.",
    "Knees feel weak and ache after standing.",
    "Constant ache in my upper back between the shoulder blades."
  ],
  respiratory_or_immune: [
    "Dry cough and runny nose for a week.",
    "Wheezing and shortness of breath at night.",
    "Sneezing fits and watery eyes outside.",
    "Sore throat and congestion all week."
  ],
  infection_or_fever: [
    "High fever and chills, body aches for two days.",
    "Sore throat with fever and swollen glands.",
    "Cough with thick yellow mucus and fever.",
    "Burning fever and shaking chills overnight."
  ],
  skin_or_medication_reaction: [
    "Rash on my arms and itching after a new medication.",
    "Red scaly patches on my elbow that won't go away.",
    "Hives all over my back after eating shellfish."
  ],
  metabolic_or_systemic: [
    "Excessive thirst and frequent urination, very tired.",
    "Yellowing of the eyes and dark urine.",
    "Always thirsty, blurry vision, very fatigued.",
    "Significant weight loss without trying."
  ]
};

function synthesizeAnchors() {
  const out = [];
  for (const [label, sentences] of Object.entries(DOMAIN_ANCHORS)) {
    for (const text of sentences) {
      out.push({ input: text, label, rawLabel: "anchor" });
    }
  }
  return out;
}

function synthesizeMultiSymptom(domainRows, count) {
  const byLabel = {};
  for (const row of domainRows) {
    byLabel[row.label] ||= [];
    byLabel[row.label].push(row);
  }
  const labels = Object.keys(byLabel).filter((l) => l !== "other");
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const label = labels[i % labels.length];
    const bucket = byLabel[label];
    if (!bucket || bucket.length < 2) continue;
    const a = bucket[Math.floor(Math.random() * bucket.length)];
    const b = bucket[Math.floor(Math.random() * bucket.length)];
    const meta = fill(INTAKE_META_TEMPLATES[Math.floor(Math.random() * INTAKE_META_TEMPLATES.length)]);
    const composed = `${a.input} ${b.input} ${meta}`;
    out.push({ input: composed, label, rawLabel: `${a.rawLabel}+${b.rawLabel}` });
  }
  return out;
}

function augmentText(text) {
  const lower = text.toLowerCase();
  const variants = [
    text,
    lower.replace(/\bi have been\b/g, "i have").replace(/\bi am\b/g, "i'm"),
    `Today note: ${text}`,
    text.replace(/[.,]/g, " ")
  ];
  return [...new Set(variants)];
}

function expandRows(rows) {
  return rows.flatMap((row) => augmentText(row.input).map((input) => ({ ...row, input })));
}
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && token.length < 24);
}

function featurize(text) {
  const tokens = tokenize(text);
  const grams = [...tokens];
  for (let i = 0; i < tokens.length - 1; i += 1) {
    grams.push(`${tokens[i]}_${tokens[i + 1]}`);
  }
  return grams;
}

function buildVocab(rows, minDf) {
  const docFreq = new Map();
  for (const row of rows) {
    const seen = new Set(featurize(row.input));
    for (const gram of seen) docFreq.set(gram, (docFreq.get(gram) || 0) + 1);
  }
  const vocab = [];
  const idf = {};
  const totalDocs = rows.length;
  for (const [gram, df] of docFreq) {
    if (df < minDf) continue;
    vocab.push(gram);
    idf[gram] = Math.log((totalDocs + 1) / (df + 1)) + 1;
  }
  vocab.sort();
  return { vocab, idf };
}

function tfidfVector(text, vocabSet, idf) {
  const grams = featurize(text);
  const tf = new Map();
  for (const gram of grams) {
    if (!vocabSet.has(gram)) continue;
    tf.set(gram, (tf.get(gram) || 0) + 1);
  }
  const total = grams.length || 1;
  let sumSq = 0;
  const vector = new Map();
  for (const [gram, count] of tf) {
    const value = (count / total) * idf[gram];
    vector.set(gram, value);
    sumSq += value * value;
  }
  const norm = Math.sqrt(sumSq) || 1;
  for (const [gram, value] of vector) vector.set(gram, value / norm);
  return vector;
}
function softmax(scores) {
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - max));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / total);
}

export function trainLR(rows, vocab, idf, labels, opts = {}) {
  const { epochs = 40, lr = 0.5, l2 = 1e-4 } = opts;
  const vocabSet = new Set(vocab);
  const labelIndex = Object.fromEntries(labels.map((l, i) => [l, i]));
  const numClasses = labels.length;

  const X = rows.map((row) => tfidfVector(row.input, vocabSet, idf));
  const y = rows.map((row) => labelIndex[row.label]);

  const weights = labels.map(() => new Map());
  const bias = new Float64Array(numClasses);

  for (let epoch = 0; epoch < epochs; epoch += 1) {
    const order = Array.from({ length: rows.length }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }

    let loss = 0;
    let correct = 0;
    const learningRate = lr / (1 + epoch * 0.05);

    for (const i of order) {
      const features = X[i];
      const target = y[i];

      const scores = new Float64Array(numClasses);
      for (let c = 0; c < numClasses; c += 1) {
        let s = bias[c];
        const w = weights[c];
        for (const [gram, value] of features) {
          const wv = w.get(gram);
          if (wv !== undefined) s += wv * value;
        }
        scores[c] = s;
      }
      const probs = softmax(Array.from(scores));
      loss -= Math.log(Math.max(probs[target], 1e-12));
      if (probs.indexOf(Math.max(...probs)) === target) correct += 1;

      for (let c = 0; c < numClasses; c += 1) {
        const grad = probs[c] - (c === target ? 1 : 0);
        bias[c] -= learningRate * grad;
        const w = weights[c];
        for (const [gram, value] of features) {
          const current = w.get(gram) || 0;
          const updated = current - learningRate * (grad * value + l2 * current);
          if (Math.abs(updated) < 1e-6) w.delete(gram);
          else w.set(gram, updated);
        }
      }
    }

    if (epoch === 0 || (epoch + 1) % 10 === 0 || epoch === epochs - 1) {
      console.error(
        `epoch ${epoch + 1}/${epochs}  loss=${(loss / rows.length).toFixed(3)}  train_acc=${(
          correct / rows.length
        ).toFixed(3)}`
      );
    }
  }

  return { weights, bias, labels };
}

export function predict(model, text, vocabSet, idf) {
  const features = tfidfVector(text, vocabSet, idf);
  const scores = model.labels.map((_, c) => {
    let s = model.bias[c];
    const w = model.weights[c];
    for (const [gram, value] of features) {
      const wv = w.get(gram);
      if (wv !== undefined) s += wv * value;
    }
    return s;
  });
  const probs = softmax(scores);
  return model.labels
    .map((label, i) => ({ label, probability: probs[i] }))
    .sort((a, b) => b.probability - a.probability);
}

export function evaluate(model, rows, vocabSet, idf) {
  let correct = 0;
  const byLabel = {};
  for (const row of rows) {
    const top = predict(model, row.input, vocabSet, idf)[0].label;
    byLabel[row.label] ||= { correct: 0, total: 0 };
    byLabel[row.label].total += 1;
    if (top === row.label) {
      correct += 1;
      byLabel[row.label].correct += 1;
    }
  }
  return {
    accuracy: correct / rows.length,
    total: rows.length,
    byLabel: Object.fromEntries(
      Object.entries(byLabel).map(([label, value]) => [
        label,
        { accuracy: value.correct / value.total, total: value.total }
      ])
    )
  };
}
function priorityLabel(row) {
  if (row.label === "no_clear_domain") return "routine_tracking";
  const text = row.input.toLowerCase();
  const urgentTerms = [
    "chest pain",
    "shortness of breath",
    "breathlessness",
    "blood",
    "faint",
    "dizzy",
    "high fever",
    "weak",
    "confusion"
  ];
  const discussionLabels = new Set([
    "dengue",
    "malaria",
    "pneumonia",
    "typhoid",
    "urinary tract infection",
    "hypertension",
    "diabetes",
    "jaundice",
    "drug reaction"
  ]);
  if (urgentTerms.some((term) => text.includes(term))) return "priority_review";
  if (discussionLabels.has(row.rawLabel)) return "clinician_discussion";
  return "routine_tracking";
}
function buildIntakeTestSet() {
  const cases = [
    { text: "Headaches and dizziness for three days, pain about 6 out of 10. Tried ibuprofen with no relief.", label: "cardiovascular_or_neurologic" },
    { text: "My blood pressure has been high. I get dizzy in the mornings. Started new BP meds last month.", label: "cardiovascular_or_neurologic" },
    { text: "Migraine behind the eyes with blurred vision. Tried Tylenol.", label: "cardiovascular_or_neurologic" },
    { text: "Severe abdominal pain and nausea, vomiting twice today. Took Tums but it didn't help.", label: "gastrointestinal_or_urinary" },
    { text: "Burning when urinating for two days. Drinking more water.", label: "gastrointestinal_or_urinary" },
    { text: "Heartburn after meals, sour taste in mouth. Tried over the counter antacids.", label: "gastrointestinal_or_urinary" },
    { text: "Dry cough and runny nose for a week. Used a humidifier and rested.", label: "respiratory_or_immune" },
    { text: "Wheezing and shortness of breath. Using my inhaler more than usual.", label: "respiratory_or_immune" },
    { text: "Sneezing and watery eyes whenever I go outside. Tried Benadryl.", label: "respiratory_or_immune" },
    { text: "Rash on my arms and itching after starting a new medication.", label: "skin_or_medication_reaction" },
    { text: "Red scaly patches on my elbow. Used a moisturizer.", label: "skin_or_medication_reaction" },
    { text: "Joint pain and stiffness in my knees, worse in the morning. Tried Advil.", label: "musculoskeletal" },
    { text: "Lower back pain after lifting something heavy. Used a heating pad.", label: "musculoskeletal" },
    { text: "Neck pain and stiffness for a week, hard to turn my head.", label: "musculoskeletal" },
    { text: "High fever and chills for two days, body aches. Took acetaminophen.", label: "infection_or_fever" },
    { text: "Sore throat with fever and swollen glands. Drinking lots of fluids.", label: "infection_or_fever" },
    { text: "Excessive thirst and frequent urination. Tired all the time.", label: "metabolic_or_systemic" },
    { text: "Yellowing of the eyes and skin, dark urine.", label: "metabolic_or_systemic" },
    { text: "Tried ibuprofen and rest. Doctor visit was Tuesday.", label: "no_clear_domain" },
    { text: "Started new prescription two weeks ago. Last appointment was uneventful.", label: "no_clear_domain" }
  ];
  return cases.map((c) => ({ input: c.text, label: c.label, rawLabel: "intake_eval" }));
}
export async function buildDatasets() {
  console.error("fetching dataset...");
  const trainRowsRaw = await fetchRows("train");
  const testRowsRaw = await fetchRows("test");
  console.error(`train=${trainRowsRaw.length}  test=${testRowsRaw.length}`);

  const META_TRAIN = synthesizeMeta(220);
  const META_TEST = synthesizeMeta(60);
  const MULTI_TRAIN = synthesizeMultiSymptom(trainRowsRaw, 300);
  const MULTI_TEST = synthesizeMultiSymptom(testRowsRaw, 60);
  const ANCHORS = synthesizeAnchors();
  const domainTrain = expandRows([
    ...trainRowsRaw,
    ...MULTI_TRAIN,
    ...META_TRAIN,
    ...ANCHORS,
    ...ANCHORS,
    ...ANCHORS
  ]);
  const domainTest = [...testRowsRaw, ...MULTI_TEST, ...META_TEST];
  const intakeEval = buildIntakeTestSet();

  console.error(
    `domain train=${domainTrain.length}  test=${domainTest.length}  intake_eval=${intakeEval.length}`
  );

  console.error("building vocab...");
  const { vocab, idf } = buildVocab(domainTrain, 2);
  console.error(`vocab size=${vocab.length}`);

  const domainLabels = [...new Set(domainTrain.map((r) => r.label))].sort();

  const priorityTrain = domainTrain.map((row) => ({ ...row, label: priorityLabel(row) }));
  const priorityTest = domainTest.map((row) => ({ ...row, label: priorityLabel(row) }));
  const priorityLabels = [...new Set(priorityTrain.map((r) => r.label))].sort();

  return {
    domainTrain,
    domainTest,
    intakeEval,
    vocab,
    idf,
    domainLabels,
    priorityTrain,
    priorityTest,
    priorityLabels
  };
}

function serialiseModel(m, metrics) {
  return {
    labels: m.labels,
    bias: Object.fromEntries(m.labels.map((l, i) => [l, m.bias[i]])),
    weights: Object.fromEntries(m.labels.map((l, i) => [l, Object.fromEntries(m.weights[i])])),
    metrics
  };
}

async function main() {
  const {
    domainTrain,
    domainTest,
    intakeEval,
    vocab,
    idf,
    domainLabels,
    priorityTrain,
    priorityTest,
    priorityLabels
  } = await buildDatasets();

  console.error("training domain classifier...");
  const domainModel = trainLR(domainTrain, vocab, idf, domainLabels, {
    epochs: 35,
    lr: 0.6,
    l2: 5e-5
  });

  const vocabSet = new Set(vocab);
  const domainTrainMetrics = evaluate(domainModel, domainTrain, vocabSet, idf);
  const domainTestMetrics = evaluate(domainModel, domainTest, vocabSet, idf);
  const domainIntakeMetrics = evaluate(domainModel, intakeEval, vocabSet, idf);

  console.error(
    `domain  train=${(domainTrainMetrics.accuracy * 100).toFixed(1)}%  test=${(
      domainTestMetrics.accuracy * 100
    ).toFixed(1)}%  intake_eval=${(domainIntakeMetrics.accuracy * 100).toFixed(1)}%`
  );

  console.error("training priority classifier...");
  const priorityModel = trainLR(priorityTrain, vocab, idf, priorityLabels, {
    epochs: 30,
    lr: 0.5,
    l2: 5e-5
  });
  const priorityTrainMetrics = evaluate(priorityModel, priorityTrain, vocabSet, idf);
  const priorityTestMetrics = evaluate(priorityModel, priorityTest, vocabSet, idf);
  console.error(
    `priority train=${(priorityTrainMetrics.accuracy * 100).toFixed(1)}%  test=${(
      priorityTestMetrics.accuracy * 100
    ).toFixed(1)}%`
  );

  const artifact = {
    name: "flarewise-tfidf-logreg",
    modelType: "tfidf_multinomial_logistic_regression",
    sourceDataset:
      "gretelai/symptom_to_diagnosis + synthetic intake-meta and multi-symptom examples",
    sourceUrl: "https://huggingface.co/datasets/gretelai/symptom_to_diagnosis",
    trainedAt: new Date().toISOString(),
    vocabulary: vocab,
    idf,
    models: {
      domain: {
        task: "symptom sentence to broad clinical domain (with no_clear_domain class)",
        ...serialiseModel(domainModel, {
          train: domainTrainMetrics,
          test: domainTestMetrics,
          intake: domainIntakeMetrics
        })
      },
      priority: {
        task: "symptom sentence to appointment priority",
        ...serialiseModel(priorityModel, {
          train: priorityTrainMetrics,
          test: priorityTestMetrics
        })
      }
    }
  };

  const outputPath = path.join(process.cwd(), "src/lib/ml/model.json");
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(artifact));
  const stat = await fs.stat(outputPath);

  console.log(
    JSON.stringify(
      {
        modelType: artifact.modelType,
        vocabSize: vocab.length,
        domainTrainRows: domainTrain.length,
        domainTestRows: domainTest.length,
        intakeEvalRows: intakeEval.length,
        domainTestAcc: domainTestMetrics.accuracy,
        domainIntakeAcc: domainIntakeMetrics.accuracy,
        priorityTestAcc: priorityTestMetrics.accuracy,
        domainPerLabelIntake: domainIntakeMetrics.byLabel,
        modelJsonKB: Math.round(stat.size / 1024)
      },
      null,
      2
    )
  );
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) await main();
