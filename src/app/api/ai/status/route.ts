import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    enabled: Boolean(process.env.GROQ_API_KEY),
  });
}
