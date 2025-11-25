import { Link } from 'react-router-dom'
import React, { useEffect, useState } from 'react'
import { readInterviews } from '../lib/storage'
import { useAuth, SignedIn, SignedOut } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'

interface Question {
  question_id: number
  question_title: string
  question_text: string
  answer_text?: string
}

export default function Dashboard() {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  
  const API_URL = import.meta.env.VITE_API_URL || ''

  if (!isLoaded) return <div /> 
  if (!isSignedIn) return <Navigate to="/login" replace />

  const interviews = readInterviews()
  const hasItems = interviews.length > 0

  function formatDate(value?: string) {
    if (!value) return '—'
    const d = new Date(value)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleString()
  }

  useEffect(() => {
    let isMounted = true;
    let importInProgress = false;

    async function load() {
      try {
        const token = isSignedIn ? await getToken({ template: "interview-backend" }) : null;
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;

        // 1) Try fetching questions
        let res = await fetch(`${API_URL}/api/interviews/extract-qas`, { headers });

        // 2) If no content or server error, try import ONCE
        if (!res.ok && [204, 404, 500].includes(res.status) && !importInProgress) {
          importInProgress = true;
          console.log('No questions found on server, attempting import...');

          const importRes = await fetch(`${API_URL}/api/interviews/import-qas`, { method: 'POST', headers });
          if (!importRes.ok) {
            console.error('Import failed', importRes.status);
            // Do not loop; show error
            setError('Failed to import questions from source. Check server logs.');
            return;
          }

          // Re-fetch after successful import
          res = await fetch(`${API_URL}/api/interviews/extract-qas`, { headers });
        }

        if (res.ok) {
          const data = await res.json();
          if (!isMounted) return;
          setQuestions(Array.isArray(data) ? data : []);
        } else {
          // handle other non-ok statuses gracefully
          const text = await res.text().catch(() => null);
          console.warn('extract-qas responded with', res.status, text);
          setQuestions([]);
        }
      } catch (err) {
        console.error('Failed to load questions:', err);
        setError('Failed to load questions');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => { isMounted = false; };
  }, [API_URL, getToken, isLoaded, isSignedIn]);


  // useEffect(() => {
  //   async function load() {
  //     try {
  //       const token = isSignedIn ? await getToken({ template: "interview-backend" }) : null;
  //       const headers: HeadersInit = { 'Content-Type': 'application/json' };
  //       if (token) headers.Authorization = `Bearer ${token}`;

  //       let res = await fetch(`${API_URL}/api/interviews/extract-qas`, { headers });

  //       if (!res.ok && [404, 204, 500].includes(res.status)) {
  //         console.log('No questions found, importing...');
  //         await fetch(`${API_URL}/api/interviews/import-qas`, { method: 'POST', headers });
  //         res = await fetch(`${API_URL}/api/interviews/extract-qas`, { headers }); // ← re-fetch!
  //       }

  //       if (res.ok) {
  //         console.log('Questions fetched successfully');
  //         const data = await res.json();
  //         setQuestions(Array.isArray(data) ? data : []);
  //       }
  //     } catch (err) {
  //       console.error('Failed to load questions:', err);
  //       setError('Failed to load questions');
  //     } finally {
  //       setLoading(false);
  //     }
  //   }

  //   load();
  // }, [API_URL, getToken, isLoaded, isSignedIn]);

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

        {!hasItems ? (
          <div className="rounded-lg border border-white/10 bg-[#0e0e0e] p-8 text-center">
            <p className="text-gray-300">No interviews yet. Create your first interview to get started.</p>
            {/* <Link
              to="/create-interview"
              className="mt-6 inline-flex rounded-md bg-[#3ecf8e] px-4 py-2 text-sm font-semibold text-black hover:bg-[#36be81]"
            >
              Create Interview
            </Link> */}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {interviews.map((it) => (
              <Link
                key={it.id}
                to={`/interview/${it.id}`}
                className="group rounded-lg border border-white/10 bg-[#0e0e0e] p-5 transition hover:border-emerald-500/30 hover:shadow-[0_0_0_1px_rgba(62,207,142,0.2)]"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-white group-hover:text-emerald-300">{it.title}</h2>
                  <span className="text-xs uppercase tracking-wide text-gray-400">{it.status}</span>
                </div>
                <p className="mt-1 text-sm text-gray-300">
                  {it.company} • {it.role}
                </p>
                {/* <p className="mt-2 text-xs text-gray-400">{new Date(it.date).toLocaleString()}</p> */}
                <p className="mt-2 text-xs text-gray-400">{formatDate(it.date)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
      {/* <div className="grid gap-4">
        {questions.slice(0, 10).map((q) => (
          <article key={q.question_id} className="p-4 bg-[#0e0e0e] rounded border border-white/6">
            <p>{q.question_title}</p>
            <p className="text-sm text-gray-300 mt-2">{q.question_text.slice(0, 200)}...</p>
          </article>
        ))}
        {questions.length > 10 && <p className="text-sm text-gray-500 mt-3">Showing first 10 items for preview</p>}
    </div> */}
    </main>
  )
}
