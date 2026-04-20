import { SignInButton, SignUpButton } from "@clerk/nextjs";

export default function AuthButtons() {
  return (
    <>
      <SignInButton mode="modal">
        <button className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors">
          Sign in
        </button>
      </SignInButton>

      <SignUpButton mode="modal">
        <button className="inline-flex items-center rounded-md border border-border bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
          Sign up
        </button>
      </SignUpButton>
    </>
  );
}
