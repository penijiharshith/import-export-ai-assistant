import { NextResponse } from "next/server";
import { getGroqModel, isAiConfigured } from "@/lib/ai/groq";

export function GET() {
  return NextResponse.json({
    enabled: isAiConfigured(),
    provider: "groq",
    model: getGroqModel(),
  });
}
