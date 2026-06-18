import type { AgreementReport, LocalModelResult, TriageScore } from "@/lib/types";

// Compares two independent opinions about how urgent the visit is:
//   1. the rule-based triage verdict (deterministic safety net), and
//   2. the trained local classifier's appointment-priority head (statistics).
//
// When they disagree we surface it rather than hide it. A model that misses an
// urgency the rules caught is exactly the kind of limitation the evaluation is
// meant to expose, and the rules always win on the final call.

function ruleRank(level: TriageScore["level"]): number {
  switch (level) {
    case "Emergency":
      return 4;
    case "Priority":
      return 3;
    case "Soon":
      return 2;
    default:
      return 1;
  }
}

function modelRank(priority: string): number {
  const p = priority.toLowerCase();
  if (p.includes("priority") || p.includes("urgent") || p.includes("emergency")) return 3;
  if (p.includes("clinician") || p.includes("discussion") || p.includes("soon")) return 2;
  if (p.includes("routine") || p.includes("self") || p.includes("monitor")) return 1;
  return 0; // mixed / insufficient / unknown
}

export function compareOpinions(
  triage: TriageScore,
  localModel: LocalModelResult
): AgreementReport {
  const ruleVerdict = triage.level;
  const modelVerdict = localModel.priority;
  const rRank = ruleRank(ruleVerdict);
  const mRank = modelRank(modelVerdict);

  // The model couldn't form a usable priority opinion.
  if (mRank === 0) {
    return {
      ruleVerdict,
      modelVerdict,
      modelConfidence: localModel.priorityConfidence,
      agree: false,
      note: `The local model did not produce a usable priority signal (${modelVerdict}), so the rule-based triage of "${ruleVerdict}" stands on its own.`
    };
  }

  const gap = Math.abs(rRank - mRank);
  const agree = gap <= 1;

  let note: string;
  if (agree) {
    note = `Both the rule-based triage and the trained model point to a similar urgency, which raises confidence in the "${ruleVerdict}" call.`;
  } else if (rRank > mRank) {
    note = `The rules escalated to "${ruleVerdict}" while the model leaned toward "${modelVerdict}" (${Math.round(
      localModel.priorityConfidence * 100
    )}%). The rules win on safety, but this gap is worth a human glance.`;
  } else {
    note = `The model suggested a higher urgency ("${modelVerdict}", ${Math.round(
      localModel.priorityConfidence * 100
    )}%) than the rules ("${ruleVerdict}"). The note may contain wording the keyword rules did not catch.`;
  }

  return {
    ruleVerdict,
    modelVerdict,
    modelConfidence: localModel.priorityConfidence,
    agree,
    note
  };
}
