// import { Link } from 'react-router-dom'


// export default function Login() {
//   return (
//     <div className="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#0c0c0c]">
//       <div className="sm:mx-auto sm:w-full sm:max-w-md">
//         <div className="flex justify-center">
//           <Link to="/" className="flex items-center space-x-2">
//             <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//               <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
//             </svg>
//             <span className="text-white text-lg font-semibold">YourLogo</span>
//           </Link>
//         </div>
//         <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">Welcome back</h2>
//       </div>

//       <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
//         <div className="bg-[#121212] py-8 px-4 shadow sm:rounded-lg sm:px-10">
//           <form className="space-y-6" onSubmit={(e)=>{e.preventDefault(); window.location.href='/dashboard'}}>
//             <div>
//               <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email address</label>
//               <div className="mt-1">
//                 <input id="email" name="email" type="email" required className="block w-full rounded-md border border-gray-700 bg-[#0c0c0c] px-3 py-2 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm" />
//               </div>
//             </div>
//             <div>
//               <label htmlFor="password" className="block text-sm font-medium text-gray-300">Password</label>
//               <div className="mt-1">
//                 <input id="password" name="password" type="password" required className="block w-full rounded-md border border-gray-700 bg-[#0c0c0c] px-3 py-2 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm" />
//               </div>
//             </div>
//             <div className="flex items-center justify-between">
//               <div className="text-sm flex gap-4">
//                 <Link to="/forgot-password" className="font-medium text-green-500 hover:text-green-400">Forgot password?</Link>
//                 <Link to="/signup" className="text-gray-300 hover:text-white">Create account</Link>
//               </div>
//             </div>
//             <div>
//               <button type="submit" className="flex w-full justify-center rounded-md bg-green-500 py-2 px-4 text-sm font-medium text-white hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800">Sign in</button>
//             </div>
//           </form>
//         </div>
//       </div>
//     </div>
//   )
// }

// src/pages/Login.tsx
import { SignIn } from '@clerk/clerk-react'
import clerkAppearance from '../lib/clerkAppearance'

export default function Login(): JSX.Element {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#0b0b0b]">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-semibold text-white">Welcome back</h2>
          <p className="text-sm text-gray-400 mt-1">Sign in to continue to Interview Prep</p>
        </div>

        <div className="bg-white/5 p-6 rounded-md shadow-sm">
          {/* Local cast to avoid depending on Clerk internal types in this TS version */}
          <SignIn path="/login" routing="path" appearance={clerkAppearance as unknown as any} />
        </div>
      </div>
    </main>
  )
}
