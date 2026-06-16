"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/lib/types";

const storageKey = "flarewise.latestAnalysis";

export function useSavedAnalysis() {
  const [analysis] = useState<AnalysisResult | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = window.localStorage.getItem(storageKey);
    return saved ? (JSON.parse(saved) as AnalysisResult) : null;
  });

  const ready = true;

  return { analysis, ready };
}
