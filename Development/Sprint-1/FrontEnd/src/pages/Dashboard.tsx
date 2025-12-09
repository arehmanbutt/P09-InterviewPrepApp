import { useEffect, useState } from "react";
import { readInterviews } from "../lib/storage";
import { useAuth } from "@clerk/clerk-react";
import { Navigate, Link } from "react-router-dom";

interface Question {
  question_id: number;
  question_title: string;
  question_text: string;
  answer_text?: string;
}

// ✅ Move out of component (fix Sonar rule)
function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function Dashboard() {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  // Keep state — it is not “useless,” Sonar flagged it because old code didn’t use it yet.
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || "";
  const interviews = readInterviews();
  const hasItems = interviews.length > 0;
  useEffect(() => {
    let isMounted = true;
    let importInProgress = false;

    async function load() {
      try {
        const token = isSignedIn
          ? await getToken({ template: "interview-backend" })
          : null;

        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;

        // Try load questions
        let res = await fetch(`${API_URL}/api/interviews/extract-qas`, {
          headers,
        });

        // Auto-import fallback
        if (
          !res.ok &&
          [204, 404, 500].includes(res.status) &&
          !importInProgress
        ) {
          importInProgress = true;
          const importRes = await fetch(
            `${API_URL}/api/interviews/import-qas`,
            { method: "POST", headers }
          );

          if (!importRes.ok) {
            setError(
              "Failed to import questions from source. Check server logs."
            );
            return;
          }

          res = await fetch(`${API_URL}/api/interviews/extract-qas`, {
            headers,
          });
        }

        if (res.ok) {
          const data = await res.json();
          if (!isMounted) return;
          setQuestions(Array.isArray(data) ? data : []);
        } else {
          const text = await res.text().catch(() => null);
          console.warn("extract-qas responded with", res.status, text);
          setQuestions([]);
        }
      } catch (err) {
        console.error("Failed to load questions:", err);
        setError("Failed to load questions");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [API_URL, getToken, isSignedIn]);

  // ----------------------------------
  // NOW it is safe to return early
  // ----------------------------------
  if (!isLoaded) return <div />;
  if (!isSignedIn) return <Navigate to="/login" replace />;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#0c0c0c] px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>

          <Link
            to="/create-interview"
            className="rounded-md bg-[#3ecf8e] px-4 py-2 text-sm font-semibold text-black hover:bg-[#36be81]"
          >
            Create Interview
          </Link>
        </div>

        {/* Fix: avoid negated condition */}
        {hasItems ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {interviews.map((it) => (
              <Link
                key={it.id}
                to={`/interview/${it.id}`}
                className="group rounded-lg border border-white/10 bg-[#0e0e0e] p-5 transition hover:border-emerald-500/30 hover:shadow-[0_0_0_1px_rgba(62,207,142,0.2)]"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-white group-hover:text-emerald-300">
                    {it.title}
                  </h2>
                  <span className="text-xs uppercase tracking-wide text-gray-400">
                    {it.status}
                  </span>
                </div>

                <p className="mt-1 text-sm text-gray-300">
                  {it.company} • {it.role}
                </p>

                <p className="mt-2 text-xs text-gray-400">
                  {formatDate(it.date)}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-[#0e0e0e] p-8 text-center">
            <p className="text-gray-300">
              No interviews yet. Create your first interview to get started.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
