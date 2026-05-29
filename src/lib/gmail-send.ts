export type SendGmailReplyInput = {
  accessToken: string;
  to: string;
  subject: string;
  body: string;
  originalMessageId: string | null;
};

type GmailSendResponse = {
  id: string;
  threadId?: string;
  labelIds?: string[];
};

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function sanitizeHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export async function sendGmailReply({
  accessToken,
  to,
  subject,
  body,
  originalMessageId,
}: SendGmailReplyInput): Promise<GmailSendResponse> {
  const headers = [
    `To: ${sanitizeHeader(to)}`,
    `Subject: ${sanitizeHeader(subject)}`,
    "Content-Type: text/plain; charset=UTF-8",
    "MIME-Version: 1.0",
  ];

  if (originalMessageId) {
    headers.push(`References: ${sanitizeHeader(originalMessageId)}`);
    headers.push(`In-Reply-To: ${sanitizeHeader(originalMessageId)}`);
  }

  const raw = encodeBase64Url(`${headers.join("\r\n")}\r\n\r\n${body}`);

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Gmail send failed: ${response.status} ${details}`);
  }

  return response.json() as Promise<GmailSendResponse>;
}
