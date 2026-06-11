import Groq from "groq-sdk";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";

const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
export const AI_CONFIGURATION_ERROR_MESSAGE =
  "AI service configuration is invalid. Check the server environment variables.";
export const AI_PROVIDER_ERROR_MESSAGE = "AI service is temporarily unavailable. Please try again.";

export class AiConfigurationError extends Error {
  constructor() {
    super(AI_CONFIGURATION_ERROR_MESSAGE);
    this.name = "AiConfigurationError";
  }
}

export class AiProviderError extends Error {
  constructor(message = AI_PROVIDER_ERROR_MESSAGE, options?: ErrorOptions) {
    super(message, options);
    this.name = "AiProviderError";
  }
}

export function isAiConfigured() {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

export function aiConfigurationErrorBody() {
  return {
    ok: false,
    error: AI_CONFIGURATION_ERROR_MESSAGE,
  };
}

export function aiProviderErrorBody() {
  return {
    ok: false,
    error: AI_PROVIDER_ERROR_MESSAGE,
  };
}

export function getGroqModel() {
  return GROQ_MODEL;
}

export function isAiConfigurationError(error: unknown) {
  return error instanceof AiConfigurationError;
}

function createGroqClient() {
  const apiKey = process.env.GROQ_API_KEY?.trim();

  if (!apiKey) {
    throw new AiConfigurationError();
  }

  return new Groq({ apiKey });
}

export async function chat(
  messages: { role: string; content: string }[],
  options?: { temperature?: number; json?: boolean }
): Promise<string> {
  try {
    const response = await createGroqClient().chat.completions.create({
      model: GROQ_MODEL,
      messages: messages as ChatCompletionMessageParam[],
      temperature: options?.temperature ?? 0.7,
      response_format: options?.json ? { type: "json_object" } : undefined,
    });
    const content = response.choices[0]?.message.content;

    if (!content?.trim()) {
      throw new AiProviderError("AI provider returned an empty response.");
    }

    return content;
  } catch (error) {
    if (isAiConfigurationError(error) || error instanceof AiProviderError) {
      throw error;
    }

    throw new AiProviderError(AI_PROVIDER_ERROR_MESSAGE, { cause: error });
  }
}
