// import { Link } from 'react-router-dom'
// import { readInterviews } from '../lib/storage'
// import { useAuth, SignedIn, SignedOut } from '@clerk/clerk-react'
// import { Navigate } from 'react-router-dom'
// import React, { useEffect, useState } from 'react';

// export default function Dashboard() {
//   const { isLoaded, isSignedIn, userId, getToken } = useAuth()

//   const interviews = readInterviews()
//   const hasItems = interviews.length > 0

//   return (
//     <main className="min-h-[calc(100vh-4rem)] bg-[#0c0c0c] px-6 py-10">
//       <div className="mx-auto max-w-6xl">
//         <div className="mb-8 flex items-center justify-between">
//           <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
//           <Link
//             to="/create-interview"
//             className="rounded-md bg-[#3ecf8e] px-4 py-2 text-sm font-semibold text-black hover:bg-[#36be81]"
//           >
//             Create Interview
//           </Link>
//         </div>

//         {!hasItems ? (
//           <div className="rounded-lg border border-white/10 bg-[#0e0e0e] p-8 text-center">
//             <p className="text-gray-300">No interviews yet. Create your first interview to get started.</p>
//             <Link
//               to="/create-interview"
//               className="mt-6 inline-flex rounded-md bg-[#3ecf8e] px-4 py-2 text-sm font-semibold text-black hover:bg-[#36be81]"
//             >
//               Create Interview
//             </Link>
//           </div>
//         ) : (
//           <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
//             {interviews.map((it) => (
//               <Link
//                 key={it.id}
//                 to={`/interview/${it.id}`}
//                 className="group rounded-lg border border-white/10 bg-[#0e0e0e] p-5 transition hover:border-emerald-500/30 hover:shadow-[0_0_0_1px_rgba(62,207,142,0.2)]"
//               >
//                 <div className="flex items-center justify-between">
//                   <h2 className="text-lg font-medium text-white group-hover:text-emerald-300">{it.title}</h2>
//                   <span className="text-xs uppercase tracking-wide text-gray-400">{it.status}</span>
//                 </div>
//                 <p className="mt-1 text-sm text-gray-300">
//                   {it.company} • {it.role}
//                 </p>
//                 <p className="mt-2 text-xs text-gray-400">{new Date(it.date).toLocaleString()}</p>
//               </Link>
//             ))}
//           </div>
//         )}
//       </div>
//     </main>
//   )
// }
import { Link } from 'react-router-dom'
import { readInterviews } from '../lib/storage'
import { useAuth, SignedIn, SignedOut } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'


export default function Dashboard() {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth()

  if (!isLoaded) return <div /> // or spinner
  if (!isSignedIn) return <Navigate to="/login" replace />

  const interviews = readInterviews()
  const hasItems = interviews.length > 0

  function formatDate(value?: string) {
    if (!value) return '—'
    const d = new Date(value)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleString()
  }

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
            <Link
              to="/create-interview"
              className="mt-6 inline-flex rounded-md bg-[#3ecf8e] px-4 py-2 text-sm font-semibold text-black hover:bg-[#36be81]"
            >
              Create Interview
            </Link>
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
    </main>
  )
}
