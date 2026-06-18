"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Activity, AlertTriangle, Cpu, Download, FileText, ShieldCheck, Table2, User } from "lucide-react";
import { useSavedAnalysis } from "@/components/useSavedAnalysis";
import type {
  AgreementReport,
  AnalysisResult,
  Demographics,
  LocalModelResult,
  TransformerResult,
  TriageScore
} from "@/lib/types";

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
  const [modelView, setModelView] = useState<"neural" | "classical">("neural");
  
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
    const exportedTriage = analysis.triage ?? fallbackTriage(analysis.safetyFlags);

    const demoLines: string[] = [];
    if (hasDemographics) {
      demoLines.push("Patient details:");
      if (demographics.name) demoLines.push(`- Name: ${demographics.name}`);
      const ageSex = [demographics.age && `Age ${demographics.age}`, demographics.sex]
        .filter(Boolean)
        .join(", ");
      if (ageSex) demoLines.push(`- ${ageSex}`);
      if (demographics.primaryCare) demoLines.push(`- Primary care: ${demographics.primaryCare}`);
      if (demographics.allergies) demoLines.push(`- Allergies: ${demographics.allergies}`);
      if (demographics.currentMedications)
        demoLines.push(`- Current medications: ${demographics.currentMedications}`);
      demoLines.push("");
    }

    const brief = [
      "Mira Doctor Visit Brief",
      "",
      ...demoLines,
      "Care priority:",
      `${exportedTriage.level} (${exportedTriage.score}/100, urgency ${exportedTriage.urgencyLevel}/5)`,
      exportedTriage.timeframe,
      `Recommended action: ${exportedTriage.action}`,
      ...(exportedTriage.redFlags.length ? ["", "Red flags:", ...exportedTriage.redFlags.map((item) => `- ${item}`)] : []),
      "",
      "Reasons:",
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
    link.download = "mira-doctor-brief.txt";
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
  const triage = analysis.triage ?? fallbackTriage(analysis.safetyFlags);
  const agreement = analysis.agreement;
  const transformer = analysis.transformer;
  const palette = urgencyPalette(triage.urgencyLevel);

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

      <section className={`mb-5 rounded-lg border p-5 text-white shadow-sm ${palette.card}`}>
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-white/15 text-white">
              <Activity size={24} />
            </div>
            <div>
              <div className="text-sm text-white/75">Care priority</div>
              <h2 className="mt-1 text-3xl font-semibold">{triage.level}</h2>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/90">{triage.action}</p>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-white/70">{triage.timeframe}</p>
            </div>
          </div>
          <div className="lg:text-right">
            <div className="flex items-center gap-1.5 lg:justify-end">
              {[1, 2, 3, 4, 5].map((pip) => (
                <span
                  key={pip}
                  className={`h-2.5 w-7 rounded-full ${pip <= triage.urgencyLevel ? "bg-white" : "bg-white/25"}`}
                />
              ))}
            </div>
            <div className="mt-2 text-sm text-white/80">Urgency {triage.urgencyLevel}/5</div>
            <div className="mt-3 text-5xl font-semibold">
              {triage.score}
              <span className="text-lg text-white/60">/100</span>
            </div>
          </div>
        </div>
        {triage.redFlags.length ? (
          <div className="mt-5 rounded-md bg-black/20 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-white/80">
              Red-flag rules triggered
            </div>
            <ul className="mt-2 grid gap-1 text-sm text-white/90 md:grid-cols-2">
              {triage.redFlags.map((flag) => (
                <li key={flag} className="flex items-start gap-2">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="mt-5 grid gap-2 md:grid-cols-3">
          {triage.reasons.map((reason) => (
            <div key={reason} className="rounded-md bg-white/12 px-3 py-2 text-sm leading-6 text-white/85">
              {reason}
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-white/65">
          Rule-based safety score from red-flag combinations, severity, duration, safety terms, and the local model signal.
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

      {transformer || localModel ? (
        <ModelEstimateCard
          transformer={transformer}
          localModel={localModel}
          agreement={agreement}
          view={modelView}
          onView={setModelView}
        />
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

function ModelEstimateCard({
  transformer,
  localModel,
  agreement,
  view,
  onView
}: {
  transformer: TransformerResult | null | undefined;
  localModel: LocalModelResult | undefined;
  agreement: AgreementReport | undefined;
  view: "neural" | "classical";
  onView: (view: "neural" | "classical") => void;
}) {
  const hasNeural = !!transformer;
  const hasClassical = !!localModel;
  const showToggle = hasNeural && hasClassical;
  const effective: "neural" | "classical" =
    view === "neural" ? (hasNeural ? "neural" : "classical") : hasClassical ? "classical" : "neural";

  const selected =
    effective === "neural" && transformer
      ? {
          modelLabel: "DistilBERT (fine-tuned)",
          domain: transformer.topDomain,
          confidence: transformer.domainConfidence,
          preds: transformer.domainLabels.map((item) => ({ label: item.label, score: item.score })),
          note: `Test accuracy ${Math.round(transformer.accuracy * 100)}% · macro-F1 ${transformer.macroF1.toFixed(2)}`
        }
      : localModel
        ? {
            modelLabel: "TF-IDF + logistic regression",
            domain: localModel.topDomain,
            confidence: localModel.confidence,
            preds: localModel.topPredictions.map((item) => ({ label: item.domain, score: item.confidence })),
            note: `Test accuracy ${Math.round(localModel.testAccuracy * 100)}%`
          }
        : null;

  if (!selected) return null;

  return (
    <section className="mt-5 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
            <Cpu size={16} />
            Likely symptom area (AI estimate)
          </div>
          <p className="mt-1 text-xs text-[var(--ink-soft)]">
            A broad symptom-area estimate to help triage. Not a diagnosis.
          </p>
        </div>
        {showToggle ? (
          <div className="inline-flex shrink-0 rounded-lg border border-[var(--line)] bg-[var(--muted)] p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => onView("neural")}
              className={`rounded-md px-3 py-1.5 transition ${
                effective === "neural"
                  ? "bg-white text-[var(--accent-strong)] shadow-sm"
                  : "text-[var(--ink-soft)]"
              }`}
            >
              DistilBERT
            </button>
            <button
              type="button"
              onClick={() => onView("classical")}
              className={`rounded-md px-3 py-1.5 transition ${
                effective === "classical"
                  ? "bg-white text-[var(--accent-strong)] shadow-sm"
                  : "text-[var(--ink-soft)]"
              }`}
            >
              TF-IDF
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-md bg-[var(--foreground)] p-5 text-white">
          <div className="text-sm text-white/70">Most likely area</div>
          <div className="mt-2 text-2xl font-semibold">{selected.domain}</div>
          <div className="mt-2 text-sm text-white/70">
            Confidence {Math.round(selected.confidence * 100)}%
          </div>
        </div>
        <div className="rounded-md border border-[var(--line)] bg-[var(--muted)] p-5">
          <div className="text-sm text-[var(--ink-soft)]">Other possibilities</div>
          <div className="mt-2 grid gap-1.5">
            {selected.preds.slice(0, 4).map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">{item.label}</span>
                <span className="text-[var(--ink-soft)]">{Math.round(item.score * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--ink-soft)]">
        <span>
          Showing: <span className="font-medium text-[var(--foreground)]">{selected.modelLabel}</span> ·{" "}
          {selected.note}
        </span>
        {showToggle && agreement ? (
          <span
            className={`rounded-md px-2 py-0.5 font-medium ${
              agreement.agree
                ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                : "bg-amber-50 text-amber-800"
            }`}
          >
            {agreement.agree ? "Both models agree" : "Models differ"}
          </span>
        ) : null}
      </div>
    </section>
  );
}

function urgencyPalette(level: TriageScore["urgencyLevel"]) {
  switch (level) {
    case 5:
      return { card: "border-red-300 bg-red-600" };
    case 4:
      return { card: "border-orange-300 bg-orange-600" };
    case 3:
      return { card: "border-amber-300 bg-amber-600" };
    case 2:
      return { card: "border-teal-300 bg-teal-700" };
    default:
      return { card: "border-emerald-300 bg-emerald-700" };
  }
}

function fallbackTriage(safetyFlags: AnalysisResult["safetyFlags"]): TriageScore {
  const urgent = safetyFlags.some((flag) => flag.level !== "routine");
  return {
    score: urgent ? 70 : 25,
    level: urgent ? "Priority" : "Routine",
    urgencyLevel: urgent ? 4 : 2,
    timeframe: urgent
      ? "Same day or next available clinician advice"
      : "Bring up at the next routine visit",
    action: urgent
      ? "Contact a clinician today or use urgent care."
      : "Mention this at your next routine visit.",
    reasons: urgent
      ? [safetyFlags.find((flag) => flag.level !== "routine")?.message ?? "Clinician discussion may be needed."]
      : ["No urgent trigger terms or high severity were detected."],
    redFlags: []
  };
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
