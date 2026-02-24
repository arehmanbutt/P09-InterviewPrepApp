import Link from "next/link";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  SignOutButton,
  UserButton,
} from "@clerk/nextjs";
import Logo from "./Logo";

export default function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0b0b]/90 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center">
        <div className="flex flex-1 items-center">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
            <span className="text-white text-base font-semibold tracking-wide">
              InterviewPrepApp
            </span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">
          <SignedIn>
            <UserButton />
            <div className="hidden">
              <SignOutButton />
            </div>
          </SignedIn>

          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-gray-300 hover:text-white text-sm font-medium">
                Sign in
              </button>
            </SignInButton>

            <SignUpButton mode="modal">
              <button className="inline-flex items-center rounded-md border border-white/15 bg-[#3ecf8e] px-3 py-1.5 text-sm font-semibold text-black hover:bg-[#36be81]">
                Sign up
              </button>
            </SignUpButton>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}
