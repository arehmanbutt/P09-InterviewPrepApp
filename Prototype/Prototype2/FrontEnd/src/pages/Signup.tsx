// import { Link } from 'react-router-dom'

// export default function Signup() {
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
//         <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">Create your account</h2>
//       </div>

//       <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
//         <div className="bg-[#121212] py-8 px-4 shadow sm:rounded-lg sm:px-10">
//           <form className="space-y-6" onSubmit={(e)=>{e.preventDefault(); window.location.href='/verify-email'}}>
//             <div>
//               <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email address</label>
//               <input id="email" type="email" required className="mt-1 w-full rounded-md border border-gray-700 bg-[#0c0c0c] px-3 py-2 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm" />
//             </div>
//             <div>
//               <label htmlFor="password" className="block text-sm font-medium text-gray-300">Password</label>
//               <input id="password" type="password" required className="mt-1 w-full rounded-md border border-gray-700 bg-[#0c0c0c] px-3 py-2 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm" />
//             </div>
//             <div>
//               <label htmlFor="confirm" className="block text-sm font-medium text-gray-300">Confirm Password</label>
//               <input id="confirm" type="password" required className="mt-1 w-full rounded-md border border-gray-700 bg-[#0c0c0c] px-3 py-2 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm" />
//             </div>
//             <div className="space-y-3">
//               <button type="submit" className="flex w-full justify-center rounded-md bg-green-500 py-2 px-4 text-sm font-medium text-white hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-[#121212]">Sign up</button>
//               <div className="text-center text-sm text-gray-300">Already have an account? <Link to="/login" className="text-green-500 hover:text-green-400">Sign in</Link></div>
//               <div className="text-center text-sm"><Link to="/forgot-password" className="text-gray-400 hover:text-white">Forgot password?</Link></div>
//             </div>
//           </form>
//         </div>
//       </div>
//     </div>
//   )
// }

import { SignUp } from '@clerk/clerk-react'
import clerkAppearance from '../lib/clerkAppearance'

export default function Signup(): JSX.Element {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#0b0b0b]">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-semibold text-white">Create your account</h2>
          <p className="text-sm text-gray-400 mt-1">Start practicing interviews with AI feedback</p>
        </div>

        <div className="bg-white/5 p-6 rounded-md shadow-sm">
          <SignUp path="/signup" routing="path" appearance={clerkAppearance as unknown as any} />
        </div>
      </div>
    </main>
  )
}

