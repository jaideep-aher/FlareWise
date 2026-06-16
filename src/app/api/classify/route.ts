import { NextResponse } from "next/server";
import { z } from "zod";
import { classifyWithLocalModel } from "@/lib/localModel";
const requestSchema = z.object({
  text: z.string().min(1).max(12000)
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Provide some text to classify." }, { status: 400 });
    }

    return NextResponse.json(classifyWithLocalModel(parsed.data.text));
  } catch {
    return NextResponse.json({ error: "Local classification failed." }, { status: 500 });
  }
}
