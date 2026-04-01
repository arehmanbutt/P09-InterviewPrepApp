import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Gradient Background */}
      <div
        className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-accent opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-accent">InterviewPrepApp</span>
          </Link>
        </div>
      </div>

      {/* Sign In Form */}
      <div className="relative z-10 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">Welcome back</h2>
            <p className="text-muted-foreground">Sign in to your account to continue</p>
          </div>

          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-card border border-border shadow-2xl rounded-lg",
                headerTitle: "text-foreground",
                headerSubtitle: "text-muted-foreground",
                socialButtonsBlockButton:
                  "bg-muted border border-border text-foreground hover:bg-muted/80",
                socialButtonsBlockButtonText: "text-foreground font-medium",
                formButtonPrimary:
                  "bg-primary hover:bg-primary/90 text-primary-foreground font-semibold",
                formFieldInput: "bg-background border border-input text-foreground",
                formFieldLabel: "text-muted-foreground",
                footerActionLink: "text-primary hover:text-primary/80",
                identityPreviewText: "text-foreground",
                identityPreviewEditButton: "text-primary",
                formFieldInputShowPasswordButton: "text-muted-foreground hover:text-foreground",
                otpCodeFieldInput: "bg-background border border-input text-foreground",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
