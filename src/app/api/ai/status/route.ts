import { NextResponse } from "next/server";
import { OLLAMA_MODEL } from "@/lib/ai/ollama";

export function GET() {
  return NextResponse.json({
    enabled: true,
    provider: "ollama",
    model: OLLAMA_MODEL,
  });
}
