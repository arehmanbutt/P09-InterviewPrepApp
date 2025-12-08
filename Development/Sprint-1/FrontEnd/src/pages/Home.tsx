// import Hero from '../components/sections/Hero'

// export default function Home() {
//   return (
//     <main className="bg-[#0c0c0c] min-h-[calc(100vh-4rem)]">
//       <Hero />
//     </main>
//   )
// }
// src/pages/Home.tsx
import React, { useEffect, useState } from 'react'
import Hero from '../components/sections/Hero'
import { useAuth } from '@clerk/clerk-react'

interface Question {
  question_id: number
  question_url: string
  question_title: string
  question_text: string
  question_tags: string[]
  question_score: number
  question_view_count: number
  question_creation_date: number
  answer_id?: number
  answer_text?: string
  answer_score?: number
  answer_is_accepted?: boolean
  answer_has_code?: boolean
  answer_has_steps?: boolean
  answer_word_count?: number
  preference_answer_ok?: boolean
  rank_key?: number[]
}

export default function Home(): JSX.Element {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // backend base URL - set in frontend .env: VITE_API_URL=http://localhost:8000
  const API_URL = import.meta.env.VITE_API_URL || ''

  useEffect(() => {
    let cancelled = false

    async function initQuestions() {
      setLoading(true)
      setError(null)

      try {
        // optionally get token for protected endpoints
        let token: string | null = null
        if (isLoaded && isSignedIn && getToken) {
          try {
            token = await getToken()
          } catch (err) {
            console.warn('getToken failed', err)
            token = null
          }
        }

        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = `Bearer ${token}`

        // 1) try fetching existing questions
        const res = await fetch(`${API_URL}/api/interviews/extract-qas`, {
          method: 'GET',
          headers,
        })

        if (res.ok) {
          const data = await res.json()
          if (!cancelled) setQuestions(Array.isArray(data) ? data : [])
          // if DB returned empty array, attempt import
          if (Array.isArray(data) && data.length === 0) {
            // import and re-fetch
            const importRes = await fetch(`${API_URL}/api/interviews/import-qas`, {
              method: 'POST',
              headers,
            })
            if (!importRes.ok) {
              throw new Error(`Import failed: ${importRes.status} ${importRes.statusText}`)
            }
            const after = await (await fetch(`${API_URL}/api/interviews/extract-qas`, { method: 'GET', headers })).json()
            if (!cancelled) setQuestions(Array.isArray(after) ? after : [])
          }
        } else {
          // 404 / 204 / other -> attempt import and then fetch
          if (res.status === 404 || res.status === 204 || res.status === 400) {
            const importRes = await fetch(`${API_URL}/api/interviews/import-qas`, {
              method: 'POST',
              headers,
            })
            if (!importRes.ok) {
              throw new Error(`Import failed: ${importRes.status} ${importRes.statusText}`)
            }
            const after = await (await fetch(`${API_URL}/api/interviews/extract-qas`, { method: 'GET', headers })).json()
            if (!cancelled) setQuestions(Array.isArray(after) ? after : [])
          } else {
            throw new Error(`Fetch failed: ${res.status} ${res.statusText}`)
          }
        }
      } catch (err: any) {
        console.error('initQuestions error', err)
        if (!cancelled) setError(err?.message || 'Failed to initialize questions')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    initQuestions()

    return () => {
      cancelled = true
    }
  }, [API_URL, getToken, isLoaded, isSignedIn])

  return (
    <main className="bg-[#0c0c0c] min-h-[calc(100vh-4rem)]">
      <Hero />
      <section className="mx-auto max-w-6xl px-6 py-10">
        {loading ? (
          <div className="text-gray-300">Loading questions...</div>
        ) : error ? (
          <div className="text-red-400">Error: {error}</div>
        ) : (
          <div>
            <h3 className="text-white text-lg mb-4">Questions loaded into DB: {questions.length}</h3>

            <div className="grid gap-4">
              {questions.slice(0, 10).map((q) => (
                <article key={q.question_id} className="p-4 bg-[#0e0e0e] rounded border border-white/6">
                  <a
                    className="text-emerald-300 font-semibold"
                    href={q.question_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {q.question_title}
                  </a>
                  <p className="text-sm text-gray-300 mt-2">{q.question_text.slice(0, 200)}...</p>
                  <div className="mt-2 text-xs text-gray-400">
                    Score: {q.question_score} • Views: {q.question_view_count}
                  </div>
                </article>
              ))}
            </div>
            {questions.length > 10 && <p className="text-sm text-gray-500 mt-3">Showing first 10 items for preview</p>}
          </div>
        )}
      </section>
    </main>
  )
}
