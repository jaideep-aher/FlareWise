"use client";

import Link from "next/link";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { useSavedAnalysis } from "@/components/useSavedAnalysis";

export function ReliabilityPage() {
  const { analysis, ready } = useSavedAnalysis();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold">Self-audit report</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--ink-soft)]">
            The same language model that wrote the brief re-reads the original notes and grades its own output
            for unsupported claims, missed details, negation errors, and timing errors. It tends to
            be lenient on itself - read the listed issues, not just the score.
          </p>
        </div>
        <Link href="/results" className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white">
          Back to Results
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Score</h2>
            <ShieldCheck size={21} className="text-[var(--accent)]" aria-hidden="true" />
          </div>
          <div className="mt-4 rounded-lg bg-[var(--foreground)] p-5 text-white">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-sm text-white/70">Self-audit score</div>
              <div className="text-[10px] uppercase tracking-wide text-white/40">Same model</div>
            </div>
            <div className="mt-1 text-5xl font-semibold">
              {analysis ? analysis.reliability.score : "--"}
              <span className="text-xl text-white/60">/100</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Metric label="Supported" value={analysis?.reliability.supportedClaims} />
            <Metric label="Unsupported" value={analysis?.reliability.unsupportedClaims} />
            <Metric label="Missed" value={analysis?.reliability.missedDetails} />
            <Metric label="Negation" value={analysis?.reliability.negationErrors} />
            <Metric label="Temporal" value={analysis?.reliability.temporalErrors} />
            <Metric label="Urgent terms" value={analysis?.reliability.urgentRiskTerms} />
          </div>
        </section>

        <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-[var(--warning)]" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Issues and warnings</h2>
          </div>

          <div className="mt-4 grid gap-3">
            {analysis?.reliability.issues.length ? (
              analysis.reliability.issues.map((issue) => (
                <div key={`${issue.type}-${issue.claim}`} className="rounded-md border border-[var(--line)] bg-[var(--muted)] p-4">
                  <div className="text-sm font-semibold capitalize">{issue.type.replace("_", " ")}</div>
                  <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">{issue.problem}</p>
                  {issue.sourceQuote ? (
                    <p className="mt-2 text-xs leading-5 text-[var(--ink-soft)]">Source: {issue.sourceQuote}</p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="rounded-md border border-[var(--line)] bg-[var(--muted)] p-4 text-sm text-[var(--ink-soft)]">
                {ready ? "Run an analysis to see evaluator issues." : "Loading reliability report."}
              </p>
            )}

            {analysis?.safetyFlags.map((flag) => (
              <div key={`${flag.level}-${flag.term}`} className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <div className="font-semibold capitalize">{flag.level.replace("_", " ")}</div>
                <p className="mt-1 leading-6">{flag.message}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--muted)] p-3">
      <div className="text-xs text-[var(--ink-soft)]">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value ?? "--"}</div>
    </div>
  );
}
