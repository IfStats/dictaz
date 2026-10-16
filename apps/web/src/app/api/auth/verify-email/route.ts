
const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function respond(
  message: string,
  status: number,
): Response {
  return Response.json(
    { message },
    { status, headers: RESPONSE_HEADERS },
  );
}

export async function POST(request: Request) {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    return respond("Invalid request", 415);
  }

  const contentLength = Number(
    request.headers.get("content-length") ?? 0,
  );

  if (
    !Number.isFinite(contentLength) ||
    contentLength > 2048
  ) {
    return respond("Invalid request", 413);
  }

  let body: unknown;

  try {
    const raw = await request.text();

    if (raw.length > 2048) {
      return respond("Invalid request", 413);
    }

    body = JSON.parse(raw);
  } catch {
    return respond("Invalid request", 400);
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    !("token" in body) ||
    typeof body.token !== "string" ||
    !TOKEN_PATTERN.test(body.token)
  ) {
    return respond("Invalid verification link", 400);
  }

  const baseUrl = process.env.DICTAZ_API_URL;

  if (!baseUrl) {
    return respond("Verification unavailable", 503);
  }

  try {
    const upstream = await fetch(
      new URL("/auth/verify-email", baseUrl),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: body.token }),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (upstream.ok) {
      return Response.json(
        { verified: true },
        { status: 200, headers: RESPONSE_HEADERS },
      );
    }

    if (upstream.status === 400) {
      return respond("Invalid or expired verification link", 400);
    }

    if (upstream.status === 429) {
      return respond("Too many attempts", 429);
    }

    return respond("Verification unavailable", 503);
  } catch {
    return respond("Verification unavailable", 503);
  }
}
