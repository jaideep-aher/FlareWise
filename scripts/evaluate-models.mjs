import fs from "node:fs/promises";
import path from "node:path";
import { buildDatasets, trainLR, predict } from "./train-local-nlp.mjs";

const DISTILBERT_REPORTED = {
  name: "DistilBERT (fine-tuned, neural)",
  source: "notebooks/finetune_distilbert.ipynb held-out split",
  accuracy: 0.995,
  macroF1: 0.994
};

const SHORT_LABELS = {
  cardiovascular_or_neurologic: "CardioNeuro",
  gastrointestinal_or_urinary: "GI/Urinary",
  infection_or_fever: "Infection",
  metabolic_or_systemic: "Metabolic",
  musculoskeletal: "Musculo",
  respiratory_or_immune: "Respiratory",
  skin_or_medication_reaction: "Skin/Med",
  no_clear_domain: "NoDomain",
  routine_tracking: "Routine",
  clinician_discussion: "Discussion",
  priority_review: "Priority"
};

function shortLabel(label) {
  return SHORT_LABELS[label] || label;
}

function makeRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function shuffleWith(rng, items) {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function classCounts(rows) {
  const counts = new Map();
  for (const row of rows) counts.set(row.label, (counts.get(row.label) || 0) + 1);
  return counts;
}

function majorityClass(rows) {
  let best = null;
  let bestCount = -1;
  for (const [label, count] of classCounts(rows)) {
    if (count > bestCount) {
      best = label;
      bestCount = count;
    }
  }
  return best;
}

function buildConfusion(labels, pairs) {
  const index = Object.fromEntries(labels.map((label, i) => [label, i]));
  const matrix = labels.map(() => labels.map(() => 0));
  for (const { actual, predicted } of pairs) {
    if (index[actual] === undefined || index[predicted] === undefined) continue;
    matrix[index[actual]][index[predicted]] += 1;
  }
  return matrix;
}

function classificationMetrics(labels, pairs) {
  const matrix = buildConfusion(labels, pairs);
  const byClass = {};
  let macroF1 = 0;
  let correct = 0;
  let total = 0;
  for (let i = 0; i < labels.length; i += 1) {
    let rowSum = 0;
    let colSum = 0;
    for (let j = 0; j < labels.length; j += 1) {
      rowSum += matrix[i][j];
      colSum += matrix[j][i];
    }
    const truePositive = matrix[i][i];
    const precision = colSum ? truePositive / colSum : 0;
    const recall = rowSum ? truePositive / rowSum : 0;
    const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
    byClass[labels[i]] = {
      precision,
      recall,
      f1,
      support: rowSum
    };
    macroF1 += f1;
    correct += truePositive;
    total += rowSum;
  }
  return {
    accuracy: total ? correct / total : 0,
    macroF1: labels.length ? macroF1 / labels.length : 0,
    byClass,
    confusion: matrix
  };
}

function classicalPairs(model, rows, vocabSet, idf) {
  return rows.map((row) => ({
    actual: row.label,
    predicted: predict(model, row.input, vocabSet, idf)[0].label,
    input: row.input
  }));
}

function majorityPairs(constantLabel, rows) {
  return rows.map((row) => ({ actual: row.label, predicted: constantLabel }));
}

function expectedRandomAccuracy(trainRows, testRows) {
  const counts = classCounts(trainRows);
  const numClasses = counts.size;
  const total = trainRows.length;
  let priorMatch = 0;
  const testCounts = classCounts(testRows);
  const testTotal = testRows.length;
  for (const [label, testCount] of testCounts) {
    const prior = (counts.get(label) || 0) / total;
    priorMatch += (testCount / testTotal) * prior;
  }
  return { uniform: 1 / numClasses, priorWeighted: priorMatch };
}

function sensitivitySweep(domainTrain, domainTest, vocab, idf, labels, fractions, seeds) {
  const vocabSet = new Set(vocab);
  const points = [];
  for (const fraction of fractions) {
    const runs = [];
    for (let seed = 0; seed < seeds; seed += 1) {
      const rng = makeRng(1000 + seed * 7 + Math.round(fraction * 100));
      const shuffled = shuffleWith(rng, domainTrain);
      const take = Math.max(labels.length, Math.round(domainTrain.length * fraction));
      const subset = shuffled.slice(0, take);
      const presentLabels = [...new Set(subset.map((r) => r.label))].sort();
      const model = trainLR(subset, vocab, idf, presentLabels, {
        epochs: 25,
        lr: 0.6,
        l2: 5e-5
      });
      const pairs = classicalPairs(model, domainTest, vocabSet, idf);
      const metrics = classificationMetrics(labels, pairs);
      runs.push(metrics);
    }
    const accuracy = runs.reduce((sum, r) => sum + r.accuracy, 0) / runs.length;
    const macroF1 = runs.reduce((sum, r) => sum + r.macroF1, 0) / runs.length;
    points.push({
      fraction,
      trainRows: Math.round(domainTrain.length * fraction),
      accuracy,
      macroF1,
      seeds
    });
  }
  return points;
}

function collectMispredictions(pairs, limit) {
  const wrong = pairs.filter((pair) => pair.actual !== pair.predicted);
  return wrong.slice(0, limit).map((pair) => ({
    text: pair.input,
    actual: pair.actual,
    predicted: pair.predicted
  }));
}

function svgConfusion(labels, matrix, title) {
  const cell = 46;
  const left = 150;
  const top = 70;
  const width = left + labels.length * cell + 30;
  const height = top + labels.length * cell + 150;
  const maxValue = Math.max(1, ...matrix.flat());
  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" font-family="ui-sans-serif, system-ui, sans-serif">`
  );
  parts.push(`<rect width="${width}" height="${height}" fill="#ffffff"/>`);
  parts.push(
    `<text x="${left}" y="30" font-size="16" font-weight="600" fill="#0f172a">${title}</text>`
  );
  parts.push(
    `<text x="${left + (labels.length * cell) / 2}" y="52" font-size="11" fill="#475569" text-anchor="middle">predicted</text>`
  );
  for (let j = 0; j < labels.length; j += 1) {
    parts.push(
      `<text x="${left + j * cell + cell / 2}" y="${top - 6}" font-size="9" fill="#475569" text-anchor="middle">${shortLabel(labels[j])}</text>`
    );
  }
  for (let i = 0; i < labels.length; i += 1) {
    parts.push(
      `<text x="${left - 8}" y="${top + i * cell + cell / 2 + 3}" font-size="9" fill="#475569" text-anchor="end">${shortLabel(labels[i])}</text>`
    );
    for (let j = 0; j < labels.length; j += 1) {
      const value = matrix[i][j];
      const intensity = value / maxValue;
      const fill =
        i === j
          ? `rgba(16, 122, 87, ${0.15 + intensity * 0.75})`
          : value
            ? `rgba(190, 70, 70, ${0.15 + intensity * 0.7})`
            : "#f1f5f9";
      const textColor = intensity > 0.5 ? "#ffffff" : "#0f172a";
      parts.push(
        `<rect x="${left + j * cell}" y="${top + i * cell}" width="${cell - 2}" height="${cell - 2}" rx="4" fill="${fill}"/>`
      );
      if (value) {
        parts.push(
          `<text x="${left + j * cell + cell / 2 - 1}" y="${top + i * cell + cell / 2 + 3}" font-size="11" fill="${textColor}" text-anchor="middle">${value}</text>`
        );
      }
    }
  }
  parts.push(
    `<text x="${left}" y="${top + labels.length * cell + 30}" font-size="11" fill="#475569">rows are actual labels, columns are predicted labels</text>`
  );
  parts.push("</svg>");
  return parts.join("");
}

function svgSensitivity(points, title) {
  const width = 640;
  const height = 360;
  const left = 70;
  const right = width - 30;
  const topPad = 60;
  const bottom = height - 60;
  const xs = points.map((p) => p.trainRows);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...points.map((p) => Math.min(p.accuracy, p.macroF1)));
  const yLow = Math.max(0, minY - 0.05);
  const yHigh = 1;
  const xScale = (value) => left + ((value - minX) / (maxX - minX || 1)) * (right - left);
  const yScale = (value) => bottom - ((value - yLow) / (yHigh - yLow)) * (bottom - topPad);
  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" font-family="ui-sans-serif, system-ui, sans-serif">`
  );
  parts.push(`<rect width="${width}" height="${height}" fill="#ffffff"/>`);
  parts.push(
    `<text x="${left}" y="30" font-size="16" font-weight="600" fill="#0f172a">${title}</text>`
  );
  for (let tick = 0; tick <= 4; tick += 1) {
    const value = yLow + ((yHigh - yLow) * tick) / 4;
    const y = yScale(value);
    parts.push(
      `<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`
    );
    parts.push(
      `<text x="${left - 8}" y="${y + 3}" font-size="10" fill="#475569" text-anchor="end">${value.toFixed(2)}</text>`
    );
  }
  for (const point of points) {
    parts.push(
      `<text x="${xScale(point.trainRows)}" y="${bottom + 18}" font-size="10" fill="#475569" text-anchor="middle">${point.trainRows}</text>`
    );
  }
  parts.push(
    `<text x="${(left + right) / 2}" y="${height - 18}" font-size="11" fill="#475569" text-anchor="middle">training rows</text>`
  );
  const series = [
    { key: "accuracy", color: "#107a57", label: "accuracy" },
    { key: "macroF1", color: "#2563eb", label: "macro-F1" }
  ];
  series.forEach((line, lineIndex) => {
    const path = points
      .map((point, i) => `${i === 0 ? "M" : "L"}${xScale(point.trainRows)},${yScale(point[line.key])}`)
      .join(" ");
    parts.push(`<path d="${path}" fill="none" stroke="${line.color}" stroke-width="2.5"/>`);
    for (const point of points) {
      parts.push(
        `<circle cx="${xScale(point.trainRows)}" cy="${yScale(point[line.key])}" r="3.5" fill="${line.color}"/>`
      );
    }
    parts.push(
      `<rect x="${right - 150}" y="${topPad - 30 + lineIndex * 18}" width="12" height="12" rx="2" fill="${line.color}"/>`
    );
    parts.push(
      `<text x="${right - 134}" y="${topPad - 20 + lineIndex * 18}" font-size="11" fill="#0f172a">${line.label}</text>`
    );
  });
  parts.push("</svg>");
  return parts.join("");
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function buildSummary({ domainComparison, priorityComparison, sensitivity, mispredictions }) {
  const lines = [];
  lines.push("# Model evaluation");
  lines.push("");
  lines.push("Generated by `npm run evaluate`. All numbers come from the held-out test split.");
  lines.push("");
  lines.push("## Domain classification: three approaches");
  lines.push("");
  lines.push("| Model | Type | Accuracy | Macro-F1 |");
  lines.push("| --- | --- | --- | --- |");
  for (const row of domainComparison) {
    lines.push(
      `| ${row.name} | ${row.type} | ${formatPercent(row.accuracy)} | ${
        row.macroF1 === null ? "n/a" : row.macroF1.toFixed(3)
      } |`
    );
  }
  lines.push("");
  lines.push("## Priority classification: naive baseline vs classical");
  lines.push("");
  lines.push("| Model | Type | Accuracy | Macro-F1 |");
  lines.push("| --- | --- | --- | --- |");
  for (const row of priorityComparison) {
    lines.push(
      `| ${row.name} | ${row.type} | ${formatPercent(row.accuracy)} | ${
        row.macroF1 === null ? "n/a" : row.macroF1.toFixed(3)
      } |`
    );
  }
  lines.push("");
  lines.push("## Experiment: training set size sensitivity");
  lines.push("");
  lines.push("Classical TF-IDF logistic regression retrained on subsets of the training data, evaluated on the fixed test split, averaged over seeds.");
  lines.push("");
  lines.push("| Fraction | Train rows | Accuracy | Macro-F1 |");
  lines.push("| --- | --- | --- | --- |");
  for (const point of sensitivity) {
    lines.push(
      `| ${Math.round(point.fraction * 100)}% | ${point.trainRows} | ${formatPercent(
        point.accuracy
      )} | ${point.macroF1.toFixed(3)} |`
    );
  }
  lines.push("");
  lines.push("## Error analysis: sample mispredictions");
  lines.push("");
  mispredictions.forEach((item, index) => {
    lines.push(`${index + 1}. actual \`${item.actual}\`, predicted \`${item.predicted}\``);
    lines.push(`   > ${item.text}`);
  });
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const datasets = await buildDatasets();
  const {
    domainTrain,
    domainTest,
    vocab,
    idf,
    domainLabels,
    priorityTrain,
    priorityTest,
    priorityLabels
  } = datasets;
  const vocabSet = new Set(vocab);

  const domainModel = trainLR(domainTrain, vocab, idf, domainLabels, {
    epochs: 35,
    lr: 0.6,
    l2: 5e-5
  });
  const domainClassicalPairs = classicalPairs(domainModel, domainTest, vocabSet, idf);
  const domainClassical = classificationMetrics(domainLabels, domainClassicalPairs);

  const domainMajorityLabel = majorityClass(domainTrain);
  const domainMajority = classificationMetrics(
    domainLabels,
    majorityPairs(domainMajorityLabel, domainTest)
  );
  const domainRandom = expectedRandomAccuracy(domainTrain, domainTest);

  const priorityModel = trainLR(priorityTrain, vocab, idf, priorityLabels, {
    epochs: 30,
    lr: 0.5,
    l2: 5e-5
  });
  const priorityClassicalPairs = classicalPairs(priorityModel, priorityTest, vocabSet, idf);
  const priorityClassical = classificationMetrics(priorityLabels, priorityClassicalPairs);
  const priorityMajorityLabel = majorityClass(priorityTrain);
  const priorityMajority = classificationMetrics(
    priorityLabels,
    majorityPairs(priorityMajorityLabel, priorityTest)
  );
  const priorityRandom = expectedRandomAccuracy(priorityTrain, priorityTest);

  const sensitivity = sensitivitySweep(
    domainTrain,
    domainTest,
    vocab,
    idf,
    domainLabels,
    [0.1, 0.25, 0.5, 0.75, 1],
    2
  );

  const mispredictions = collectMispredictions(domainClassicalPairs, 5);

  const domainComparison = [
    {
      name: `Majority class (${domainMajorityLabel})`,
      type: "naive baseline",
      accuracy: domainMajority.accuracy,
      macroF1: domainMajority.macroF1
    },
    {
      name: "Random by prior",
      type: "naive baseline",
      accuracy: domainRandom.priorWeighted,
      macroF1: null
    },
    {
      name: "TF-IDF logistic regression",
      type: "classical",
      accuracy: domainClassical.accuracy,
      macroF1: domainClassical.macroF1
    },
    {
      name: DISTILBERT_REPORTED.name,
      type: "neural",
      accuracy: DISTILBERT_REPORTED.accuracy,
      macroF1: DISTILBERT_REPORTED.macroF1
    }
  ];

  const priorityComparison = [
    {
      name: `Majority class (${priorityMajorityLabel})`,
      type: "naive baseline",
      accuracy: priorityMajority.accuracy,
      macroF1: priorityMajority.macroF1
    },
    {
      name: "Random by prior",
      type: "naive baseline",
      accuracy: priorityRandom.priorWeighted,
      macroF1: null
    },
    {
      name: "TF-IDF logistic regression",
      type: "classical",
      accuracy: priorityClassical.accuracy,
      macroF1: priorityClassical.macroF1
    }
  ];

  const outputs = {
    generatedAt: new Date().toISOString(),
    testRows: { domain: domainTest.length, priority: priorityTest.length },
    domain: {
      comparison: domainComparison,
      classicalPerClass: domainClassical.byClass,
      majorityClassLabel: domainMajorityLabel,
      randomBaseline: domainRandom,
      distilbert: DISTILBERT_REPORTED
    },
    priority: {
      comparison: priorityComparison,
      classicalPerClass: priorityClassical.byClass,
      majorityClassLabel: priorityMajorityLabel,
      randomBaseline: priorityRandom
    }
  };

  const outDir = path.join(process.cwd(), "data", "outputs");
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    path.join(outDir, "model_comparison.json"),
    JSON.stringify(outputs, null, 2)
  );
  await fs.writeFile(
    path.join(outDir, "confusion_domain.json"),
    JSON.stringify({ labels: domainLabels, matrix: domainClassical.confusion }, null, 2)
  );
  await fs.writeFile(
    path.join(outDir, "sensitivity_training_size.json"),
    JSON.stringify({ points: sensitivity }, null, 2)
  );
  await fs.writeFile(
    path.join(outDir, "mispredictions.json"),
    JSON.stringify({ examples: mispredictions }, null, 2)
  );
  await fs.writeFile(
    path.join(outDir, "confusion_domain.svg"),
    svgConfusion(domainLabels, domainClassical.confusion, "Domain confusion matrix (classical)")
  );
  await fs.writeFile(
    path.join(outDir, "sensitivity_training_size.svg"),
    svgSensitivity(sensitivity, "Training set size vs performance")
  );
  await fs.writeFile(
    path.join(outDir, "EVALUATION.md"),
    buildSummary({ domainComparison, priorityComparison, sensitivity, mispredictions })
  );

  console.log(
    JSON.stringify(
      {
        domainComparison,
        priorityComparison,
        sensitivity,
        mispredictionCount: mispredictions.length,
        outputDir: "data/outputs"
      },
      null,
      2
    )
  );
}

await main();
