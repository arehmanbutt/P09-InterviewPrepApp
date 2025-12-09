import { SignUp } from "@clerk/clerk-react";
import clerkAppearance from "../lib/clerkAppearance";

export default function Signup(): JSX.Element {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#0b0b0b]">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-semibold text-white">
            Create your account
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Start practicing interviews with AI feedback
          </p>
        </div>

        <div className="bg-white/5 p-6 rounded-md shadow-sm">
          <SignUp
            path="/signup"
            routing="path"
            appearance={clerkAppearance as unknown as any}
          />
        </div>
      </div>
    </main>
  );
}
