export const GMAIL_PROVIDER_TOKEN_COOKIE = "gmail_provider_token";
export const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
export const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

type GoogleTokenInfoResponse = {
  scope?: string;
  expires_in?: number;
};

export type GmailPermissionDebug = {
  providerTokenExists: boolean;
  gmailPermissionGranted: boolean;
  scopesGranted: string[];
};

type GmailHeader = {
  name?: string;
  value?: string;
};

type GmailListResponse = {
  messages?: Array<{ id: string }>;
};

type GmailMessageResponse = {
  id: string;
  internalDate?: string;
  snippet?: string;
  payload?: GmailPayload;
};

type GmailPayload = {
  mimeType?: string;
  headers?: GmailHeader[];
  body?: {
    data?: string;
  };
  parts?: GmailPayload[];
};

export type GmailMessagePreview = {
  gmail_message_id: string;
  sender: string;
  subject: string;
  snippet: string;
  body: string;
  received_at: string | null;
};

export async function getGoogleTokenScopes(accessToken: string): Promise<string[]> {
  const tokenInfoUrl = new URL("https://www.googleapis.com/oauth2/v1/tokeninfo");
  tokenInfoUrl.searchParams.set("access_token", accessToken);

  const response = await fetch(tokenInfoUrl.toString(), {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Google token info request failed: ${response.status} ${details}`);
  }

  const tokenInfo = (await response.json()) as GoogleTokenInfoResponse;

  return tokenInfo.scope?.split(" ").filter(Boolean) ?? [];
}

function getHeader(headers: GmailHeader[] | undefined, headerName: string) {
  return headers?.find((header) => header.name?.toLowerCase() === headerName.toLowerCase())?.value ?? "";
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");

  return Buffer.from(padded, "base64").toString("utf8");
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeBodyText(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function collectBodyParts(payload: GmailPayload | undefined, parts: { plain: string[]; html: string[] }) {
  if (!payload) {
    return;
  }

  const data = payload.body?.data;
  const mimeType = payload.mimeType?.toLowerCase() ?? "";

  if (data && mimeType.includes("text/plain")) {
    parts.plain.push(normalizeBodyText(decodeBase64Url(data)));
  } else if (data && mimeType.includes("text/html")) {
    parts.html.push(stripHtml(decodeBase64Url(data)));
  }

  payload.parts?.forEach((part) => {
    collectBodyParts(part, parts);
  });
}

export function decodeGmailMessageBody(message: Pick<GmailMessageResponse, "payload" | "snippet">) {
  const { payload } = message;
  const parts = { plain: [] as string[], html: [] as string[] };

  collectBodyParts(payload, parts);

  if (parts.plain.length > 0) {
    return normalizeBodyText(parts.plain.join("\n\n"));
  }

  if (parts.html.length > 0) {
    return normalizeBodyText(parts.html.join("\n\n"));
  }

  if (payload?.body?.data) {
    return normalizeBodyText(decodeBase64Url(payload.body.data));
  }

  return normalizeBodyText(message.snippet ?? "");
}

export function validateSyncedBodyLength(body: string, snippet: string) {
  return {
    bodyLength: body.length,
    snippetLength: snippet.length,
    bodyLongerThanSnippet: body.length > snippet.length,
  };
}

async function gmailFetch<T>(accessToken: string, url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Gmail API request failed: ${response.status} ${details}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchLatestGmailMessages(accessToken: string, maxResults = 10): Promise<GmailMessagePreview[]> {
  const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  listUrl.searchParams.set("maxResults", String(maxResults));
  listUrl.searchParams.set("labelIds", "INBOX");

  const messageList = await gmailFetch<GmailListResponse>(accessToken, listUrl.toString());

  if (!messageList.messages?.length) {
    return [];
  }

  return Promise.all(
    messageList.messages.map(async (message) => {
      const detailUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`);
      detailUrl.searchParams.set("format", "full");

      const details = await gmailFetch<GmailMessageResponse>(accessToken, detailUrl.toString());
      const receivedAt = details.internalDate ? new Date(Number(details.internalDate)).toISOString() : null;
      const snippet = details.snippet ?? "";
      const body = decodeGmailMessageBody(details);

      return {
        gmail_message_id: details.id,
        sender: getHeader(details.payload?.headers, "From") || "Unknown sender",
        subject: getHeader(details.payload?.headers, "Subject") || "(No subject)",
        snippet,
        body,
        received_at: receivedAt,
      };
    })
  );
}
