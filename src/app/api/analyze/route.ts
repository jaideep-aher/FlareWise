import { NextResponse } from "next/server";
import { z } from "zod";
import { runAnalysis } from "@/lib/gemini";
import { classifyWithLocalModel } from "@/lib/localModel";
import { detectSafetyFlags } from "@/lib/safety";
import { scoreTriage } from "@/lib/triage";
import { compareDomains } from "@/lib/agreement";
import { classifyWithTransformer } from "@/lib/transformerModel";

const requestSchema = z.object({
  notes: z.string().min(20).max(12000),
  // Patient answers only (no question text). Used for keyword/rule-based
  // detection so the intake question wording does not trigger false flags.
  answersText: z.string().max(12000).optional()
});

function providerMessage(error: unknown) {
  if (!(error instanceof Error)) return "Analysis failed. Check the notes and try again.";

  if (error.message === "GEMINI_API_KEY is missing") {
    return "GEMINI_API_KEY is missing. Add it to .env.local and restart the dev server.";
  }

  if (error.message.includes("API key not valid")) {
    return "Gemini rejected the API key as invalid. Add a valid Gemini API key to .env.local and restart the dev server.";
  }

  return "Analysis failed. Check the Gemini API key, model access, and notes, then try again.";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Enter at least a few symptom notes before analysis." },
        { status: 400 }
      );
    }

    // Rule-based detection and the trained classifiers must only see the
    // patient's answers, never the question wording (which can itself contain
    // red-flag phrases like "trouble speaking"). The LLM still gets the full
    // question + answer notes for context.
    const ruleText =
      parsed.data.answersText && parsed.data.answersText.trim().length >= 8
        ? parsed.data.answersText
        : parsed.data.notes;

    const safetyFlags = detectSafetyFlags(ruleText);
    const localModel = classifyWithLocalModel(ruleText);
    // Run the LLM analysis and the fine-tuned transformer concurrently.
    const [result, transformer] = await Promise.all([
      runAnalysis(parsed.data.notes, safetyFlags, localModel),
      classifyWithTransformer(ruleText)
    ]);
    const triage = scoreTriage({
      notes: ruleText,
      events: result.events,
      safetyFlags,
      localModel
    });
    const agreement = compareDomains(localModel, transformer);

    return NextResponse.json({ ...result, triage, agreement, transformer, localModel });
  } catch (error) {
    return NextResponse.json({ error: providerMessage(error) }, { status: 500 });
  }
}
