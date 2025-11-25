// // import { Link } from 'react-router-dom'
// // import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react'

// // const Header = () => (
// //   <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0b0b]/90 backdrop-blur">
// //     <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center">
// //       <div className="flex flex-1 items-center">
// //         <Link to="/" className="flex items-center gap-2">
// //           <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" aria-label="Logo">
// //             <rect x="3" y="10" width="2" height="4" rx="1" fill="currentColor" />
// //             <rect x="7" y="7" width="2" height="10" rx="1" fill="currentColor" />
// //             <rect x="11" y="4" width="2" height="16" rx="1" fill="currentColor" />
// //             <rect x="15" y="7" width="2" height="10" rx="1" fill="currentColor" />
// //             <rect x="19" y="10" width="2" height="4" rx="1" fill="currentColor" />
// //           </svg>
// //           <span className="text-white text-base font-semibold tracking-wide">Interview Prep</span>
// //         </Link>
// //       </div>
// //       <div className="flex flex-1 items-center justify-end gap-3">
// //         <SignedIn>
// //           <UserButton />
// //         </SignedIn>

// //         <SignedOut>
// //           <SignInButton mode="modal">
// //             <button className="text-gray-300 hover:text-white text-sm font-medium">Sign in</button>
// //           </SignInButton>
// //           <SignUpButton mode="modal">
// //             <button className="inline-flex items-center rounded-md border border-white/15 bg-[#3ecf8e] px-3 py-1.5 text-sm font-semibold text-black hover:bg-[#36be81] ml-2">
// //               Sign up
// //             </button>
// //           </SignUpButton>
// //         </SignedOut>
// //       </div>
// //     </div>
// //   </header>
// // )

// // export default Header
// // src/components/layout/Header.tsx
// import React from 'react'
// import { Link } from 'react-router-dom'
// import {
//   SignedIn,
//   SignedOut,
//   SignInButton,
//   SignUpButton,
//   UserButton,
//   SignOutButton,
// } from '@clerk/clerk-react'

// const Header: React.FC = () => {
//   return (
//     <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0b0b]/90 backdrop-blur">
//       <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center">
//         <div className="flex flex-1 items-center">
//           <Link to="/" className="flex items-center gap-2">
//             <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" aria-label="Logo">
//               <rect x="3" y="10" width="2" height="4" rx="1" fill="currentColor" />
//               <rect x="7" y="7" width="2" height="10" rx="1" fill="currentColor" />
//               <rect x="11" y="4" width="2" height="16" rx="1" fill="currentColor" />
//               <rect x="15" y="7" width="2" height="10" rx="1" fill="currentColor" />
//               <rect x="19" y="10" width="2" height="4" rx="1" fill="currentColor" />
//             </svg>
//             <span className="text-white text-base font-semibold tracking-wide">Interview Prep</span>
//           </Link>
//         </div>

//         <div className="flex flex-1 items-center justify-end gap-3">
//           <SignedIn>
//             <UserButton />
//             {/* Optionally show a sign out button somewhere */}
//             <div className="hidden">
//               <SignOutButton />
//             </div>
//           </SignedIn>

//           <SignedOut>
//             <SignInButton mode="modal">
//               <button className="text-gray-300 hover:text-white text-sm font-medium">Sign in</button>
//             </SignInButton>

//             <SignUpButton mode="modal">
//               <button className="inline-flex items-center rounded-md border border-white/15 bg-[#3ecf8e] px-3 py-1.5 text-sm font-semibold text-black hover:bg-[#36be81]">
//                 Sign up
//               </button>
//             </SignUpButton>
//           </SignedOut>
//         </div>
//       </div>
//     </header>
//   )
// }

// export default Header


// import { Link } from 'react-router-dom'
// import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react'

// const Header = () => (
//   <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0b0b]/90 backdrop-blur">
//     <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center">
//       <div className="flex flex-1 items-center">
//         <Link to="/" className="flex items-center gap-2">
//           <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" aria-label="Logo">
//             <rect x="3" y="10" width="2" height="4" rx="1" fill="currentColor" />
//             <rect x="7" y="7" width="2" height="10" rx="1" fill="currentColor" />
//             <rect x="11" y="4" width="2" height="16" rx="1" fill="currentColor" />
//             <rect x="15" y="7" width="2" height="10" rx="1" fill="currentColor" />
//             <rect x="19" y="10" width="2" height="4" rx="1" fill="currentColor" />
//           </svg>
//           <span className="text-white text-base font-semibold tracking-wide">Interview Prep</span>
//         </Link>
//       </div>
//       <div className="flex flex-1 items-center justify-end gap-3">
//         <SignedIn>
//           <UserButton />
//         </SignedIn>

//         <SignedOut>
//           <SignInButton mode="modal">
//             <button className="text-gray-300 hover:text-white text-sm font-medium">Sign in</button>
//           </SignInButton>
//           <SignUpButton mode="modal">
//             <button className="inline-flex items-center rounded-md border border-white/15 bg-[#3ecf8e] px-3 py-1.5 text-sm font-semibold text-black hover:bg-[#36be81] ml-2">
//               Sign up
//             </button>
//           </SignUpButton>
//         </SignedOut>
//       </div>
//     </div>
//   </header>
// )

// export default Header
// src/components/layout/Header.tsx
import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
  SignOutButton,
} from '@clerk/clerk-react'

const Header: React.FC = () => {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0b0b]/90 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center">
        <div className="flex flex-1 items-center">
          <Link to="/" className="flex items-center gap-2">
            <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" aria-label="Logo">
              <rect x="3" y="10" width="2" height="4" rx="1" fill="currentColor" />
              <rect x="7" y="7" width="2" height="10" rx="1" fill="currentColor" />
              <rect x="11" y="4" width="2" height="16" rx="1" fill="currentColor" />
              <rect x="15" y="7" width="2" height="10" rx="1" fill="currentColor" />
              <rect x="19" y="10" width="2" height="4" rx="1" fill="currentColor" />
            </svg>
            <span className="text-white text-base font-semibold tracking-wide">Interview Prep</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">
          <SignedIn>
            <UserButton>
              <UserButton.MenuItems>
                <UserButton.Action label="Edit Profile" labelIcon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>} onClick={() => navigate('/profile')} />
              </UserButton.MenuItems>
            </UserButton>
            {/* Optionally show a sign out button somewhere */}
            <div className="hidden">
              <SignOutButton />
            </div>
          </SignedIn>

          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-gray-300 hover:text-white text-sm font-medium">Sign in</button>
            </SignInButton>

            <SignUpButton mode="modal">
              <button className="inline-flex items-center rounded-md border border-white/15 bg-[#3ecf8e] px-3 py-1.5 text-sm font-semibold text-black hover:bg-[#36be81]">
                Sign up
              </button>
            </SignUpButton>
          </SignedOut>
        </div>
      </div>
    </header>
  )
}

export default Header
