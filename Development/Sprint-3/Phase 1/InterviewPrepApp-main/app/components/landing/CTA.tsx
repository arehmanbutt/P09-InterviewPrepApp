import { SignUpButton } from "@clerk/nextjs";

export default function CTA() {
  return (
    <section className="py-24 sm:py-32 px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#3ecf8e]/20 to-transparent p-12 text-center backdrop-blur">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to ace your interview?
            </h2>
            <p className="mt-4 text-lg text-gray-300">
              Join thousands of developers who have landed their dream jobs with our platform.
            </p>
            <div className="mt-8">
              <SignUpButton mode="modal">
                <button className="rounded-md bg-[#3ecf8e] px-6 py-3 text-base font-semibold text-black shadow-sm hover:bg-[#36be81] transition-colors">
                  Start practicing now
                </button>
              </SignUpButton>
            </div>
            <p className="mt-4 text-sm text-gray-400">No credit card required</p>
          </div>

          {/* Decorative gradient */}
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-[#3ecf8e]/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-[#3ecf8e]/10 blur-3xl" />
        </div>
      </div>
    </section>
  );
}
