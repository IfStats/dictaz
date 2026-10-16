
"use client";

import ResendVerificationClient from "./resend-verification-client";

import { useEffect, useState } from "react";

type State =
  | "checking"
  | "ready"
  | "submitting"
  | "success"
  | "invalid"
  | "error";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export default function VerifyEmailClient() {
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<State>("checking");
  const [message, setMessage] = useState("");

  
useEffect(() => {
  const frame = window.requestAnimationFrame(() => {
    const fragment = new URLSearchParams(
      window.location.hash.slice(1),
    );

    const query = new URLSearchParams(
      window.location.search,
    );

    const candidate =
      fragment.get("token") ?? query.get("token");

    // Remove the verification token from the address bar.
    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname,
    );

    if (!candidate || !TOKEN_PATTERN.test(candidate)) {
      setToken(null);
      setState("invalid");
      return;
    }

    setToken(candidate);
    setState("ready");
  });

  return () => {
    window.cancelAnimationFrame(frame);
  };
}, []);


  async function confirmVerification() {
    if (!token || state === "submitting") return;

    setState("submitting");
    setMessage("");

    try {
      const response = await fetch(
        "/api/auth/verify-email",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
          cache: "no-store",
          credentials: "omit",
          referrerPolicy: "no-referrer",
        },
      );

      if (response.ok) {
        setToken(null);
        setState("success");
        return;
      }

      if (response.status === 400) {
        setToken(null);
        setState("invalid");
        return;
      }

      setState("error");
      setMessage(
        response.status === 429
          ? "Too many attempts. Please try again later."
          : "Verification is temporarily unavailable. Please try again.",
      );
    } catch {
      setState("error");
      setMessage(
        "Unable to connect. Check your connection and try again.",
      );
    }
  }

  return (
    <div className="mt-6" aria-live="polite">
      {state === "checking" && (
        <p className="text-sm text-zinc-600">
          Checking verification link…
        </p>
      )}

      
{state === "invalid" && (
  <>
    <p role="alert" className="text-sm text-red-700">
      This verification link is invalid, expired,
      already used, or missing.
    </p>

    <ResendVerificationClient />
  </>
)}


      {state === "success" && (
        <div role="status">
          <p className="font-semibold text-green-700">
            Email verified successfully.
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            Your email is confirmed. You can sign in
            when Dictaz login becomes available.
          </p>
        </div>
      )}

      {(state === "ready" || state === "error") && (
        <>
          {message && (
            <p role="alert" className="mb-4 text-sm text-red-700">
              {message}
            </p>
          )}
          <button
            type="button"
            onClick={confirmVerification}
            className="w-full rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            Confirm email address
          </button>
        </>
      )}

      {state === "submitting" && (
        <button
          type="button"
          disabled
          className="w-full rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white opacity-60"
        >
          Verifying…
        </button>
      )}
    </div>
  );
}
