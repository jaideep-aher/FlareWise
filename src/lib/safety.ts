import type { SafetyFlag } from "@/lib/types";

const emergencyTerms = [
  "severe chest pain",
  "crushing chest pain",
  "stroke",
  "face drooping",
  "can't breathe",
  "cannot breathe",
  "suicidal",
  "suicide",
  "anaphylaxis",
  "throat closing",
  "fainted",
  "passed out"
];

const urgentTerms = [
  "chest pain",
  "shortness of breath",
  "blood in stool",
  "worst headache",
  "high fever",
  "vision loss",
  "new weakness",
  "confusion"
];
const negationPattern =
  /\b(no|not|never|without|denies|denied|deny|negative for|free of|ruled out|don't have|doesn't have|didn't have)\b[^.?!,;]*$/;

function hasUnnegatedMention(lower: string, term: string): boolean {
  let from = 0;

  while (true) {
    const index = lower.indexOf(term, from);
    if (index === -1) return false;
    const clauseBefore = lower.slice(Math.max(0, index - 40), index);
    if (!negationPattern.test(clauseBefore)) return true;

    from = index + term.length;
  }
}

export function detectSafetyFlags(input: string): SafetyFlag[] {
  const lower = input.toLowerCase();
  const flags: SafetyFlag[] = [];

  for (const term of emergencyTerms) {
    if (hasUnnegatedMention(lower, term)) {
      flags.push({
        level: "emergency",
        term,
        message:
          "Emergency language detected. If this reflects current symptoms, contact emergency services or a qualified clinician now."
      });
    }
  }

  for (const term of urgentTerms) {
    if (hasUnnegatedMention(lower, term)) {
      flags.push({
        level: "urgent_warning",
        term,
        message:
          "Urgent risk language detected. This app cannot assess severity, so discuss this with a qualified clinician promptly."
      });
    }
  }

  if (flags.length === 0) {
    flags.push({
      level: "routine",
      term: "routine tracking",
      message:
        "No urgent trigger terms were detected by the rule based safety check."
    });
  }

  return flags;
}
