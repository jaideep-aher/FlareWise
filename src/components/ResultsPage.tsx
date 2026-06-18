"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Activity, AlertTriangle, Cpu, Download, FileText, ShieldCheck, Table2, User } from "lucide-react";
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
    const exportedTriage = analysis.triage ?? {
      score: analysis.safetyFlags.some((flag) => flag.level !== "routine") ? 70 : 25,
      level: analysis.safetyFlags.some((flag) => flag.level !== "routine") ? "Priority" : "Routine",
      timeframe: analysis.safetyFlags.some((flag) => flag.level !== "routine")
        ? "Same day or next available clinician advice"
        : "Bring up at the next routine visit",
      reasons: analysis.safetyFlags.some((flag) => flag.level !== "routine")
        ? [analysis.safetyFlags.find((flag) => flag.level !== "routine")?.message ?? "Clinician discussion may be needed."]
        : ["No urgent trigger terms or high severity were detected."]
    };

    const brief = [
      "FlareWise Doctor Visit Brief",
      "",
      "Care priority:",
      `${exportedTriage.level} (${exportedTriage.score}/100)`,
      exportedTriage.timeframe,
      ...exportedTriage.reasons.map((item) => `- ${item}`),
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

  const visibleSafetyFlags = analysis.safetyFlags.filter((flag) => flag.level !== "routine");
  const localModel = analysis.localModel;
  const triage = analysis.triage ?? {
    score: visibleSafetyFlags.length ? 70 : 25,
    level: visibleSafetyFlags.length ? "Priority" : "Routine",
    timeframe: visibleSafetyFlags.length
      ? "Same day or next available clinician advice"
      : "Bring up at the next routine visit",
    reasons: visibleSafetyFlags.length
      ? [visibleSafetyFlags[0].message]
      : ["No urgent trigger terms or high severity were detected."]
  };
  const domainReady =
    localModel &&
    visibleSafetyFlags.length === 0 &&
    localModel.coverage.sufficient &&
    localModel.topDomain !== "Mixed signal" &&
    localModel.confidence >= 0.55;

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

      <section className="mb-5 rounded-lg border border-[var(--line)] bg-[var(--foreground)] p-5 text-white shadow-sm">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-white/10 text-[var(--accent-soft)]">
              <Activity size={24} />
            </div>
            <div>
              <div className="text-sm text-white/65">Care priority score</div>
              <h2 className="mt-1 text-3xl font-semibold">{triage.level}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">{triage.timeframe}</p>
            </div>
          </div>
          <div className="lg:text-right">
            <div className="text-6xl font-semibold">
              {triage.score}
              <span className="text-xl text-white/55">/100</span>
            </div>
            <div className="mt-1 text-xs text-white/55">Rule based from severity, duration, safety flags, and model signal</div>
          </div>
        </div>
        <div className="mt-5 grid gap-2 md:grid-cols-3">
          {triage.reasons.map((reason) => (
            <div key={reason} className="rounded-md bg-white/10 px-3 py-2 text-sm leading-6 text-white/80">
              {reason}
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Pre-visit summary</h2>
          <p className="mt-3 text-base leading-8 text-[var(--ink-soft)]">{analysis.weeklySummary}</p>
        </section>

        <section className="grid gap-3">
          <div className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Brief quality check</div>
                <div className="mt-1 text-xs text-[var(--ink-soft)]">Checks support, gaps, and timing.</div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-semibold text-[var(--foreground)]">
                  {analysis.reliability.score}
                  <span className="text-sm text-[var(--ink-soft)]">/100</span>
                </div>
                <div className="text-[11px] text-[var(--ink-soft)]">
                  {analysis.reliability.issues.length} issue{analysis.reliability.issues.length === 1 ? "" : "s"}
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <MiniMetric label="Events" value={analysis.events.length} />
              <MiniMetric label="Issues" value={analysis.reliability.issues.length} />
              <MiniMetric label="Flags" value={visibleSafetyFlags.length} />
            </div>
          </div>

          <div
            className={`rounded-lg border p-5 shadow-sm ${
              visibleSafetyFlags.length
                ? "border-amber-200 bg-amber-50 text-amber-950"
                : "border-[var(--line)] bg-white text-[var(--foreground)]"
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                size={18}
                className={visibleSafetyFlags.length ? "text-amber-700" : "text-[var(--accent)]"}
              />
              <div>
                <div className="text-sm font-semibold">
                  {visibleSafetyFlags.length ? "Needs clinician discussion" : "No urgent wording detected"}
                </div>
                <p className="mt-1 text-xs leading-5 opacity-75">
                  {visibleSafetyFlags[0]?.message ??
                    "The rule check did not find urgent trigger terms in the note."}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {analysis.doctorBrief.mainConcerns.length ? (
          <BriefPreview title="Main concerns" items={analysis.doctorBrief.mainConcerns} />
        ) : null}
        {analysis.doctorBrief.questions.length ? (
          <BriefPreview title="Questions to ask" items={analysis.doctorBrief.questions} />
        ) : null}
        <BriefPreview
          title="Needs clarification"
          items={analysis.missingInformation.length ? analysis.missingInformation : analysis.doctorBrief.uncertainties}
        />
      </div>

      {localModel ? (
        <section className="mt-5 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                <Cpu size={16} />
                Local model signal
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-soft)]">
                The custom TF-IDF logistic regression model adds a quick domain and priority signal. It supports the brief but does not diagnose.
              </p>
            </div>
            <div className="rounded-md border border-[var(--line)] bg-[var(--muted)] px-4 py-3 text-sm">
              Test accuracy {Math.round(localModel.testAccuracy * 100)}%
            </div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <SignalCard
              label="Symptom area"
              value={domainReady ? localModel.topDomain : "Supporting signal only"}
              detail={
                domainReady
                  ? `Confidence ${Math.round(localModel.confidence * 100)}%`
                  : "The brief uses the note details first. The classifier is kept in the background when severity or ambiguity needs clinician review."
              }
              muted={!domainReady}
            />
            <SignalCard
              label="Appointment signal"
              value={visibleSafetyFlags.length ? "Discuss with clinician" : localModel.priority}
              detail={
                visibleSafetyFlags.length
                  ? visibleSafetyFlags[0].term
                  : `Model confidence ${Math.round(localModel.priorityConfidence * 100)}%`
              }
              muted={false}
            />
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
    <div className="rounded-md bg-[var(--muted)] p-3">
      <div className="text-xs text-[var(--ink-soft)]">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

function BriefPreview({ title, items }: { title: string; items: string[] }) {
  const visible = items.length ? items.slice(0, 3) : ["No major gaps listed."];

  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--ink-soft)]">
        {visible.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SignalCard({
  label,
  value,
  detail,
  muted
}: {
  label: string;
  value: string;
  detail: string;
  muted: boolean;
}) {
  return (
    <div
      className={`rounded-md p-5 ${
        muted ? "border border-[var(--line)] bg-[var(--muted)]" : "bg-[var(--foreground)] text-white"
      }`}
    >
      <div className={muted ? "text-sm text-[var(--ink-soft)]" : "text-sm text-white/70"}>{label}</div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
      <div className={muted ? "mt-2 text-sm leading-6 text-[var(--ink-soft)]" : "mt-2 text-sm leading-6 text-white/70"}>
        {detail}
      </div>
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
