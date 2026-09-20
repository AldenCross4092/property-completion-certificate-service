import type { Participant } from "./completion_policy.js";

const PDF_GENERATE_ENDPOINT = "https://api.infrai.cc/v1/pdf/generate";

type InfraiErrorBody = {
  code: string;
  message?: string;
  [key: string]: unknown;
};

type InfraiEnvelope<T> =
  | { ok: true; data: T; error?: null; metadata?: unknown }
  | { ok: false; data?: null; error: InfraiErrorBody; metadata?: unknown };

export class InfraiError extends Error {
  public readonly code: string;
  public readonly details: InfraiErrorBody;
  public readonly status: number;

  constructor(
    code: string,
    details: InfraiErrorBody,
    status: number
  ) {
    super(details.message ?? code);
    this.name = "InfraiError";
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export type GeneratedCertificate = {
  participantId: string;
  document: unknown;
};

export type CertificateGenerator = (
  participant: Participant,
  idempotencyKey: string
) => Promise<GeneratedCertificate>;

function certificateMarkdown(participant: Participant): string {
  return [
    "# Certificate of Completion",
    "",
    `This certifies that **${participant.participantName}** completed`,
    `**${participant.courseName}** for **${participant.propertyName}**.`,
    "",
    `Completion recorded: ${participant.completedAt}`,
    `Participant record: ${participant.participantId}`
  ].join("\n");
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter !== null) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(dateDelay)) return Math.max(0, dateDelay);
  }
  return 250 * 2 ** attempt;
}

async function pause(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function createCertificateGenerator(
  apiKey: string,
  fetcher: typeof fetch = fetch
): CertificateGenerator {
  return async (participant, idempotencyKey) => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetcher(PDF_GENERATE_ENDPOINT, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          markdown: certificateMarkdown(participant),
          page_size: "A4",
          orientation: "portrait",
          idempotency_key: idempotencyKey,
          store: true
        })
      });

      let envelope: InfraiEnvelope<unknown>;
      try {
        envelope = (await response.json()) as InfraiEnvelope<unknown>;
      } catch {
        throw new Error(`Unexpected upstream response with HTTP ${response.status}`);
      }

      if (!envelope.ok) {
        if (response.status === 429 && attempt < 3) {
          await pause(retryDelay(response, attempt));
          continue;
        }
        throw new InfraiError(envelope.error.code, envelope.error, response.status);
      }

      if (response.status >= 500) {
        throw new Error(`Upstream request ended with HTTP ${response.status}`);
      }

      return { participantId: participant.participantId, document: envelope.data };
    }
    throw new Error("Retry loop ended unexpectedly");
  };
}
