import React, { useState } from "react";
import { useUser } from "@clerk/clerk-react";

export default function VerifyEmail() {
  const { isLoaded, user } = useUser();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isLoaded) return null;

  // Primary email object may be undefined for social-only users
  const primaryEmail = user?.primaryEmailAddress;

  async function resendVerification() {
    if (!primaryEmail) {
      setMsg("No primary email to verify");
      return;
    }
    setLoading(true);
    try {
      // send email link or code based on strategy configured in Clerk
      const redirectUrl = `${globalThis.location.origin}/verify-email`;
      await primaryEmail.prepareVerification({
        strategy: "email_link",
        redirectUrl,
      });
      setMsg("Verification email sent — check your inbox");
    } catch (err) {
      console.error(err);
      setMsg("Failed to send verification");
    } finally {
      setLoading(false);
    }
  }

  async function attemptCodeVerification(e: React.FormEvent) {
    e.preventDefault();
    if (!primaryEmail) return setMsg("No email to verify");
    setLoading(true);
    try {
      const updated = await primaryEmail.attemptVerification({ code });
      if (updated.verification?.status === "verified") {
        setMsg("Email verified — thank you!");
      } else {
        setMsg("Verification not completed");
      }
    } catch (err) {
      console.error(err);
      setMsg("Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white/5 p-6 rounded">
        <h1 className="text-xl font-semibold text-white mb-4">
          Verify your email
        </h1>
        <p className="text-gray-300 mb-4">
          Primary email:{" "}
          <strong className="text-white">
            {primaryEmail?.emailAddress ?? "—"}
          </strong>
        </p>
        <p className="text-gray-300 mb-4">
          Status:{" "}
          <strong className="text-white">
            {primaryEmail?.verification?.status ?? "unknown"}
          </strong>
        </p>
        <div className="space-y-3">
          <button
            onClick={resendVerification}
            className="w-full rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
            disabled={loading}
          >
            Resend verification email
          </button>
          <form onSubmit={attemptCodeVerification} className="mt-4">
            <label
              htmlFor="verification-code"
              className="block text-sm text-gray-200"
            >
              If you received a code, paste it here
            </label>
            <input
              id="verification-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 block w-full rounded bg-black/20 p-2 text-white"
            />
            <button
              type="submit"
              className="mt-2 rounded bg-green-500 px-4 py-2 text-white"
              disabled={loading}
            >
              Verify code
            </button>
          </form>
          {msg && <p className="mt-3 text-sm text-gray-200">{msg}</p>}
        </div>
      </div>
    </main>
  );
}
