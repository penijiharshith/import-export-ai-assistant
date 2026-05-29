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
  payload?: {
    headers?: GmailHeader[];
  };
};

export type GmailMessagePreview = {
  gmail_message_id: string;
  sender: string;
  subject: string;
  snippet: string;
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
      detailUrl.searchParams.set("format", "metadata");
      detailUrl.searchParams.append("metadataHeaders", "From");
      detailUrl.searchParams.append("metadataHeaders", "Subject");

      const details = await gmailFetch<GmailMessageResponse>(accessToken, detailUrl.toString());
      const receivedAt = details.internalDate ? new Date(Number(details.internalDate)).toISOString() : null;

      return {
        gmail_message_id: details.id,
        sender: getHeader(details.payload?.headers, "From") || "Unknown sender",
        subject: getHeader(details.payload?.headers, "Subject") || "(No subject)",
        snippet: details.snippet ?? "",
        received_at: receivedAt,
      };
    })
  );
}
