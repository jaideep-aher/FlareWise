import type { HealthEvent, LocalModelResult, SafetyFlag, TriageScore } from "@/lib/types";

const durationPattern = /\b(?:[5-9]|1\d|2\d|3\d)\s*(?:days?|weeks?|months?)\b/i;

// Negation guard reused from the safety rules: a term only counts if it is not
// preceded by a negation word inside the same clause ("no chest pain").
const negationPattern =
  /\b(no|not|never|without|denies|denied|deny|negative for|free of|ruled out|don't have|doesn't have|didn't have)\b[^.?!,;]*$/;

function mentions(lower: string, term: string): boolean {
  let from = 0;
  while (true) {
    const index = lower.indexOf(term, from);
    if (index === -1) return false;
    const clauseBefore = lower.slice(Math.max(0, index - 40), index);
    if (!negationPattern.test(clauseBefore)) return true;
    from = index + term.length;
  }
}

function any(lower: string, terms: string[]): boolean {
  return terms.some((term) => mentions(lower, term));
}

// Deterministic red-flag combinations. Each fires only when ALL of its parts
// appear (negation-aware). These are the clinical "do not miss" pairings that
// must escalate care regardless of what the statistical model predicts — the
// rules are the safety net under the ML.
const redFlagRules: Array<{ label: string; test: (lower: string) => boolean }> = [
  {
    label: "Chest pain with breathing difficulty",
    test: (l) =>
      any(l, ["chest pain", "chest pressure", "chest tightness"]) &&
      any(l, ["shortness of breath", "short of breath", "can't breathe", "cannot breathe", "trouble breathing"])
  },
  {
    label: "Chest pain radiating to arm or jaw",
    test: (l) =>
      any(l, ["chest pain", "chest pressure"]) &&
      any(l, ["left arm", "jaw", "radiating"])
  },
  {
    label: "Severe headache with neurological signs",
    test: (l) =>
      any(l, ["worst headache", "severe headache", "thunderclap"]) &&
      any(l, ["vision", "confusion", "weakness", "numbness", "slurred", "trouble speaking"])
  },
  {
    label: "Fever with stiff neck",
    test: (l) => any(l, ["fever", "high fever"]) && any(l, ["stiff neck", "neck stiffness"])
  },
  {
    label: "Abdominal pain with bleeding",
    test: (l) =>
      any(l, ["abdominal pain", "stomach pain", "belly pain"]) &&
      any(l, ["blood in stool", "vomiting blood", "black stool", "bloody"])
  },
  {
    label: "Sudden weakness or speech difficulty",
    test: (l) =>
      any(l, ["sudden weakness", "face drooping", "slurred speech", "can't speak", "trouble speaking"])
  }
];

function detectRedFlags(notes: string): string[] {
  const lower = notes.toLowerCase();
  return redFlagRules.filter((rule) => rule.test(lower)).map((rule) => rule.label);
}

function highestSeverity(events: HealthEvent[]) {
  return events.reduce((highest, event) => {
    if (typeof event.severity !== "number") return highest;
    return Math.max(highest, event.severity);
  }, 0);
}

function uniqueReasons(reasons: string[]) {
  return [...new Set(reasons)].slice(0, 6);
}

function urgencyFromScore(score: number): TriageScore["urgencyLevel"] {
  if (score >= 90) return 5;
  if (score >= 70) return 4;
  if (score >= 45) return 3;
  if (score >= 20) return 2;
  return 1;
}

function actionFor(level: TriageScore["level"]): string {
  switch (level) {
    case "Emergency":
      return "Seek emergency care now (call emergency services or go to the ER).";
    case "Priority":
      return "Contact a clinician today or use urgent care.";
    case "Soon":
      return "Book an appointment within the next few days.";
    default:
      return "Mention this at your next routine visit.";
  }
}

export function scoreTriage({
  notes,
  events,
  safetyFlags,
  localModel
}: {
  notes: string;
  events: HealthEvent[];
  safetyFlags: SafetyFlag[];
  localModel: LocalModelResult;
}): TriageScore {
  const reasons: string[] = [];
  const lower = notes.toLowerCase();
  const severity = highestSeverity(events);
  const redFlags = detectRedFlags(notes);
  const hasEmergencyTrigger = safetyFlags.some((flag) => flag.level === "emergency");
  const hasUrgentTrigger = safetyFlags.some((flag) => flag.level === "urgent_warning");
  let score = 20;

  // Red-flag combinations are the hard safety net: they push care up the scale
  // no matter what the model thinks.
  if (redFlags.length > 0) {
    score = Math.max(score, 92);
    for (const flag of redFlags) reasons.push(`Red flag: ${flag}.`);
  }

  if (hasEmergencyTrigger) {
    score = 95;
    reasons.push("Emergency trigger terms were detected.");
  } else if (hasUrgentTrigger) {
    score = Math.max(score, 82);
    reasons.push("Urgent trigger terms were detected.");
  } else if (safetyFlags.some((flag) => flag.level === "doctor_discussion")) {
    score = Math.max(score, 68);
    reasons.push("The note includes high symptom severity.");
  }

  if (severity >= 9) {
    score = Math.max(score, 78);
    reasons.push(`Reported severity is ${severity}/10.`);
  } else if (severity >= 7) {
    score = Math.max(score, 62);
    reasons.push(`Reported severity is ${severity}/10.`);
  }

  if (durationPattern.test(lower)) {
    score += 8;
    reasons.push("Symptoms have lasted several days or more.");
  }

  if (localModel.priority === "Priority Review" && localModel.priorityConfidence >= 0.45) {
    score = Math.max(score, 72);
    reasons.push("The local model found a priority-review signal.");
  } else if (localModel.priority === "Clinician Discussion" && localModel.priorityConfidence >= 0.45) {
    score = Math.max(score, 58);
    reasons.push("The local model found a clinician-discussion signal.");
  }

  if (events.some((event) => event.type === "medication")) {
    score += 4;
    reasons.push("Medication or treatment was mentioned.");
  }

  const finalScore = Math.min(100, Math.max(0, Math.round(score)));
  // Only a true emergency trigger or a red-flag combination may exceed 89.
  const cappedScore =
    hasEmergencyTrigger || redFlags.length > 0 ? finalScore : Math.min(finalScore, 89);

  const level: TriageScore["level"] =
    cappedScore >= 90
      ? "Emergency"
      : cappedScore >= 70
        ? "Priority"
        : cappedScore >= 45
          ? "Soon"
          : "Routine";

  const timeframe =
    level === "Emergency"
      ? "Now"
      : level === "Priority"
        ? "Same day or next available clinician advice"
        : level === "Soon"
          ? "Within a few days or at the scheduled visit"
          : "Bring up at the next routine visit";

  return {
    score: cappedScore,
    level,
    urgencyLevel: urgencyFromScore(cappedScore),
    timeframe,
    action: actionFor(level),
    reasons: uniqueReasons(
      reasons.length ? reasons : ["No urgent trigger terms or high severity were detected."]
    ),
    redFlags
  };
}
