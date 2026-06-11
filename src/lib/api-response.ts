type ApiErrorLike = {
  error?: unknown;
  message?: unknown;
};

export async function readJsonResponse(response: Response): Promise<unknown> {
  const body = await response.text();

  if (!body.trim()) {
    return null;
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

export function getUserFacingApiError(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") {
    return fallback;
  }

  const candidate = data as ApiErrorLike;

  if (typeof candidate.error === "string" && candidate.error.trim()) {
    return candidate.error;
  }

  if (typeof candidate.message === "string" && candidate.message.trim()) {
    return candidate.message;
  }

  return fallback;
}
