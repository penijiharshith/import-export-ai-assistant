import Groq from "groq-sdk";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

export async function chat(
  messages: { role: string; content: string }[],
  options?: { temperature?: number; json?: boolean }
): Promise<string> {
  const response = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: messages as ChatCompletionMessageParam[],
    temperature: options?.temperature ?? 0.7,
    response_format: options?.json ? { type: "json_object" } : undefined,
  });
  return response.choices[0].message.content ?? "";
}
