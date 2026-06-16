"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Download, FileText, ShieldCheck, Table2, User } from "lucide-react";
import { useSavedAnalysis } from "@/components/useSavedAnalysis";
import type { Demographics } from "@/lib/types";

const emptyDemographics: Demographics = {
  name: "",
  age: "",
  sex: "",
  primaryCare: "",
  allergies: "",
  currentMedications: ""
};

export function ResultsPage() {
  const { analysis, ready } = useSavedAnalysis();
  const [demographics, setDemographics] = useState<Demographics>(emptyDemographics);
  
  useEffect(() => {
    const saved = window.localStorage.getItem("flarewise.demographics");
    if (!saved) return;
    try {
      setDemographics({ ...emptyDemographics, ...(JSON.parse(saved) as Demographics) });
    } catch {
    }
  }, []);
  

  const hasDemographics = Object.values(demographics).some((value) => value.trim());

  function exportBrief() {
    if (!analysis) return;

    const brief = [
      "FlareWise Doctor Visit Brief",
      "",
      "Main concerns:",
      ...analysis.doctorBrief.mainConcerns.map((item) => `- ${item}`),
      "",
      "Medication changes:",
      ...analysis.doctorBrief.medicationChanges.map((item) => `- ${item}`),
      "",
      "Questions to ask:",
      ...analysis.doctorBrief.questions.map((item) => `- ${item}`),
      "",
      "Uncertainties:",
      ...analysis.doctorBrief.uncertainties.map((item) => `- ${item}`)
    ].join("\n");

    const blob = new Blob([brief], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "flarewise-doctor-brief.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!analysis) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-89px)] max-w-3xl flex-col items-center justify-center px-4 py-8 text-center sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold">No results yet</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
          {ready ? "Paste notes on the analysis page to generate results." : "Loading results."}
        </p>
        <Link
          href="/workspace"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-[var(--accent)] px-5 text-sm font-semibold text-white"
        >
          Go to Analysis
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-[var(--accent-strong)]">Step 2</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">Doctor intake brief</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-soft)]">
            Review the doctor-facing summary first, then open the detailed timeline, visit brief, or reliability report.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={exportBrief}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[var(--line)] bg-white px-4 text-sm font-semibold transition hover:border-[var(--accent)]"
          >
            <Download size={17} />
            Export Intake Brief
          </button>
          <Link
            href="/workspace"
            className="inline-flex h-11 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
          >
            New Intake
          </Link>
        </div>
      </div>

      {hasDemographics ? (
        <section className="mb-5 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                <User size={18} />
              </div>
              <div>
                <div className="text-base font-semibold">
                  {demographics.name || "Patient"}
                </div>
                <div className="text-xs text-[var(--ink-soft)]">
                  {[demographics.age && `Age ${demographics.age}`, demographics.sex]
                    .filter(Boolean)
                    .join(" | ") || "Demographics on file"}
                </div>
              </div>
            </div>
            {demographics.primaryCare ? (
              <DemoChip label="Primary care" value={demographics.primaryCare} />
            ) : null}
            {demographics.allergies ? (
              <DemoChip label="Allergies" value={demographics.allergies} warn />
            ) : null}
            {demographics.currentMedications ? (
              <DemoChip label="Current meds" value={demographics.currentMedications} />
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Pre-visit summary</h2>
          <p className="mt-3 text-base leading-8 text-[var(--ink-soft)]">{analysis.weeklySummary}</p>
        </section>

        <section className="rounded-lg border border-[var(--line)] bg-[var(--foreground)] p-5 text-white shadow-sm">
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-sm text-white/70">Self-audit score</div>
            <div className="text-[10px] uppercase tracking-wide text-white/40">Same model</div>
          </div>
          <div className="mt-2 text-5xl font-semibold">
            {analysis.reliability.score}
            <span className="text-xl text-white/60">/100</span>
          </div>
          <div className="mt-1 text-[11px] leading-5 text-white/55">
            The same language model that wrote the brief graded its own output. Treat as a sanity check, not
            independent verification.
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
            <MiniMetric label="Events" value={analysis.events.length} />
            <MiniMetric label="Issues" value={analysis.reliability.issues.length} />
            <MiniMetric label="Flags" value={analysis.safetyFlags.length} />
          </div>
        </section>
      </div>

      {analysis.localModel ? (
        <section className="mt-5 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <h2 className="text-lg font-semibold">Trained local NLP model</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-soft)]">
                A from-scratch TF-IDF + multinomial logistic regression classifier (trained in
                JavaScript, no external ML libraries) reads each sentence of your intake separately,
                drops intake-meta sentences like &ldquo;tried ibuprofen&rdquo;, and aggregates the
                rest into a broad symptom-domain and appointment-priority signal. This is not a
                diagnosis.
              </p>
            </div>
            <div className="rounded-md border border-[var(--line)] bg-[var(--muted)] px-4 py-3 text-sm">
              Domain accuracy {Math.round(analysis.localModel.testAccuracy * 100)}%
            </div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-md bg-[var(--foreground)] p-5 text-white">
              <div className="text-sm text-white/70">Top domain</div>
              <div className="mt-2 text-2xl font-semibold">{analysis.localModel.topDomain}</div>
              <div className="mt-2 text-sm text-white/70">
                Confidence {Math.round(analysis.localModel.confidence * 100)}%
              </div>
            </div>
            <div className="rounded-md bg-[var(--accent-strong)] p-5 text-white">
              <div className="text-sm text-white/70">Appointment priority</div>
              <div className="mt-2 text-2xl font-semibold">{analysis.localModel.priority}</div>
              <div className="mt-2 text-sm text-white/70">
                Confidence {Math.round(analysis.localModel.priorityConfidence * 100)}%
              </div>
            </div>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="grid gap-2">
              {analysis.localModel.topPredictions.map((prediction) => (
                <div key={prediction.domain} className="rounded-md border border-[var(--line)] bg-[var(--muted)] p-3">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="font-medium">{prediction.domain}</span>
                    <span className="text-[var(--ink-soft)]">{Math.round(prediction.confidence * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-2">
              {analysis.localModel.priorityPredictions.map((prediction) => (
                <div key={prediction.priority} className="rounded-md border border-[var(--line)] bg-[var(--muted)] p-3">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="font-medium">{prediction.priority}</span>
                    <span className="text-[var(--ink-soft)]">{Math.round(prediction.confidence * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <ResultLink
          href="/timeline"
          icon={<Table2 size={19} />}
          title="Timeline"
          body="See structured events, dates, details, confidence, and source quotes."
        />
        <ResultLink
          href="/brief"
          icon={<FileText size={19} />}
          title="Doctor Brief"
          body="Open concerns, medication changes, follow-up questions, and uncertainties."
        />
        <ResultLink
          href="/reliability"
          icon={<ShieldCheck size={19} />}
          title="Reliability"
          body="Inspect unsupported claims, missed details, negation errors, and warnings."
        />
      </div>

      <section className="mt-5 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Timeline preview</h2>
        <div className="mt-3 grid gap-2">
          {analysis.events.slice(0, 5).map((event) => (
            <div key={event.id} className="grid gap-2 rounded-md border border-[var(--line)] bg-[var(--muted)] p-3 text-sm sm:grid-cols-[110px_120px_1fr]">
              <div className="font-medium">{event.date}</div>
              <div className="capitalize text-[var(--ink-soft)]">{event.type.replace(/_/g, " ")}</div>
              <div>{event.name}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-white/10 p-3">
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

function ResultLink({
  href,
  icon,
  title,
  body
}: {
  href: string;
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm transition hover:border-[var(--accent)]"
    >
      <span className="text-[var(--accent)]">{icon}</span>
      <span className="mt-3 block text-lg font-semibold">{title}</span>
      <span className="mt-2 block text-sm leading-6 text-[var(--ink-soft)]">{body}</span>
    </Link>
  );
}

function DemoChip({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div
      className={`max-w-xs rounded-lg border px-3 py-1.5 text-xs ${
        warn
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-[var(--line)] bg-[var(--muted)] text-[var(--foreground)]"
      }`}
    >
      <span className="font-semibold uppercase tracking-wide opacity-70">{label}</span>
      <div className="mt-0.5 truncate">{value}</div>
    </div>
  );
}
