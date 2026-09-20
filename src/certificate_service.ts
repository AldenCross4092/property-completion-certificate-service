import { createServer, type ServerResponse } from "node:http";
import { z } from "zod";
import { InfraiError, createCertificateGenerator, type CertificateGenerator } from "./certificate_generator.js";
import { decideCompletion, participantSchema } from "./completion_policy.js";

const batchSchema = z.object({
  batchId: z.string().min(1),
  participants: z.array(participantSchema).min(1).max(100)
});

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function readJson(request: AsyncIterable<Uint8Array>): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1_000_000) throw new Error("Request body is too large");
    chunks.push(Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function processCertificateBatch(
  input: unknown,
  generateCertificate: CertificateGenerator
): Promise<{ generated: unknown[]; pending: unknown[] }> {
  const batch = batchSchema.parse(input);
  const generated: unknown[] = [];
  const pending: unknown[] = [];

  for (const participant of batch.participants) {
    const decision = decideCompletion(participant);
    if (decision.eligible === false) {
      pending.push({ participantId: participant.participantId, reasons: decision.reasons });
      continue;
    }
    generated.push(await generateCertificate(participant, `${batch.batchId}:${participant.participantId}`));
  }

  return { generated, pending };
}

export function startCertificateService(apiKey: string, port = 3000): void {
  const generateCertificate = createCertificateGenerator(apiKey);
  const server = createServer(async (request, response) => {
    if (request.method !== "POST" || request.url !== "/certificates/batch") {
      sendJson(response, 404, { error: "Route not found" });
      return;
    }

    try {
      const result = await processCertificateBatch(await readJson(request), generateCertificate);
      sendJson(response, 200, result);
    } catch (error) {
      if (error instanceof z.ZodError || error instanceof SyntaxError) {
        sendJson(response, 400, { error: "Invalid request body", details: error.message });
      } else if (error instanceof InfraiError) {
        const status = error.status >= 400 && error.status < 500 ? error.status : 502;
        sendJson(response, status, { error: error.code, details: error.details });
      } else {
        sendJson(response, 502, { error: "Certificate generation failed" });
      }
    }
  });

  server.listen(port, () => {
    console.log(`Certificate service listening on http://localhost:${port}`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");
  startCertificateService(apiKey, Number(process.env.PORT ?? 3000));
}
