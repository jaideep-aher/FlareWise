import type { HealthEvent, LocalModelResult, SafetyFlag, TriageScore } from "@/lib/types";

const durationPattern = /\b(?:[5-9]|1\d|2\d|3\d)\s*(?:days?|weeks?|months?)\b/i;

function highestSeverity(events: HealthEvent[]) {
  return events.reduce((highest, event) => {
    if (typeof event.severity !== "number") return highest;
    return Math.max(highest, event.severity);
  }, 0);
}

function uniqueReasons(reasons: string[]) {
  return [...new Set(reasons)].slice(0, 5);
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
  const hasEmergencyTrigger = safetyFlags.some((flag) => flag.level === "emergency");
  const hasUrgentTrigger = safetyFlags.some((flag) => flag.level === "urgent_warning");
  let score = 20;

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
  const cappedScore = hasEmergencyTrigger ? finalScore : Math.min(finalScore, 89);

  if (cappedScore >= 90) {
    return {
      score: cappedScore,
      level: "Emergency",
      timeframe: "Now",
      reasons: uniqueReasons(reasons)
    };
  }

  if (cappedScore >= 70) {
    return {
      score: cappedScore,
      level: "Priority",
      timeframe: "Same day or next available clinician advice",
      reasons: uniqueReasons(reasons)
    };
  }

  if (cappedScore >= 45) {
    return {
      score: cappedScore,
      level: "Soon",
      timeframe: "Within a few days or at the scheduled visit",
      reasons: uniqueReasons(reasons)
    };
  }

  return {
    score: cappedScore,
    level: "Routine",
    timeframe: "Bring up at the next routine visit",
    reasons: uniqueReasons(reasons.length ? reasons : ["No urgent trigger terms or high severity were detected."])
  };
}
