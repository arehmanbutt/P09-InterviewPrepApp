// import { Link } from 'react-router-dom'

// export default function VerifyEmail() {
//   return (
//     <main className="min-h-[calc(100vh-4rem)] bg-[#0c0c0c] flex items-center justify-center px-4">
//       <div className="max-w-md w-full text-center">
//         <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#121212] ring-1 ring-white/10">
//           <svg className="h-8 w-8 text-[#3ecf8e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//             <path d="M4 4h16v16H4z" />
//             <path d="m4 7 8 5 8-5" />
//           </svg>
//         </div>
//         <h1 className="text-2xl font-semibold text-white">Check your inbox</h1>
//         <p className="mt-2 text-gray-300">We sent a verification link to your email. Click it to finish signing up.</p>
//         <div className="mt-8 flex flex-col gap-3">
//           <button className="inline-flex justify-center rounded-md bg-[#3ecf8e] px-4 py-2 text-sm font-semibold text-black hover:bg-[#36be81]">Resend verification email</button>
//           <Link to="/login" className="text-sm text-gray-300 hover:text-white">Back to login</Link>
//         </div>
//       </div>
//     </main>
//   )
// }
// src/pages/VerifyEmail.tsx
import React, { useState } from 'react'
import { useUser } from '@clerk/clerk-react'

export default function VerifyEmail() {
  const { isLoaded, user } = useUser()
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!isLoaded) return null

  // Primary email object may be undefined for social-only users
  const primaryEmail = user?.primaryEmailAddress

  async function resendVerification() {
    if (!primaryEmail) {
      setMsg('No primary email to verify')
      return
    }
    setLoading(true)
    try {
      // send email link or code based on strategy configured in Clerk
      // The 'email_link' strategy requires redirectUrl (per Clerk types)
      const redirectUrl = `${window.location.origin}/verify-email`
      await primaryEmail.prepareVerification({ strategy: 'email_link', redirectUrl })
      setMsg('Verification email sent — check your inbox')
    } catch (err) {
      console.error(err)
      setMsg('Failed to send verification')
    } finally {
      setLoading(false)
    }
  }

  async function attemptCodeVerification(e: React.FormEvent) {
    e.preventDefault()
    if (!primaryEmail) return setMsg('No email to verify')
    setLoading(true)
    try {
      const updated = await primaryEmail.attemptVerification({ code })
      if (updated.verification?.status === 'verified') {
        setMsg('Email verified — thank you!')
      } else {
        setMsg('Verification not completed')
      }
    } catch (err) {
      console.error(err)
      setMsg('Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white/5 p-6 rounded">
        <h1 className="text-xl font-semibold text-white mb-4">Verify your email</h1>

        <p className="text-gray-300 mb-4">
          Primary email: <strong className="text-white">{primaryEmail?.emailAddress ?? '—'}</strong>
        </p>

        <p className="text-gray-300 mb-4">
          Status: <strong className="text-white">{primaryEmail?.verification?.status ?? 'unknown'}</strong>
        </p>

        <div className="space-y-3">
          <button
            onClick={resendVerification}
            className="w-full rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
            disabled={loading}
          >
            Resend verification email
          </button>

          <form onSubmit={attemptCodeVerification} className="mt-4">
            <label className="block text-sm text-gray-200">If you received a code, paste it here</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 block w-full rounded bg-black/20 p-2 text-white"
            />
            <button type="submit" className="mt-2 rounded bg-green-500 px-4 py-2 text-white">
              Verify code
            </button>
          </form>

          {msg && <p className="mt-3 text-sm text-gray-200">{msg}</p>}
        </div>
      </div>
    </main>
  )
}
