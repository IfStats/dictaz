
"use client";

import {
  useState,
  type FormEvent,
} from "react";

type RequestState =
  | "idle"
  | "submitting"
  | "success"
  | "error";

export default function ResendVerificationClient() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<RequestState>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (state === "submitting") return;

    setState("submitting");
    setMessage("");

    try {
      const response = await fetch(
        "/api/auth/resend-verification",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
          }),
          credentials: "omit",
          cache: "no-store",
          referrerPolicy: "no-referrer",
        },
      );

      if (response.status === 202) {
        setState("success");
        setEmail("");
        setMessage(
          "If your email is eligible, check your inbox for verification instructions.",
        );
        return;
      }

      setState("error");

      setMessage(
        response.status === 429
          ? "Too many requests. Please try again later."
          : "Unable to process your request right now. Please try again.",
      );
    } catch {
      setState("error");
      setMessage(
        "Unable to connect. Please check your connection and retry.",
      );
    }
  }

  return (
    <section className="mt-6 border-t border-zinc-200 pt-6">
      <h2 className="text-lg font-semibold text-zinc-950">
        Need a new verification email?
      </h2>

      <p className="mt-2 text-sm text-zinc-600">
        Enter your registration email address.
        Verification links expire after 10 minutes.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-5 space-y-4"
      >
        <div>
          <label
            htmlFor="resend-email"
            className="mb-2 block text-sm font-medium text-zinc-800"
          >
            Email address
          </label>

          <input
            id="resend-email"
            type="email"
            required
            maxLength={320}
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);

              if (state !== "submitting") {
                setState("idle");
                setMessage("");
              }
            }}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm text-zinc-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <button
          type="submit"
          disabled={state === "submitting"}
          className="w-full rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state === "submitting"
            ? "Sending request..."
            : "Resend verification email"}
        </button>
      </form>

      {message && (
        <p
          role={state === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`mt-4 text-sm ${
            state === "error"
              ? "text-red-700"
              : "text-green-700"
          }`}
        >
          {message}
        </p>
      )}

      <p className="mt-4 text-xs text-zinc-500">
        Please check your spam folder before requesting
        another email. Repeated requests are limited.
      </p>
    </section>
  );
}
