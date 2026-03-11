import { SignInButton, SignUpButton } from "@clerk/nextjs";

export default function AuthButtons() {
  return (
    <>
      <SignInButton mode="modal">
        <button className="text-gray-300 hover:text-white text-sm font-medium transition-colors">
          Sign in
        </button>
      </SignInButton>

      <SignUpButton mode="modal">
        <button className="inline-flex items-center rounded-md border border-white/15 bg-[#3ecf8e] px-3 py-1.5 text-sm font-semibold text-black hover:bg-[#36be81] transition-colors">
          Sign up
        </button>
      </SignUpButton>
    </>
  );
}
