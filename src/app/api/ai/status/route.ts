import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    enabled: true,
    provider: "groq",
    model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
  });
}
