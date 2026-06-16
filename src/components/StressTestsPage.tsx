"use client";

import { useState } from "react";
import { Loader2, Play } from "lucide-react";
import type { StressTestResponse } from "@/lib/types";

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function StressTestsPage() {
  const [result, setResult] = useState<StressTestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/stress-test", { method: "POST" });
      const payload = await response.json();

      if (!response.ok) throw new Error(payload.error || "Stress test failed");
      setResult(payload as StressTestResponse);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Stress test failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold">Self-evaluation demo</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--ink-soft)]">
            Gemini invents its own synthetic notes (clean / typo / vague / negated / contradictory /
            urgent / long) and grades itself on each. This is a sanity-check demo, NOT an
            independent benchmark - real evaluation needs held-out labelled data.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? <Loader2 size={17} className="animate-spin" /> : <Play size={17} />}
          Run Stress Tests
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-[var(--line)] bg-white shadow-sm soft-scroll">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-[var(--muted)] text-xs uppercase text-[var(--ink-soft)]">
            <tr>
              <th className="px-4 py-3">Test Type</th>
              <th className="px-4 py-3">Extraction F1</th>
              <th className="px-4 py-3">Hallucination Rate</th>
              <th className="px-4 py-3">Negation Accuracy</th>
              <th className="px-4 py-3">Temporal Accuracy</th>
              <th className="px-4 py-3">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {result?.results.length ? (
              result.results.map((row) => (
                <tr key={row.testType}>
                  <td className="px-4 py-4 font-medium">{row.testType}</td>
                  <td className="px-4 py-4">{pct(row.extractionF1)}</td>
                  <td className="px-4 py-4">{pct(row.hallucinationRate)}</td>
                  <td className="px-4 py-4">{pct(row.negationAccuracy)}</td>
                  <td className="px-4 py-4">{pct(row.temporalAccuracy)}</td>
                  <td className="px-4 py-4 text-[var(--ink-soft)]">{row.notes}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-12 text-center text-[var(--ink-soft)]" colSpan={6}>
                  Run the stress test to generate evaluation metrics.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {result?.takeaway ? (
        <section className="mt-4 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Evaluation takeaway</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{result.takeaway}</p>
        </section>
      ) : null}

      <section className="mt-4 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">How evaluation improves the model behavior</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-md border border-[var(--line)] bg-[var(--muted)] p-4">
            <div className="text-sm font-semibold">Negation stress</div>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
              If notes like no fever are missed, the schema and evaluator force negated symptoms to be tracked separately.
            </p>
          </div>
          <div className="rounded-md border border-[var(--line)] bg-[var(--muted)] p-4">
            <div className="text-sm font-semibold">Temporal stress</div>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
              If a symptom happened before a medication change, the evaluator flags unsupported causation or wrong time order.
            </p>
          </div>
          <div className="rounded-md border border-[var(--line)] bg-[var(--muted)] p-4">
            <div className="text-sm font-semibold">Safety stress</div>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
              If urgent terms appear, a rule based safety layer flags them before any generated summary is trusted.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
