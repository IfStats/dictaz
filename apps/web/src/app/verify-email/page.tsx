
import type { Metadata } from "next";
import VerifyEmailClient from "./verify-email-client";

export const metadata: Metadata = {
  title: "Verify your email | Dictaz",
  description: "Confirm your Dictaz email address.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function VerifyEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 text-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="mb-3 text-sm font-semibold tracking-wide text-blue-700">
          DICTAZ
        </p>
        <h1 className="text-2xl font-semibold">
          Verify your email
        </h1>
        <p className="mt-3 text-sm text-zinc-600">
          Confirm your email address to activate your
          Dictaz account.
        </p>
        <VerifyEmailClient />
      </div>
    </main>
  );
}
