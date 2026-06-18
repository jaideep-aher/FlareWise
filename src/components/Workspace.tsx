"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Cpu,
  Eraser,
  Loader2,
  Pencil,
  Send,
  Sparkles
} from "lucide-react";
import type { AnalysisResult, Demographics, LocalModelResult } from "@/lib/types";

const storageKey = "flarewise.latestAnalysis";
const notesKey = "flarewise.notes";
const answersKey = "flarewise.intakeAnswers";
const queueKey = "flarewise.intakeQueue";
const stepKey = "flarewise.intakeStep";
const demographicsKey = "flarewise.demographics";

const emptyDemographics: Demographics = {
  name: "",
  age: "",
  sex: "",
  primaryCare: "",
  allergies: "",
  currentMedications: ""
};

type IntakeQuestion = {
  id: string;
  short: string;
  question: string;
  placeholder: string;
};

// Core questions everyone answers, in order.
const BASE_QUESTIONS: IntakeQuestion[] = [
  {
    id: "main_concern",
    short: "Main concern",
    question: "What is the main problem you want the doctor to focus on first?",
    placeholder: "e.g. Persistent dizziness and headaches that make it hard to focus at work"
  },
  {
    id: "timeline",
    short: "Timeline",
    question: "When did it start, and has it been getting better, worse, or staying the same?",
    placeholder: "e.g. Started about 5 days ago. Worse in the mornings, slightly better after resting"
  },
  {
    id: "severity",
    short: "Location & severity",
    question: "Where do you feel it, and how bad is it on a scale of 0 to 10?",
    placeholder: "e.g. Front of head and behind the eyes. Pain is about 6/10 most days"
  },
  {
    id: "pattern",
    short: "Pattern & triggers",
    question: "Is it constant or does it come and go? Anything that makes it better or worse?",
    placeholder: "e.g. Comes in waves. Worse after hot showers and stress, better with sleep"
  },
  {
    id: "associated",
    short: "Other symptoms",
    question: "Are there any other symptoms alongside it, for example fever, nausea, dizziness, or a rash?",
    placeholder: "e.g. Some nausea in the mornings and feeling more tired than usual"
  },
  {
    id: "tried",
    short: "What you tried",
    question: "What have you already tried (medications, doses, or home steps), and did it help?",
    placeholder: "e.g. Ibuprofen 400mg twice daily for 3 days and extra water. Little relief"
  },
  {
    id: "impact_goal",
    short: "Impact & goal",
    question: "How is this affecting your daily life, and what would you most like from this visit?",
    placeholder: "e.g. Hard to concentrate at work. I want to know what's causing it and how to stop it"
  }
];

// Follow-up questions that only appear when an answer mentions something relevant.
const FOLLOWUPS = {
  cardio: {
    id: "fu_cardio",
    short: "Heart & breathing",
    question:
      "You mentioned your chest or breathing. Do you have chest pain, shortness of breath, or a racing heart right now, and since when?",
    placeholder: "e.g. Tight chest and short of breath when I climb stairs, started this morning"
  },
  neuro: {
    id: "fu_neuro",
    short: "Neurological",
    question:
      "Any vision changes, numbness, weakness on one side, or trouble speaking along with this?",
    placeholder: "e.g. Vision goes blurry for a few minutes, no weakness or speech trouble"
  },
  fever: {
    id: "fu_fever",
    short: "Fever details",
    question: "How high has your temperature gotten, and do you have chills, sweats, or a rash?",
    placeholder: "e.g. Up to 38.5°C, chills at night, no rash"
  },
  gi: {
    id: "fu_gi",
    short: "Digestive",
    question: "Any changes in appetite, bowel movements, or blood in your stool?",
    placeholder: "e.g. Less appetite, looser stools for 3 days, no blood"
  },
  bleeding: {
    id: "fu_bleeding",
    short: "Bleeding",
    question: "Where did you notice the blood (stool, urine, vomit, or coughing), and roughly how much?",
    placeholder: "e.g. A small amount of bright red blood in the toilet, once"
  },
  meds: {
    id: "fu_meds",
    short: "Current medications",
    question: "Which medications and doses are you taking regularly now, and have any changed recently?",
    placeholder: "e.g. Atorvastatin 20mg daily; blood pressure med dose raised last month"
  },
  mental: {
    id: "fu_mental",
    short: "Mood & sleep",
    question:
      "How have your mood, stress, and sleep been lately? (It's okay to share, it helps the doctor.)",
    placeholder: "e.g. Anxious most days, sleeping ~4 hours, feeling overwhelmed"
  },
  skin: {
    id: "fu_skin",
    short: "Skin details",
    question:
      "When did the skin change start, is it spreading, and did it follow a new product, food, or medication?",
    placeholder: "e.g. Red itchy patches on both arms, started after a new detergent"
  },
  last_visit: {
    id: "fu_last_visit",
    short: "Since last visit",
    question: "What did your doctor say last time, and what has changed since that visit?",
    placeholder: "e.g. Last visit changed my BP meds. Still dizzy most mornings"
  }
} satisfies Record<string, IntakeQuestion>;

const FOLLOWUP_RULES: Array<{ test: RegExp; question: IntakeQuestion }> = [
  { test: /chest|short(ness)? of breath|can'?t breathe|breathing|palpitation|racing heart/i, question: FOLLOWUPS.cardio },
  { test: /dizz|vision|blurr|numb|weak|migraine|headache|faint|slurred|speech|tingl/i, question: FOLLOWUPS.neuro },
  { test: /fever|temperature|chills|sweats|night sweat/i, question: FOLLOWUPS.fever },
  { test: /stomach|abdom|nausea|vomit|diarrh|constip|bowel|appetite|heartburn/i, question: FOLLOWUPS.gi },
  { test: /blood|bleed/i, question: FOLLOWUPS.bleeding },
  { test: /medication|medicine|\bmeds?\b|pill|dose|dosage|prescrib|tablet|inhaler|insulin/i, question: FOLLOWUPS.meds },
  { test: /stress|anxiet|depress|\bmood\b|sleep|panic|overwhelm/i, question: FOLLOWUPS.mental },
  { test: /rash|itch|hives|\bskin\b|spots|scaly|patches/i, question: FOLLOWUPS.skin },
  { test: /last visit|last time|doctor said|prescrib|diagnos|previous|earlier appointment|changed my/i, question: FOLLOWUPS.last_visit }
];

// Decide which follow-ups a fresh answer unlocks (max 2 at a time, never duplicates).
function deriveFollowUps(answerText: string, presentIds: Set<string>): IntakeQuestion[] {
  const adds: IntakeQuestion[] = [];
  for (const rule of FOLLOWUP_RULES) {
    if (adds.length >= 2) break;
    if (rule.test.test(answerText) && !presentIds.has(rule.question.id)) {
      adds.push(rule.question);
    }
  }
  return adds;
}

const loadingMessages = [
  "Reading your intake answers...",
  "Running the on-device symptom model...",
  "Extracting structured timeline events...",
  "Checking negations and contradictions...",
  "Drafting the doctor-facing brief...",
  "Self-auditing for unsupported claims...",
  "Scoring reliability..."
];

function buildNotes(queue: IntakeQuestion[], answers: Record<string, string>) {
  return queue
    .map((item) => `${item.question}\n${answers[item.id]?.trim() || "Not provided"}`)
    .join("\n\n");
}

function symptomText(answers: Record<string, string>) {
  return Object.values(answers)
    .map((answer) => answer.trim())
    .filter(Boolean)
    .join(". ");
}

export function Workspace() {
  const router = useRouter();
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const classifySeq = useRef(0);

  const [queue, setQueue] = useState<IntakeQuestion[]>(BASE_QUESTIONS);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [signal, setSignal] = useState<LocalModelResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(0);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [demographics, setDemographics] = useState<Demographics>(emptyDemographics);
  const [analysisReady, setAnalysisReady] = useState(false);
  const [demoTouched, setDemoTouched] = useState(false);

  const totalSteps = queue.length;
  const isReview = step >= totalSteps;
  const answeredCount = queue.filter((item) => (answers[item.id] ?? "").trim().length > 0).length;
  const progress = isReview ? 100 : (step / totalSteps) * 100;
  const classifyLive = useCallback(async (nextAnswers: Record<string, string>) => {
    const text = symptomText(nextAnswers);
    if (text.length < 8) {
      setSignal(null);
      return;
    }

    const seq = ++classifySeq.current;
    try {
      const response = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      if (!response.ok) return;
      const payload = (await response.json()) as LocalModelResult;
      if (seq === classifySeq.current) setSignal(payload);
    } catch {
    }
  }, []);
  
  useEffect(() => {
    const savedAnswers = window.localStorage.getItem(answersKey);
    const savedQueue = window.localStorage.getItem(queueKey);
    const savedStep = window.localStorage.getItem(stepKey);
    let restoredAnswers: Record<string, string> = {};
    let restoredQueue = BASE_QUESTIONS;

    if (savedQueue) {
      try {
        const parsed = JSON.parse(savedQueue) as IntakeQuestion[];
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((q) => q?.id && q?.question)) {
          restoredQueue = parsed;
          setQueue(parsed);
        }
      } catch {
      }
    }

    if (savedAnswers) {
      try {
        const parsed = JSON.parse(savedAnswers) as Record<string, string>;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          restoredAnswers = parsed;
          setAnswers(parsed);
        }
      } catch {
      }
    }

    if (savedStep) {
      const value = Number(savedStep);
      if (!Number.isNaN(value) && value >= 0 && value <= restoredQueue.length) {
        setStep(value);
      }
    }

    const savedDemographics = window.localStorage.getItem(demographicsKey);
    if (savedDemographics) {
      try {
        const parsed = JSON.parse(savedDemographics) as Demographics;
        setDemographics({ ...emptyDemographics, ...parsed });
      } catch {
      }
    }

    setHydrated(true);
    classifyLive(restoredAnswers);
  }, [classifyLive]);
  

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(answersKey, JSON.stringify(answers));
    window.localStorage.setItem(queueKey, JSON.stringify(queue));
    window.localStorage.setItem(stepKey, String(step));
  }, [answers, queue, step, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(demographicsKey, JSON.stringify(demographics));
  }, [demographics, hydrated]);

  function updateDemographic<K extends keyof Demographics>(field: K, value: Demographics[K]) {
    setDemoTouched(true);
    setDemographics((previous) => ({ ...previous, [field]: value }));
  }

  // Once the brief is ready, only auto-advance if the patient hasn't started
  // filling in the demographics form. If they have, wait for an explicit click
  // so the fields they are typing into never vanish mid-entry.
  useEffect(() => {
    if (!analysisReady || demoTouched) return;
    const id = window.setTimeout(() => router.push("/results"), 900);
    return () => window.clearTimeout(id);
  }, [analysisReady, demoTouched, router]);

  useEffect(() => {
    if (!hydrated || isReview || thinking || editingId !== null) return;
    composerRef.current?.focus();
  }, [step, hydrated, isReview, thinking, editingId]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [step, thinking, isReview]);

  useEffect(() => {
    if (!loading) return;
    const id = window.setInterval(() => {
      setLoadingMsg((value) => (value + 1) % loadingMessages.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [loading]);

  function updateAnswer(id: string, value: string) {
    setAnswers((previous) => ({ ...previous, [id]: value }));
  }

  function submitCurrent() {
    if (isReview) return;
    const current = queue[step];
    const value = (answers[current.id] ?? "").trim();
    const nextAnswers = { ...answers, [current.id]: value };

    setAnswers(nextAnswers);
    setError("");
    classifyLive(nextAnswers);

    // Adaptive branching: an answer can unlock relevant follow-up questions,
    // inserted right after the current one.
    const presentIds = new Set(queue.map((item) => item.id));
    const followUps = value ? deriveFollowUps(value, presentIds) : [];
    const nextQueue = followUps.length
      ? [...queue.slice(0, step + 1), ...followUps, ...queue.slice(step + 1)]
      : queue;
    if (followUps.length) setQueue(nextQueue);

    setThinking(true);
    window.setTimeout(() => {
      setThinking(false);
      setStep((value) => Math.min(value + 1, nextQueue.length));
    }, 650);
  }

  async function analyze() {
    const notes = buildNotes(queue, answers);
    const answersText = symptomText(answers);
    setLoadingMsg(0);
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, answersText })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Analysis failed");
      }

      window.localStorage.setItem(storageKey, JSON.stringify(payload as AnalysisResult));
      window.localStorage.setItem(notesKey, notes);
      // Don't yank the demographics form away - mark ready and let the overlay
      // either auto-advance (if untouched) or wait for the patient to continue.
      setAnalysisReady(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analysis failed");
      setLoading(false);
    }
  }

  function viewResults() {
    router.push("/results");
  }

  function clearAll() {
    setQueue(BASE_QUESTIONS);
    setAnswers({});
    setStep(0);
    setThinking(false);
    setEditingId(null);
    setSignal(null);
    setDemographics(emptyDemographics);
    setAnalysisReady(false);
    setDemoTouched(false);
    setError("");
    window.localStorage.removeItem(storageKey);
    window.localStorage.removeItem(notesKey);
    window.localStorage.removeItem(answersKey);
    window.localStorage.removeItem(queueKey);
    window.localStorage.removeItem(stepKey);
    window.localStorage.removeItem(demographicsKey);
  }

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="shimmer h-40 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-89px)] max-w-2xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 text-center">
        <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-medium text-[var(--accent-strong)] shadow-sm">
          <Sparkles size={14} />
          Pre-visit intake
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {isReview ? "Review your answers" : "Let's prep for your visit"}
        </h1>
      </div>

      {}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-[var(--ink-soft)]">
          <span>{isReview ? "Ready to generate" : `Question ${Math.min(step + 1, totalSteps)} of ${totalSteps}`}</span>
          <span>{answeredCount} answered</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--muted)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {}
      <OnDeviceSignal signal={signal} answeredCount={answeredCount} />

      {}
      <div
        ref={scrollRef}
        className="soft-scroll mt-4 flex-1 space-y-4 overflow-y-auto pr-1"
      >
        {queue.slice(0, isReview ? totalSteps : step + 1).map((item, index) => {
          const answered = index < step || isReview;
          const isCurrent = index === step && !isReview;

          return (
            <div key={item.id} className="space-y-2">
              {}
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                  <span className="text-xs font-bold">{index + 1}</span>
                </div>
                <div className="bubble-in max-w-[88%] rounded-2xl rounded-tl-sm border border-[var(--line)] bg-white px-4 py-3 text-sm font-medium leading-6 shadow-sm">
                  {item.question}
                </div>
              </div>

              {}
              {answered ? (
                editingId === item.id ? (
                  <div className="ml-auto max-w-[88%]">
                    <textarea
                      autoFocus
                      value={answers[item.id] ?? ""}
                      onChange={(event) => updateAnswer(item.id, event.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-2xl border border-[var(--accent)] bg-white p-3 text-sm leading-6 outline-none ring-4 ring-[var(--accent-ring)]"
                    />
                    <div className="mt-1.5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          classifyLive(answers);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        <Check size={14} />
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="group ml-auto flex max-w-[88%] items-start justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(item.id)}
                      aria-label="Edit answer"
                      className="mt-2 shrink-0 text-[var(--ink-soft)] opacity-0 transition hover:text-[var(--accent-strong)] group-hover:opacity-100"
                    >
                      <Pencil size={14} />
                    </button>
                    <div className="bubble-in rounded-2xl rounded-tr-sm bg-[var(--accent)] px-4 py-3 text-sm leading-6 text-white shadow-sm">
                      {answers[item.id]?.trim() || (
                        <span className="italic text-white/70">Skipped</span>
                      )}
                    </div>
                  </div>
                )
              ) : null}

              {}
              {isCurrent ? (
                thinking ? (
                  <div className="flex items-center gap-2 pl-11">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                ) : (
                  <div className="ml-auto max-w-[88%]">
                    <textarea
                      ref={composerRef}
                      value={answers[item.id] ?? ""}
                      onChange={(event) => updateAnswer(item.id, event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          submitCurrent();
                        }
                      }}
                      rows={3}
                      placeholder={item.placeholder}
                      className="w-full resize-none rounded-2xl border border-[var(--line)] bg-white p-3.5 text-sm leading-6 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-ring)]"
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={submitCurrent}
                        className="text-xs font-medium text-[var(--ink-soft)] underline-offset-2 hover:text-[var(--accent-strong)] hover:underline"
                      >
                        Skip this one
                      </button>
                      <button
                        type="button"
                        onClick={submitCurrent}
                        data-sound="send"
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-strong)]"
                      >
                        {step === totalSteps - 1 ? "Review" : "Send"}
                        {step === totalSteps - 1 ? <ArrowRight size={16} /> : <Send size={16} />}
                      </button>
                    </div>
                    <p className="mt-1.5 text-right text-[11px] text-[var(--ink-soft)]">
                      Enter to send | Shift+Enter for a new line
                    </p>
                  </div>
                )
              ) : null}
            </div>
          );
        })}

        {}
        {isReview ? (
          <div className="bubble-in space-y-3 pt-2">
            <div className="rounded-2xl border border-[var(--line)] bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold">That&apos;s everything.</p>
              <p className="mt-1 text-sm leading-6 text-[var(--ink-soft)]">
                Tap the pencil on any answer above to revise it, then build your doctor-facing
                brief. Generation takes around half a minute.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={analyze}
                disabled={loading || answeredCount === 0}
                data-sound="send"
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
                Generate Doctor Brief
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-white px-5 text-sm font-semibold transition hover:border-[var(--danger)] hover:text-[var(--danger)]"
              >
                <Eraser size={17} />
                Clear
              </button>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      <p className="mt-6 text-center text-xs leading-5 text-[var(--ink-soft)]">
        Mira is not a medical device and does not provide diagnosis or treatment advice.
      </p>

      {loading ? (
        <AnalyzingOverlay
          message={loadingMessages[loadingMsg]}
          signal={signal}
          demographics={demographics}
          onChangeDemographics={updateDemographic}
          ready={analysisReady}
          onContinue={viewResults}
        />
      ) : null}
    </div>
  );
}

function OnDeviceSignal({
  signal,
  answeredCount
}: {
  signal: LocalModelResult | null;
  answeredCount: number;
}) {
  if (answeredCount === 0 || !signal) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-[var(--line)] bg-white/60 px-3.5 py-2.5 text-xs text-[var(--ink-soft)]">
        <Cpu size={15} className="text-[var(--accent)]" />
        On-device NLP model will read your answers as you go - no diagnosis, just a signal.
      </div>
    );
  }
  if (!signal.coverage.sufficient) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-[var(--warning)]/40 bg-amber-50/60 px-3.5 py-2.5 text-xs">
        <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--warning)]">
          <Cpu size={15} />
          On-device read | low signal
        </span>
        <span className="text-[var(--ink-soft)]">
          Only {signal.coverage.inVocabTokens} of {signal.coverage.totalTokens} words match the local
          model&apos;s vocabulary - keep answering for a clearer signal.
        </span>
      </div>
    );
  }
  if (signal.topDomain === "Mixed signal" || signal.priority === "Mixed signal") {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-[var(--line)] bg-white/80 px-3.5 py-2.5 text-xs">
        <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--ink-soft)]">
          <Cpu size={15} />
          On-device read | mixed signal
        </span>
        <span className="text-[var(--ink-soft)]">
          Top candidates:{" "}
          {signal.topPredictions
            .slice(0, 2)
            .map((p) => `${p.domain} ${Math.round(p.confidence * 100)}%`)
            .join(" | ")}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3.5 py-2.5 shadow-sm">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-strong)]">
        <Cpu size={15} />
        On-device read
      </span>
      <span className="text-[var(--line)]">|</span>
      <span className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-medium text-[var(--accent-strong)]">
        {signal.topDomain} {Math.round(signal.confidence * 100)}%
      </span>
      <span className="rounded-md bg-[var(--muted)] px-2 py-0.5 text-xs font-medium text-[var(--foreground)]">
        {signal.priority} {Math.round(signal.priorityConfidence * 100)}%
      </span>
      <span className="ml-auto hidden text-[11px] text-[var(--ink-soft)] sm:inline">
        TF-IDF + LR | {Math.round(signal.testAccuracy * 100)}% intake acc. |{" "}
        {signal.coverage.inVocabTokens}/{signal.coverage.totalTokens} grams matched
      </span>
    </div>
  );
}

function AnalyzingOverlay({
  message,
  signal,
  demographics,
  onChangeDemographics,
  ready,
  onContinue
}: {
  message: string;
  signal: LocalModelResult | null;
  demographics: Demographics;
  onChangeDemographics: <K extends keyof Demographics>(field: K, value: Demographics[K]) => void;
  ready: boolean;
  onContinue: () => void;
}) {
  return (
    <div className="overlay-in fixed inset-0 z-[60] flex items-center justify-center bg-[var(--foreground)]/45 px-4 backdrop-blur-sm">
      <div className="grid w-full max-w-3xl gap-0 overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[var(--shadow-elevated)] md:grid-cols-[0.85fr_1.15fr]">
        {}
        <div className="bg-[var(--foreground)] p-6 text-white">
          <div className="mb-4 h-10 w-10">
            {ready ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)]">
                <Check size={22} />
              </div>
            ) : (
              <div className="ring-spin h-10 w-10 rounded-full border-[3px] border-white/20 border-t-[var(--accent)]" />
            )}
          </div>
          <h2 className="text-lg font-semibold">{ready ? "Your brief is ready" : "Building your brief"}</h2>
          <p className="mt-2 min-h-[44px] text-sm leading-6 text-white/75">
            {ready ? "Finish any details on the right, then open your brief." : message}
          </p>
          {signal && signal.coverage.sufficient ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80">
              On-device model:{" "}
              <span className="font-semibold text-[var(--accent-soft)]">{signal.topDomain}</span>
              {" | "}
              <span className="font-semibold">{signal.priority}</span>
            </div>
          ) : null}
          {ready ? (
            <button
              type="button"
              onClick={onContinue}
              data-sound="send"
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-strong)]"
            >
              View your brief
              <ArrowRight size={16} />
            </button>
          ) : (
            <div className="mt-5 space-y-1.5 text-[11px] text-white/60">
              <p>Usually ~10 seconds.</p>
              <p>Anything you fill in here is saved to your brief.</p>
            </div>
          )}
        </div>

        {}
        <div className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-strong)]">
            While you wait
          </p>
          <h3 className="mt-1 text-base font-semibold">A few details a doctor will want</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <DemoField
              label="Full name"
              value={demographics.name}
              onChange={(value) => onChangeDemographics("name", value)}
              placeholder="Jane Doe"
            />
            <DemoField
              label="Age"
              value={demographics.age}
              onChange={(value) => onChangeDemographics("age", value)}
              placeholder="34"
              inputMode="numeric"
            />
            <div>
              <label className="text-xs font-medium text-[var(--ink-soft)]">Sex</label>
              <select
                value={demographics.sex}
                onChange={(event) => onChangeDemographics("sex", event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-[var(--line)] bg-white px-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-ring)]"
              >
                <option value="">Prefer not to say</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Intersex">Intersex</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <DemoField
              label="Primary care doctor"
              value={demographics.primaryCare}
              onChange={(value) => onChangeDemographics("primaryCare", value)}
              placeholder="Dr. Smith"
            />
            <DemoTextarea
              label="Allergies"
              value={demographics.allergies}
              onChange={(value) => onChangeDemographics("allergies", value)}
              placeholder="Penicillin, peanuts... or 'none known'"
            />
            <DemoTextarea
              label="Current medications"
              value={demographics.currentMedications}
              onChange={(value) => onChangeDemographics("currentMedications", value)}
              placeholder="Atorvastatin 20mg daily, vitamin D"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoField({
  label,
  value,
  onChange,
  placeholder,
  inputMode
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "numeric";
}) {
  return (
    <div>
      <label className="text-xs font-medium text-[var(--ink-soft)]">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="mt-1 h-10 w-full rounded-lg border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-ring)]"
      />
    </div>
  );
}

function DemoTextarea({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="sm:col-span-2">
      <label className="text-xs font-medium text-[var(--ink-soft)]">{label}</label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={2}
        className="mt-1 w-full resize-none rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-ring)]"
      />
    </div>
  );
}
