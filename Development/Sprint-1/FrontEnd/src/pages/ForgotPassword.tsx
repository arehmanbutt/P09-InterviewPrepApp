// import { useState } from 'react'
// import { Link } from 'react-router-dom'

// export default function ForgotPassword() {
//   const [sent, setSent] = useState(false)
//   return (
//     <main className="min-h-[calc(100vh-4rem)] bg-[#0c0c0c] flex items-center justify-center px-4">
//       <div className="w-full max-w-sm">
//         <div className="rounded-lg border border-white/10 bg-[#0e0e0e] p-6 shadow-2xl shadow-black/40">
//           <h1 className="text-xl font-semibold text-white">Reset password</h1>
//           <p className="mt-1 text-sm text-gray-300">We'll send you a link to reset your password.</p>

//           {sent ? (
//             <div className="mt-4 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
//               If an account exists for that email, you'll receive a reset link shortly.
//             </div>
//           ) : (
//             <form
//               className="mt-6 space-y-4"
//               onSubmit={(e) => {
//                 e.preventDefault()
//                 setSent(true)
//               }}
//             >
//               <div>
//                 <label className="mb-1 block text-sm text-gray-300">Email</label>
//                 <input
//                   type="email"
//                   required
//                   className="w-full rounded-md border border-white/10 bg-[#0b0b0b] px-3 py-2 text-white placeholder-gray-500 outline-none ring-emerald-500/20 focus:ring-2"
//                   placeholder="you@example.com"
//                 />
//               </div>
//               <button
//                 type="submit"
//                 className="w-full rounded-md bg-[#3ecf8e] px-4 py-2 text-sm font-semibold text-black hover:bg-[#36be81]"
//               >
//                 Send reset link
//               </button>
//             </form>
//           )}

//           <div className="mt-4 text-center">
//             <Link to="/login" className="text-sm text-gray-300 hover:text-white">
//               Back to login
//             </Link>
//           </div>
//         </div>
//       </div>
//     </main>
//   )
// }
// src/pages/ForgotPassword.tsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useSignIn } from '@clerk/clerk-react'

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState('') // email or phone
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [successfulCreation, setSuccessfulCreation] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // auth helpers
  const { isLoaded: authLoaded, isSignedIn } = useAuth()
  const { isLoaded, signIn, setActive } = useSignIn()
  const navigate = useNavigate()

  useEffect(() => {
    if (authLoaded && isSignedIn) {
      navigate('/')
    }
  }, [isSignedIn, authLoaded, navigate])

  if (!isLoaded) return null

  // Request a reset code be sent to the identifier (email or phone)
  async function create(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!signIn) {
      setError('Auth service not ready. Try again.')
      return
    }

    try {
      // create reset flow; Clerk sends the reset code to the identifier
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier,
      })
      setSuccessfulCreation(true)
    } catch (err: any) {
      console.error(err)
      setError(err?.errors?.[0]?.longMessage || err?.message || 'Failed to create reset request')
    }
  }

  // Attempt to reset the password using the code and new password
  async function reset(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!signIn) {
      setError('Auth service not ready. Try again.')
      return
    }

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password,
      })

      if (!result) throw new Error('Unexpected result')

      if (result.status === 'needs_second_factor') {
        setError('Second factor required — not supported in this UI')
      } else if (result.status === 'complete') {
        // IMPORTANT: check that setActive is present before calling it
        if (!setActive) {
          // setActive can be undefined in some Clerk SDK versions/types
          // we handle this gracefully: show message and redirect user to home
          console.warn('setActive not available — session may not be activated automatically')
          navigate('/')
          return
        }

        // Make the newly created session active so user is authenticated
        await setActive({
          session: result.createdSessionId,
          navigate: async () => {
            navigate('/')
          },
        })
      } else {
        console.log('result', result)
      }
    } catch (err: any) {
      console.error(err)
      setError(err?.errors?.[0]?.longMessage || err?.message || 'Failed to reset password')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white/5 p-6 rounded">
        <h1 className="text-xl font-semibold text-white mb-4">Forgot Password</h1>

        <form onSubmit={!successfulCreation ? create : reset} className="space-y-4">
          {!successfulCreation ? (
            <>
              <div>
                <label className="block text-sm text-gray-200">Email address</label>
                <input
                  type="email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="mt-1 block w-full rounded bg-black/20 p-2 text-white"
                  required
                />
              </div>
              <button type="submit" className="rounded bg-green-500 px-4 py-2 text-white">
                Send reset code
              </button>
              {error && <p className="text-red-400 mt-2">{error}</p>}
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm text-gray-200">Reset code</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="mt-1 block w-full rounded bg-black/20 p-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-200">New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded bg-black/20 p-2 text-white"
                  required
                />
              </div>

              <button type="submit" className="rounded bg-green-500 px-4 py-2 text-white">
                Reset password
              </button>
              {error && <p className="text-red-400 mt-2">{error}</p>}
            </>
          )}
        </form>
      </div>
    </main>
  )
}
