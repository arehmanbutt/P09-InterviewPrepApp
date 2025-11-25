// import React from 'react'
// import ReactDOM from 'react-dom/client'
// import { BrowserRouter, Routes, Route } from 'react-router-dom'
// import { ClerkProvider } from '@clerk/clerk-react';
// import './index.css'
// import App from './src/pages/App'
// import Home from './src/pages/Home'
// import Login from './src/pages/Login'
// import Signup from './src/pages/Signup'
// import VerifyEmail from './src/pages/VerifyEmail'
// import ForgotPassword from './src/pages/ForgotPassword'
// import Dashboard from './src/pages/Dashboard'
// import CreateInterview from './src/pages/CreateInterview'
// import Interview from './src/pages/Interview'

// const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// if (!PUBLISHABLE_KEY) {
//   throw new Error('Missing Publishable Key')
// }

// ReactDOM.createRoot(document.getElementById('root')!).render(
//   <React.StrictMode>
//     <BrowserRouter>
//       <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
//         <App>
//           <Routes>
//             <Route path="/" element={<Home />} />
//             <Route path="/login" element={<Login />} />
//             <Route path="/signup" element={<Signup />} />
//             <Route path="/verify-email" element={<VerifyEmail />} />
//             <Route path="/forgot-password" element={<ForgotPassword />} />
//             <Route path="/dashboard" element={<Dashboard />} />
//             <Route path="/create-interview" element={<CreateInterview />} />
//             <Route path="/interview/:id" element={<Interview />} />
//           </Routes>
//         </App>
//       </ClerkProvider>
//     </BrowserRouter>
//   </React.StrictMode>,
// )
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './src/pages/App'
import Home from './src/pages/Home'
import Login from './src/pages/Login'
import Signup from './src/pages/Signup'
import VerifyEmail from './src/pages/VerifyEmail'
import ForgotPassword from './src/pages/ForgotPassword'
import Dashboard from './src/pages/Dashboard'
import CreateInterview from './src/pages/CreateInterview'
import Interview from './src/pages/Interview'
import InterviewSummary from './src/pages/InterviewSummary'
import Profile from './src/pages/Profile'


const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Publishable Key — set VITE_CLERK_PUBLISHABLE_KEY in .env')
}

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <App>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create-interview" element={<CreateInterview />} />
            <Route path="/interview/:id" element={<Interview />} />
            <Route path="/interview-summary" element={<InterviewSummary />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </App>
      </ClerkProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
