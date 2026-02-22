import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useSignIn } from "@clerk/clerk-react";

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState(""); // email or phone
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [successfulCreation, setSuccessfulCreation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { isLoaded, signIn, setActive } = useSignIn();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoaded && isSignedIn) {
      navigate("/");
    }
  }, [isSignedIn, authLoaded, navigate]);

  if (!isLoaded) return null;

  // Request a reset code be sent to the identifier
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!signIn) {
      setError("Auth service not ready. Try again.");
      return;
    }
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier,
      });
      setSuccessfulCreation(true);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.errors?.[0]?.longMessage ||
          err?.message ||
          "Failed to create reset request"
      );
    }
  }

  // Attempt to reset the password using the code and new password
  async function reset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!signIn) {
      setError("Auth service not ready. Try again.");
      return;
    }
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password,
      });
      if (!result) throw new Error("Unexpected result");

      if (result.status === "needs_second_factor") {
        setError("Second factor required — not supported in this UI");
      } else if (result.status === "complete") {
        if (!setActive) {
          console.warn(
            "setActive not available — session may not be activated automatically"
          );
          navigate("/");
          return;
        }
        await setActive({
          session: result.createdSessionId,
          navigate: async () => {
            navigate("/");
          },
        });
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err?.errors?.[0]?.longMessage ||
          err?.message ||
          "Failed to reset password"
      );
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white/5 p-6 rounded">
        <h1 className="text-xl font-semibold text-white mb-4">
          Forgot Password
        </h1>
        <form
          onSubmit={successfulCreation ? reset : create}
          className="space-y-4"
        >
          {successfulCreation ? (
            <>
              <div>
                <label htmlFor="code" className="block text-sm text-gray-200">
                  Reset code
                </label>
                <input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="mt-1 block w-full rounded bg-black/20 p-2 text-white"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm text-gray-200"
                >
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded bg-black/20 p-2 text-white"
                  required
                />
              </div>
              <button
                type="submit"
                className="rounded bg-green-500 px-4 py-2 text-white"
              >
                Reset password
              </button>
              {error && <p className="text-red-400 mt-2">{error}</p>}
            </>
          ) : (
            <>
              <div>
                <label
                  htmlFor="identifier"
                  className="block text-sm text-gray-200"
                >
                  Email address
                </label>
                <input
                  id="identifier"
                  type="email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="mt-1 block w-full rounded bg-black/20 p-2 text-white"
                  required
                />
              </div>
              <button
                type="submit"
                className="rounded bg-green-500 px-4 py-2 text-white"
              >
                Send reset code
              </button>
              {error && <p className="text-red-400 mt-2">{error}</p>}
            </>
          )}
        </form>
      </div>
    </main>
  );
}
