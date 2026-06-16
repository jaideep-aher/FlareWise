"use client";

import Link from "next/link";
import { useSavedAnalysis } from "@/components/useSavedAnalysis";

const sections = [
  ["Main concerns", "mainConcerns"],
  ["Medication changes", "medicationChanges"],
  ["Questions to ask", "questions"],
  ["Uncertainties", "uncertainties"]
] as const;

export function BriefPage() {
  const { analysis, ready } = useSavedAnalysis();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold">Doctor Visit Brief</h1>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            Appointment ready concerns, medications, questions, and uncertainty.
          </p>
        </div>
        <Link href="/workspace" className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white">
          Analyze Notes
        </Link>
      </div>

      <div className="grid gap-4">
        <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Pre-visit summary</h2>
          <p className="mt-3 leading-7 text-[var(--ink-soft)]">
            {analysis?.weeklySummary || (ready ? "Run an analysis to generate a summary." : "Loading summary.")}
          </p>
        </section>

        {sections.map(([label, key]) => (
          <section key={key} className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">{label}</h2>
            {analysis?.doctorBrief[key].length ? (
              <ul className="mt-3 grid gap-2">
                {analysis.doctorBrief[key].map((item) => (
                  <li key={item} className="rounded-md border border-[var(--line)] bg-[var(--muted)] px-3 py-2 text-sm">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[var(--ink-soft)]">No items yet.</p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
