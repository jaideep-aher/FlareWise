import { NextResponse } from "next/server";
import { z } from "zod";
import { runAnalysis } from "@/lib/gemini";
import { classifyWithLocalModel } from "@/lib/localModel";
import { detectSafetyFlags } from "@/lib/safety";
import { scoreTriage } from "@/lib/triage";
import { compareOpinions } from "@/lib/agreement";

const requestSchema = z.object({
  notes: z.string().min(20).max(12000)
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

    const safetyFlags = detectSafetyFlags(parsed.data.notes);
    const localModel = classifyWithLocalModel(parsed.data.notes);
    const result = await runAnalysis(parsed.data.notes, safetyFlags, localModel);
    const triage = scoreTriage({
      notes: parsed.data.notes,
      events: result.events,
      safetyFlags,
      localModel
    });
    const agreement = compareOpinions(triage, localModel);

    return NextResponse.json({ ...result, triage, agreement, localModel });
  } catch (error) {
    return NextResponse.json({ error: providerMessage(error) }, { status: 500 });
  }
}
