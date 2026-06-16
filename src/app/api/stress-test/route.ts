import { NextResponse } from "next/server";
import { runStressTests } from "@/lib/gemini";

function providerMessage(error: unknown) {
  if (!(error instanceof Error)) return "Stress test failed. Try again after checking the API key.";

  if (error.message === "GEMINI_API_KEY is missing") {
    return "GEMINI_API_KEY is missing. Add it to .env.local and restart the dev server.";
  }

  if (error.message.includes("API key not valid")) {
    return "Gemini rejected the API key as invalid. Add a valid Gemini API key to .env.local and restart the dev server.";
  }

  return "Stress test failed. Check the Gemini API key and model access, then try again.";
}

export async function POST() {
  try {
    const result = await runStressTests();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: providerMessage(error) }, { status: 500 });
  }
}
