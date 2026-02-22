import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getInterview, updateInterview } from '../lib/storage'
import { useAuth, SignedIn, SignedOut } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'


function useTimer(active: boolean) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [active])
  return seconds
}

export default function Interview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const data = useMemo(() => (id ? getInterview(id) : null), [id])
  const [paused, setPaused] = useState(false)
  const [muted, setMuted] = useState(false)
  const [ended, setEnded] = useState(false)

  const { isLoaded, isSignedIn, userId, getToken } = useAuth()

  if (!isLoaded) return <div /> // or spinner
  if (!isSignedIn) return <Navigate to="/login" replace />

  const seconds = useTimer(!paused && !ended)

  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60

  useEffect(() => {
    if (!id) return
    updateInterview(id, { status: ended ? 'completed' : 'in-progress' })
  }, [id, ended])

  const waveformRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = waveformRef.current
    if (!el) return
    const timer = setInterval(() => {
      el.style.setProperty('--h', `${Math.random() * 24 + 8}px`)
    }, 250)
    return () => clearInterval(timer)
  }, [])

  if (!data) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-[#0c0c0c] px-6 py-10">
        <div className="mx-auto max-w-3xl text-center text-gray-300">
          Interview not found.
          <div className="mt-4">
            <Link to="/dashboard" className="text-emerald-300 hover:text-emerald-200">
              Go back
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#0c0c0c] px-6 py-10">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-lg border border-white/10 bg-[#0e0e0e] p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white">{data.title}</h1>
              <p className="text-sm text-gray-300">
                {data.company} • {data.role}
              </p>
            </div>
            <div className="rounded-md border border-white/10 bg-[#0b0b0b] px-3 py-1 text-sm text-gray-300">
              {String(minutes).padStart(2, '0')}:{String(remaining).padStart(2, '0')}
            </div>
          </div>

          <div className="mt-8">
            <div
              ref={waveformRef}
              className="h-40 w-full rounded-md border border-white/10 bg-gradient-to-b from-white/5 to-white/0 p-2"
              style={{
                maskImage:
                  'radial-gradient(circle at 50% 0%, black 0%, transparent 75%), linear-gradient(to right, black, black)',
              }}
            >
              <div className="flex h-full items-end gap-1">
                {Array.from({ length: 80 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-[6px] flex-1 rounded-sm bg-emerald-500/30"
                    style={{ height: `calc(var(--h, 16px) * ${(i % 5) + 1})` }}
                  />
                ))}
              </div>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => setPaused((p) => !p)}
                className="rounded-md border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
              >
                {paused ? 'Resume' : 'Pause'}
              </button>
              <button
                onClick={() => setMuted((m) => !m)}
                className="rounded-md border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
              >
                {muted ? 'Unmute' : 'Mute'}
              </button>
              <button
                onClick={() => setEnded(true)}
                className="rounded-md bg-[#3ecf8e] px-4 py-2 text-sm font-semibold text-black hover:bg-[#36be81]"
              >
                End Interview
              </button>
            </div>

            {ended && (
              <div className="mt-6 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300">
                Interview completed. Redirecting you to the dashboard...
              </div>
            )}
          </div>
        </section>

        <aside className="rounded-lg border border-white/10 bg-[#0e0e0e] p-6">
          <h2 className="text-sm font-semibold text-white">Transcript</h2>
          <div className="mt-4 h-[420px] overflow-auto rounded-md border border-white/10 bg-[#0b0b0b] p-3 text-sm text-gray-300">
            <p className="text-gray-400">This is a demo transcript panel.</p>
            {Array.from({ length: 16 }).map((_, i) => (
              <p key={i} className="mt-2">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed euismod, nunc ut aliquet vehicula, nisl nunc aliquet nunc, vitae aliquam nunc nisl eu nunc.
              </p>
            ))}
          </div>
        </aside>
      </div>
    </main>
  )
}
