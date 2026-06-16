"use client";

import Link from "next/link";
import { useSavedAnalysis } from "@/components/useSavedAnalysis";

export function TimelinePage() {
  const { analysis, ready } = useSavedAnalysis();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold">Timeline View</h1>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            Structured events with source quotes and confidence labels.
          </p>
        </div>
        <Link href="/results" className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white">
          Back to Results
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--line)] bg-white shadow-sm soft-scroll">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="bg-[var(--muted)] text-xs uppercase text-[var(--ink-soft)]">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Extracted Detail</th>
              <th className="px-4 py-3">Context</th>
              <th className="px-4 py-3">Confidence</th>
              <th className="px-4 py-3">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {analysis?.events.length ? (
              analysis.events.map((event) => (
                <tr key={event.id}>
                  <td className="px-4 py-4 font-medium">{event.date}</td>
                  <td className="px-4 py-4 capitalize">{event.type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-4">
                    <div>{event.name}</div>
                    {event.severity ? <div className="text-xs text-[var(--ink-soft)]">Severity {event.severity}/10</div> : null}
                    {event.dose ? <div className="text-xs text-[var(--ink-soft)]">Dose {event.dose}</div> : null}
                  </td>
                  <td className="px-4 py-4 text-[var(--ink-soft)]">{event.context || event.change || "Not stated"}</td>
                  <td className="px-4 py-4 capitalize">{event.confidence}</td>
                  <td className="px-4 py-4 text-[var(--ink-soft)]">{event.sourceQuote}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-12 text-center text-[var(--ink-soft)]" colSpan={6}>
                  {ready ? "Run an analysis to fill this page." : "Loading timeline."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
