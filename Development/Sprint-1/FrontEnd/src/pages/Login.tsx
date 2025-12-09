// src/pages/Login.tsx
import { SignIn } from "@clerk/clerk-react";
import clerkAppearance from "../lib/clerkAppearance";

export default function Login(): JSX.Element {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#0b0b0b]">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-semibold text-white">Welcome back</h2>
          <p className="text-sm text-gray-400 mt-1">
            Sign in to continue to Interview Prep
          </p>
        </div>

        <div className="bg-white/5 p-6 rounded-md shadow-sm">
          {/* Local cast to avoid depending on Clerk internal types in this TS version */}
          <SignIn
            path="/login"
            routing="path"
            appearance={clerkAppearance as unknown as any}
          />
        </div>
      </div>
    </main>
  );
}
