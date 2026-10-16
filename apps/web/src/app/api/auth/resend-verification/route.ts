
export const runtime = "nodejs";

const GENERIC_MESSAGE =
  "If your email is eligible, check your inbox for verification instructions.";

const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

function respond(status: number, message: string) {
  return Response.json(
    { message },
    { status, headers: RESPONSE_HEADERS },
  );
}

async function readLimitedBody(
  request: Request,
): Promise<string | null> {
  if (!request.body) return null;

  const reader = request.body.getReader();
  const decoder = new TextDecoder();

  let bytes = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      bytes += value.byteLength;

      if (bytes > 2048) {
        await reader.cancel();
        return null;
      }

      text += decoder.decode(value, { stream: true });
    }

    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");

  if (origin && origin !== new URL(request.url).origin) {
    return respond(403, "Forbidden");
  }

  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    return respond(415, "Invalid content type");
  }

  let payload: unknown;

  try {
    const raw = await readLimitedBody(request);

    if (raw === null) {
      return respond(413, "Invalid request size");
    }

    payload = JSON.parse(raw);
  } catch {
    return respond(400, "Invalid request");
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    !("email" in payload) ||
    typeof payload.email !== "string"
  ) {
    return respond(400, "Invalid email address");
  }

  const email = payload.email.trim().toLowerCase();

  if (
    email.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return respond(400, "Invalid email address");
  }

  const apiUrl = process.env.DICTAZ_API_URL;

  if (!apiUrl) {
    return respond(503, "Verification unavailable");
  }

  try {
    const upstream = await fetch(
      new URL("/auth/resend-verification", apiUrl),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (upstream.status === 429) {
      return respond(429, "Too many requests");
    }

    if (!upstream.ok) {
      return respond(503, "Verification unavailable");
    }

    return respond(202, GENERIC_MESSAGE);
  } catch {
    return respond(503, "Verification unavailable");
  }
}
