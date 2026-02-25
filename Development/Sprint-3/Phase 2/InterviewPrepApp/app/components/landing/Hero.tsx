export default function Hero() {
  return (
    <div className="relative isolate overflow-hidden bg-[#0b0b0b] px-6 pt-1 shadow-2xl sm:pt-24 lg:px-8 lg:pt-1">
      <div
        className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#3ecf8e] to-[#3ecf8e] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>
      <div className="py-2 sm:py-16 lg:pb-4">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              InterviewPrepApp
              <br />
              <span className="text-green-400">
                Get interview ready with AI-powered practice and feedback{" "}
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Practice on real interview questions and get instant feedback to improve your skills.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <a
                href="/create-interview"
                className="rounded-md bg-[#3ecf8e] px-3.5 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-[#36be81]"
              >
                Create an Interview
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
