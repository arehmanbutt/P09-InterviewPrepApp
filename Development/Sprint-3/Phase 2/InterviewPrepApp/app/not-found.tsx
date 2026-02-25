import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-7xl font-bold text-white mb-2">404</h1>
        <p className="text-xl text-gray-400 mb-8">Page not found</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg bg-[#3ecf8e] px-6 py-3 font-medium text-black transition hover:bg-[#33b87a]"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
