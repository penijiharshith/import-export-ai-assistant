import Groq from "groq-sdk";

export const GROQ_MODEL = "llama-3.3-70b-versatile";

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export function assertGroqApiKey() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured.");
  }
}

export function getGroqJsonContent(response: {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}) {
  const content = response.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Groq response did not include JSON content.");
  }

  return content;
}
