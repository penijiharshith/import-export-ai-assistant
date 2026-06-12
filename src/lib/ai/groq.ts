import Groq, { RateLimitError } from "groq-sdk";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";

const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
export const AI_CONFIGURATION_ERROR_MESSAGE =
  "AI service configuration is invalid. Check the server environment variables.";
export const AI_PROVIDER_ERROR_MESSAGE = "AI service is temporarily unavailable. Please try again.";
export const AI_RATE_LIMIT_ERROR_MESSAGE = "AI quota reached. Please try again later.";

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

export class AiRateLimitError extends Error {
  constructor(readonly retryAfterSeconds: number | null) {
    super(AI_RATE_LIMIT_ERROR_MESSAGE);
    this.name = "AiRateLimitError";
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

export function aiRateLimitErrorBody(retryAfterSeconds: number | null) {
  return {
    ok: false,
    code: "AI_RATE_LIMITED",
    rateLimited: true,
    ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
    error: retryAfterSeconds
      ? `AI quota reached. Try again in about ${formatRetryMinutes(retryAfterSeconds)}.`
      : AI_RATE_LIMIT_ERROR_MESSAGE,
  };
}

export function getGroqModel() {
  return GROQ_MODEL;
}

export function isAiConfigurationError(error: unknown) {
  return error instanceof AiConfigurationError;
}

export function isAiRateLimitError(error: unknown) {
  return error instanceof AiRateLimitError;
}

export function formatRetryMinutes(retryAfterSeconds: number) {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));

  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}

function getHeaderValue(headers: unknown, headerName: string) {
  if (!headers || typeof headers !== "object") {
    return null;
  }

  if (typeof (headers as { get?: unknown }).get === "function") {
    return (headers as { get: (name: string) => string | null }).get(headerName);
  }

  const record = headers as Record<string, unknown>;
  const lowerHeaderName = headerName.toLowerCase();
  const entry = Object.entries(record).find(([key]) => key.toLowerCase() === lowerHeaderName);
  const value = entry?.[1];

  return typeof value === "string" ? value : null;
}

function parseRetryAfterSeconds(headers: unknown) {
  const retryAfterMs = getHeaderValue(headers, "retry-after-ms");
  const retryAfter = getHeaderValue(headers, "retry-after");

  if (retryAfterMs) {
    const milliseconds = Number(retryAfterMs);

    return Number.isFinite(milliseconds) && milliseconds > 0 ? Math.ceil(milliseconds / 1000) : null;
  }

  if (!retryAfter) {
    return null;
  }

  const seconds = Number(retryAfter);

  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.ceil(seconds);
  }

  const retryDate = Date.parse(retryAfter);

  return Number.isFinite(retryDate) ? Math.max(1, Math.ceil((retryDate - Date.now()) / 1000)) : null;
}

function createGroqClient() {
  const apiKey = process.env.GROQ_API_KEY?.trim();

  if (!apiKey) {
    throw new AiConfigurationError();
  }

  return new Groq({ apiKey, maxRetries: 0, timeout: 30_000 });
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

    if (error instanceof RateLimitError || (error as { status?: unknown })?.status === 429) {
      throw new AiRateLimitError(parseRetryAfterSeconds((error as { headers?: unknown }).headers));
    }

    throw new AiProviderError(AI_PROVIDER_ERROR_MESSAGE, { cause: error });
  }
}
