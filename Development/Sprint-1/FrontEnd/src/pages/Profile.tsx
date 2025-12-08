// // // import { useState, useEffect, useRef } from 'react'
// // // import { useUser, useClerk } from '@clerk/clerk-react'
// // // import { Link } from 'react-router-dom'
// // // import { readInterviews, InterviewItem } from '../lib/storage'

// // // export default function Profile() {
// // //   const { user, isLoaded } = useUser()
// // //   const { openUserProfile } = useClerk()
// // //   const [interviews, setInterviews] = useState<InterviewItem[]>([])
// // //   const [stats, setStats] = useState({ total: 0, completed: 0 })
  
// // //   // Form states
// // //   const [firstName, setFirstName] = useState('')
// // //   const [lastName, setLastName] = useState('')
// // //   const [audioSpeed, setAudioSpeed] = useState('1.0')
// // //   const [privacyOptOut, setPrivacyOptOut] = useState(false)
// // //   const [isEditing, setIsEditing] = useState(false)
// // //   const [saving, setSaving] = useState(false)
// // //   const [msg, setMsg] = useState<string | null>(null)
  
// // //   const fileInputRef = useRef<HTMLInputElement>(null)

// // //   useEffect(() => {
// // //     if (user) {
// // //       setFirstName(user.firstName || '')
// // //       setLastName(user.lastName || '')
// // //       // Load preferences from metadata
// // //       const prefs = (user.unsafeMetadata as any)?.preferences || {}
// // //       setAudioSpeed(prefs.audioSpeed || '1.0')
// // //       setPrivacyOptOut(prefs.privacyOptOut || false)
// // //     }
// // //   }, [user])

// // //   useEffect(() => {
// // //     const items = readInterviews()
// // //     setInterviews(items)
// // //     setStats({
// // //       total: items.length,
// // //       completed: items.filter(i => i.status === 'completed').length
// // //     })
// // //   }, [])

// // //   if (!isLoaded || !user) return <div className="min-h-screen bg-[#0c0c0c]" />

// // //   const recentInterviews = [...interviews]
// // //     .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
// // //     .slice(0, 3)

// // //   const handleSave = async () => {
// // //     setSaving(true)
// // //     setMsg(null)
// // //     try {
// // //       await user.update({
// // //         firstName,
// // //         lastName,
// // //         unsafeMetadata: {
// // //           preferences: {
// // //             audioSpeed,
// // //             privacyOptOut
// // //           }
// // //         }
// // //       })
// // //       setMsg('Profile updated successfully')
// // //       setIsEditing(false)
// // //     } catch (err: any) {
// // //       setMsg(err.message || 'Failed to update profile')
// // //     } finally {
// // //       setSaving(false)
// // //     }
// // //   }

// // //   const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
// // //     const file = e.target.files?.[0]
// // //     if (!file) return
    
// // //     try {
// // //       setSaving(true)
// // //       await user.setProfileImage({ file })
// // //       setMsg('Avatar updated')
// // //     } catch (err: any) {
// // //       setMsg('Failed to update avatar')
// // //     } finally {
// // //       setSaving(false)
// // //     }
// // //   }

// // //   const maskEmail = (email: string) => {
// // //     const [name, domain] = email.split('@')
// // //     if (!name || !domain) return email
// // //     const maskedName = name.length > 2 ? name.substring(0, 2) + '****' : name
// // //     return `${maskedName}@${domain}`
// // //   }

// // //   return (
// // //     <main className="min-h-[calc(100vh-4rem)] bg-[#0c0c0c] px-6 py-10">
// // //       <div className="mx-auto max-w-4xl space-y-8">
        
// // //         {/* Header Section */}
// // //         <div className="flex flex-col items-center gap-6 rounded-lg border border-white/10 bg-[#0e0e0e] p-8 sm:flex-row sm:items-start">
// // //           <div className="relative group">
// // //             <img 
// // //               src={user.imageUrl} 
// // //               alt="Profile" 
// // //               className="h-24 w-24 rounded-full object-cover ring-2 ring-white/10"
// // //             />
// // //             <button 
// // //               onClick={() => fileInputRef.current?.click()}
// // //               className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition group-hover:opacity-100"
// // //             >
// // //               <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// // //                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
// // //                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
// // //               </svg>
// // //             </button>
// // //             <input 
// // //               type="file" 
// // //               ref={fileInputRef} 
// // //               className="hidden" 
// // //               accept="image/*"
// // //               onChange={handleAvatarChange}
// // //             />
// // //           </div>
          
// // //           <div className="flex-1 text-center sm:text-left">
// // //             <h1 className="text-2xl font-bold text-white">
// // //               {user.fullName || 'User'}
// // //             </h1>
// // //             <p className="text-gray-400">
// // //               {user.primaryEmailAddress ? maskEmail(user.primaryEmailAddress.emailAddress) : 'No email'}
// // //               {user.primaryEmailAddress?.verification.status === 'verified' && (
// // //                 <span className="ml-2 inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
// // //                   Verified
// // //                 </span>
// // //               )}
// // //             </p>
// // //             <div className="mt-4 flex flex-wrap justify-center gap-4 sm:justify-start">
// // //               <div className="rounded-md bg-[#121212] px-4 py-2 text-center border border-white/5">
// // //                 <div className="text-xl font-bold text-white">{stats.total}</div>
// // //                 <div className="text-xs text-gray-400">Total Interviews</div>
// // //               </div>
// // //               <div className="rounded-md bg-[#121212] px-4 py-2 text-center border border-white/5">
// // //                 <div className="text-xl font-bold text-emerald-400">{stats.completed}</div>
// // //                 <div className="text-xs text-gray-400">Completed</div>
// // //               </div>
// // //               <div className="rounded-md bg-[#121212] px-4 py-2 text-center border border-white/5">
// // //                 <div className="text-xl font-bold text-blue-400">N/A</div>
// // //                 <div className="text-xs text-gray-400">Avg Score</div>
// // //               </div>
// // //             </div>
// // //           </div>

// // //           <button
// // //             onClick={() => setIsEditing(!isEditing)}
// // //             className="rounded-md border border-white/10 bg-[#121212] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a1a1a]"
// // //           >
// // //             {isEditing ? 'Cancel Edit' : 'Edit Profile'}
// // //           </button>
// // //         </div>

// // //         <div className="grid gap-8 lg:grid-cols-3">
// // //           {/* Main Content */}
// // //           <div className="lg:col-span-2 space-y-8">
            
// // //             {/* Edit Form */}
// // //             {isEditing && (
// // //               <section className="rounded-lg border border-white/10 bg-[#0e0e0e] p-6">
// // //                 <h2 className="text-lg font-semibold text-white mb-4">Edit Profile & Preferences</h2>
// // //                 <div className="space-y-4">
// // //                   <div className="grid grid-cols-2 gap-4">
// // //                     <div>
// // //                       <label className="block text-sm text-gray-400 mb-1">First Name</label>
// // //                       <input
// // //                         value={firstName}
// // //                         onChange={(e) => setFirstName(e.target.value)}
// // //                         className="w-full rounded-md border border-white/10 bg-[#0b0b0b] px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
// // //                       />
// // //                     </div>
// // //                     <div>
// // //                       <label className="block text-sm text-gray-400 mb-1">Last Name</label>
// // //                       <input
// // //                         value={lastName}
// // //                         onChange={(e) => setLastName(e.target.value)}
// // //                         className="w-full rounded-md border border-white/10 bg-[#0b0b0b] px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
// // //                       />
// // //                     </div>
// // //                   </div>

// // //                   <div>
// // //                     <label className="block text-sm text-gray-400 mb-1">Audio Playback Speed</label>
// // //                     <select
// // //                       value={audioSpeed}
// // //                       onChange={(e) => setAudioSpeed(e.target.value)}
// // //                       className="w-full rounded-md border border-white/10 bg-[#0b0b0b] px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
// // //                     >
// // //                       <option value="0.75">0.75x</option>
// // //                       <option value="1.0">1.0x (Normal)</option>
// // //                       <option value="1.25">1.25x</option>
// // //                       <option value="1.5">1.5x</option>
// // //                       <option value="2.0">2.0x</option>
// // //                     </select>
// // //                   </div>

// // //                   <div className="flex items-center gap-3">
// // //                     <input
// // //                       type="checkbox"
// // //                       id="privacy"
// // //                       checked={privacyOptOut}
// // //                       onChange={(e) => setPrivacyOptOut(e.target.checked)}
// // //                       className="h-4 w-4 rounded border-gray-600 bg-[#0b0b0b] text-emerald-500 focus:ring-emerald-500"
// // //                     />
// // //                     <label htmlFor="privacy" className="text-sm text-gray-300">
// // //                       Opt-out of saving transcripts for training data
// // //                     </label>
// // //                   </div>

// // //                   <div className="pt-4 flex items-center justify-between">
// // //                     <button
// // //                       onClick={handleSave}
// // //                       disabled={saving}
// // //                       className="rounded-md bg-[#3ecf8e] px-4 py-2 text-sm font-semibold text-black hover:bg-[#36be81] disabled:opacity-50"
// // //                     >
// // //                       {saving ? 'Saving...' : 'Save Changes'}
// // //                     </button>
// // //                     {msg && <span className={`text-sm ${msg.includes('success') ? 'text-emerald-400' : 'text-red-400'}`}>{msg}</span>}
// // //                   </div>
                  
// // //                   <div className="mt-6 border-t border-white/10 pt-4">
// // //                     <h3 className="text-sm font-medium text-white mb-2">Security</h3>
// // //                     <p className="text-xs text-gray-400 mb-3">
// // //                       To change your email, password, or delete your account, please visit the secure account management page.
// // //                     </p>
// // //                     <button
// // //                       onClick={() => openUserProfile()}
// // //                       className="text-sm text-emerald-400 hover:text-emerald-300 underline"
// // //                     >
// // //                       Manage Account Security
// // //                     </button>
// // //                   </div>
// // //                 </div>
// // //               </section>
// // //             )}

// // //             {/* Recent Activity */}
// // //             <section className="rounded-lg border border-white/10 bg-[#0e0e0e] p-6">
// // //               <h2 className="text-lg font-semibold text-white mb-4">Recent Interviews</h2>
// // //               {recentInterviews.length > 0 ? (
// // //                 <div className="space-y-3">
// // //                   {recentInterviews.map((interview) => (
// // //                     <Link 
// // //                       key={interview.id} 
// // //                       to={`/interview/${interview.id}`}
// // //                       className="block rounded-md border border-white/5 bg-[#121212] p-4 transition hover:border-white/10 hover:bg-[#161616]"
// // //                     >
// // //                       <div className="flex items-center justify-between">
// // //                         <div>
// // //                           <h3 className="font-medium text-white">{interview.title}</h3>
// // //                           <p className="text-sm text-gray-400">{interview.company} • {interview.role}</p>
// // //                         </div>
// // //                         <div className="text-right">
// // //                           <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${
// // //                             interview.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'
// // //                           }`}>
// // //                             {interview.status}
// // //                           </span>
// // //                           <p className="mt-1 text-xs text-gray-500">{new Date(interview.date).toLocaleDateString()}</p>
// // //                         </div>
// // //                       </div>
// // //                     </Link>
// // //                   ))}
// // //                 </div>
// // //               ) : (
// // //                 <p className="text-gray-400">No interviews yet.</p>
// // //               )}
// // //             </section>
// // //           </div>

// // //           {/* Sidebar */}
// // //           <div className="space-y-8">
// // //             {/* Feedback Widget */}
// // //             <section className="rounded-lg border border-white/10 bg-[#0e0e0e] p-6">
// // //               <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
// // //                 <svg className="h-4 w-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// // //                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
// // //                 </svg>
// // //                 Outstanding Feedback
// // //               </h2>
// // //               <div className="space-y-3">
// // //                 <div className="rounded-md bg-[#121212] p-3 border border-white/5">
// // //                   <p className="text-sm text-gray-300">Resume pacing in "Frontend Interview #1"</p>
// // //                   <Link to="#" className="mt-2 block text-xs text-emerald-400 hover:underline">View Report</Link>
// // //                 </div>
// // //                 <div className="rounded-md bg-[#121212] p-3 border border-white/5">
// // //                   <p className="text-sm text-gray-300">Clarify technical terms in "System Design"</p>
// // //                   <Link to="#" className="mt-2 block text-xs text-emerald-400 hover:underline">View Report</Link>
// // //                 </div>
// // //               </div>
// // //             </section>
// // //           </div>
// // //         </div>
// // //       </div>
// // //     </main>
// // //   )
// // // }



// import { useState, useEffect } from 'react'
// import { useUser, useClerk } from '@clerk/clerk-react'
// import { Link } from 'react-router-dom'

// // Mock data - replace with actual API calls later
// const mockInterviewStats = {
//   completed: 8
// }

// const mockRecentInterviews = [
//   {
//     id: '1',
//     title: 'Frontend Developer Interview',
//     company: 'Tech Corp',
//     role: 'Senior Frontend Engineer',
//     date: '2024-01-15',
//     status: 'completed'
//   },
//   {
//     id: '2', 
//     title: 'System Design Interview',
//     company: 'Startup Inc',
//     role: 'Full Stack Developer',
//     date: '2024-01-10',
//     status: 'completed'
//   },
//   {
//     id: '3',
//     title: 'Technical Screening',
//     company: 'Big Tech',
//     role: 'React Developer',
//     date: '2024-01-08',
//     status: 'in-progress'
//   }
// ]

// export default function Profile() {
//   const { user, isLoaded } = useUser()
//   const { openUserProfile } = useClerk()
//   const [stats, setStats] = useState({ completed: 0 })
//   const [recentInterviews, setRecentInterviews] = useState<any[]>([])

//   useEffect(() => {
//     if (user && isLoaded) {
//       // Load mock data when user is available
//       setStats(mockInterviewStats)
//       setRecentInterviews(mockRecentInterviews)
//     }
//   }, [user, isLoaded])

//   const handleEditProfile = () => {
//     // Opens Clerk's profile modal with ALL account management options
//     openUserProfile()
//   }

//   const maskEmail = (email: string) => {
//     if (!email) return 'No email'
//     const [name, domain] = email.split('@')
//     if (!name || !domain) return email
//     const maskedName = name.length > 2 ? name.substring(0, 2) + '****' : name
//     return `${maskedName}@${domain}`
//   }

//   // Show loading state
//   if (!isLoaded) {
//     return (
//       <main className="min-h-[calc(100vh-4rem)] bg-[#0c0c0c] px-6 py-10">
//         <div className="mx-auto max-w-4xl">
//           <div className="text-center text-gray-400">Loading profile...</div>
//         </div>
//       </main>
//     )
//   }

//   // Show not signed in state
//   if (!user) {
//     return (
//       <main className="min-h-[calc(100vh-4rem)] bg-[#0c0c0c] px-6 py-10">
//         <div className="mx-auto max-w-4xl text-center">
//           <div className="text-white text-lg mb-4">Please sign in to view your profile</div>
//           <Link 
//             to="/" 
//             className="inline-flex items-center rounded-md bg-[#3ecf8e] px-4 py-2 text-sm font-semibold text-black hover:bg-[#36be81]"
//           >
//             Go to Homepage
//           </Link>
//         </div>
//       </main>
//     )
//   }

//   return (
//     <main className="min-h-[calc(100vh-4rem)] bg-[#0c0c0c] px-6 py-10">
//       <div className="mx-auto max-w-4xl space-y-8">
        
//         {/* Header Section */}
//         <div className="flex flex-col items-center gap-6 rounded-lg border border-white/10 bg-[#0e0e0e] p-8 sm:flex-row sm:items-start">
//           <div className="relative">
//             <img 
//               src={user.imageUrl} 
//               alt="Profile" 
//               className="h-24 w-24 rounded-full object-cover ring-2 ring-white/10"
//             />
//           </div>
          
//           <div className="flex-1 text-center sm:text-left">
//             <h1 className="text-2xl font-bold text-white">
//               {user.fullName || 'User'}
//             </h1>
//             <p className="text-gray-400 mt-2">
//               {user.primaryEmailAddress ? maskEmail(user.primaryEmailAddress.emailAddress) : 'No email'}
//               {user.primaryEmailAddress?.verification?.status === 'verified' && (
//                 <span className="ml-2 inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
//                   Verified
//                 </span>
//               )}
//             </p>
//             <div className="mt-4 flex flex-wrap justify-center gap-4 sm:justify-start">
//               <div className="rounded-md bg-[#121212] px-4 py-2 text-center border border-white/5">
//                 <div className="text-xl font-bold text-emerald-400">{stats.completed}</div>
//                 <div className="text-xs text-gray-400">Interviews Completed</div>
//               </div>
//             </div>
//           </div>

//           <button
//             onClick={handleEditProfile}
//             className="rounded-md bg-[#3ecf8e] px-4 py-2 text-sm font-semibold text-black hover:bg-[#36be81]"
//           >
//             Edit Profile
//           </button>
//         </div>

//         <div className="grid gap-8 lg:grid-cols-3">
//           {/* Main Content */}
//           <div className="lg:col-span-2 space-y-8">
            
//             {/* Recent Activity */}
//             <section className="rounded-lg border border-white/10 bg-[#0e0e0e] p-6">
//               <div className="flex items-center justify-between mb-4">
//                 <h2 className="text-lg font-semibold text-white">Recent Interviews</h2>
//                 <Link 
//                   to="/interviews" 
//                   className="text-sm text-emerald-400 hover:text-emerald-300 underline"
//                 >
//                   View All Interviews
//                 </Link>
//               </div>
              
//               {recentInterviews.length > 0 ? (
//                 <div className="space-y-3">
//                   {recentInterviews.map((interview) => (
//                     <Link 
//                       key={interview.id} 
//                       to={`/interview/${interview.id}`}
//                       className="block rounded-md border border-white/5 bg-[#121212] p-4 transition hover:border-white/10 hover:bg-[#161616]"
//                     >
//                       <div className="flex items-center justify-between">
//                         <div>
//                           <h3 className="font-medium text-white">{interview.title}</h3>
//                           <p className="text-sm text-gray-400">{interview.company} • {interview.role}</p>
//                         </div>
//                         <div className="text-right">
//                           <div className="flex items-center gap-2">
//                             <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${
//                               interview.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'
//                             }`}>
//                               {interview.status}
//                             </span>
//                           </div>
//                           <p className="mt-1 text-xs text-gray-500">{new Date(interview.date).toLocaleDateString()}</p>
//                         </div>
//                       </div>
//                     </Link>
//                   ))}
//                 </div>
//               ) : (
//                 <p className="text-gray-400">No interviews yet.</p>
//               )}
//             </section>
//           </div>

//           {/* Sidebar */}
//           <div className="space-y-8">
//             {/* Feedback Widget */}
//             <section className="rounded-lg border border-white/10 bg-[#0e0e0e] p-6">
//               <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
//                 <svg className="h-4 w-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//                 </svg>
//                 Outstanding Feedback
//               </h2>
//               <div className="space-y-3">
//                 <div className="rounded-md bg-[#121212] p-3 border border-white/5">
//                   <p className="text-sm text-gray-300">Resume pacing in "Frontend Interview #1"</p>
//                   <Link to="#" className="mt-2 block text-xs text-emerald-400 hover:underline">View Report</Link>
//                 </div>
//                 <div className="rounded-md bg-[#121212] p-3 border border-white/5">
//                   <p className="text-sm text-gray-300">Clarify technical terms in "System Design"</p>
//                   <Link to="#" className="mt-2 block text-xs text-emerald-400 hover:underline">View Report</Link>
//                 </div>
//               </div>
//             </section>

//             {/* Quick Stats */}
//             <section className="rounded-lg border border-white/10 bg-[#0e0e0e] p-6">
//               <h2 className="text-sm font-semibold text-white mb-4">Quick Stats</h2>
//               <div className="space-y-3">
//                 <div className="flex justify-between items-center">
//                   <span className="text-sm text-gray-400">Interviews This Week</span>
//                   <span className="text-sm font-medium text-white">3</span>
//                 </div>
//                 <div className="flex justify-between items-center">
//                   <span className="text-sm text-gray-400">Best Performance</span>
//                   <span className="text-sm font-medium text-emerald-400">Frontend</span>
//                 </div>
//                 <div className="flex justify-between items-center">
//                   <span className="text-sm text-gray-400">Practice Streak</span>
//                   <span className="text-sm font-medium text-blue-400">5 days</span>
//                 </div>
//               </div>
//             </section>
//           </div>
//         </div>
//       </div>
//     </main>
//   )
import { useState, useEffect } from 'react'
import { useUser, useClerk, useAuth } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'

export default function Profile() {
  const { user, isLoaded } = useUser()
  const { openUserProfile } = useClerk()
  const { getToken } = useAuth()
  const [stats, setStats] = useState({ 
    total: 0
  })
  const [recentInterviews, setRecentInterviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUserData() {
      if (!user || !isLoaded) return

      try {
        setLoading(true)
        const token = await getToken({ template: "interview-backend" })
        
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }

        // Fetch user interviews
        const interviewsResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/interviews/user/interviews`, { headers })
        if (!interviewsResponse.ok) throw new Error('Failed to fetch interviews')
        
        const interviewsData = await interviewsResponse.json()
        if (interviewsData.ok) {
          setRecentInterviews(interviewsData.interviews.slice(0, 3)) // Show only 3 most recent
        }

        // Fetch user stats
        const statsResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/interviews/user/stats`, { headers })
        if (!statsResponse.ok) throw new Error('Failed to fetch stats')
        
        const statsData = await statsResponse.json()
        if (statsData.ok) {
          setStats(statsData.stats)
        }

      } catch (err: any) {
        console.error('Error fetching user data:', err)
        setError(err.message || 'Failed to load profile data')
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [user, isLoaded, getToken])

  const handleEditProfile = () => {
    openUserProfile()
  }

  const maskEmail = (email: string) => {
    if (!email) return 'No email'
    const [name, domain] = email.split('@')
    if (!name || !domain) return email
    const maskedName = name.length > 2 ? name.substring(0, 2) + '****' : name
    return `${maskedName}@${domain}`
  }

  // Show loading state
  if (!isLoaded || loading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-[#0c0c0c] px-6 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="text-center text-gray-400">Loading profile...</div>
        </div>
      </main>
    )
  }

  // Show not signed in state
  if (!user) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-[#0c0c0c] px-6 py-10">
        <div className="mx-auto max-w-4xl text-center">
          <div className="text-white text-lg mb-4">Please sign in to view your profile</div>
          <Link 
            to="/" 
            className="inline-flex items-center rounded-md bg-[#3ecf8e] px-4 py-2 text-sm font-semibold text-black hover:bg-[#36be81]"
          >
            Go to Homepage
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#0c0c0c] px-6 py-10">
      <div className="mx-auto max-w-4xl space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col items-center gap-6 rounded-lg border border-white/10 bg-[#0e0e0e] p-8 sm:flex-row sm:items-start">
          <div className="relative">
            <img 
              src={user.imageUrl} 
              alt="Profile" 
              className="h-24 w-24 rounded-full object-cover ring-2 ring-white/10"
            />
          </div>
          
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-white">
              {user.fullName || 'User'}
            </h1>
            <p className="text-gray-400 mt-2">
              {user.primaryEmailAddress ? maskEmail(user.primaryEmailAddress.emailAddress) : 'No email'}
              {user.primaryEmailAddress?.verification?.status === 'verified' && (
                <span className="ml-2 inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                  Verified
                </span>
              )}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-4 sm:justify-start">
              <div className="rounded-md bg-[#121212] px-4 py-2 text-center border border-white/5">
                <div className="text-xl font-bold text-white">{stats.total}</div>
                <div className="text-xs text-gray-400">Total Interviews</div>
              </div>
            </div>
          </div>

          <button
            onClick={handleEditProfile}
            className="rounded-md bg-[#3ecf8e] px-4 py-2 text-sm font-semibold text-black hover:bg-[#36be81]"
          >
            Edit Profile
          </button>
        </div>

        {error && (
          <div className="rounded-md bg-red-800/60 p-4 text-red-100">
            {error}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Recent Activity */}
            <section className="rounded-lg border border-white/10 bg-[#0e0e0e] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Recent Interviews</h2>
                {recentInterviews.length > 0 && (
                  <Link 
                    to="/interviews" 
                    className="text-sm text-emerald-400 hover:text-emerald-300 underline"
                  >
                    View All Interviews
                  </Link>
                )}
              </div>
              
              {recentInterviews.length > 0 ? (
                <div className="space-y-3">
                  {recentInterviews.map((interview) => (
                    <Link 
                      key={interview.id} 
                      to={`/interview/${interview.id}`}
                      className="block rounded-md border border-white/5 bg-[#121212] p-4 transition hover:border-white/10 hover:bg-[#161616]"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-white">{interview.title}</h3>
                          <p className="text-sm text-gray-400">{interview.company}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                              interview.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 
                              interview.status === 'in-progress' ? 'bg-yellow-500/10 text-yellow-400' :
                              'bg-blue-500/10 text-blue-400'
                            }`}>
                              {interview.status}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            {interview.date ? new Date(interview.date).toLocaleDateString() : 'No date'}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">No interviews yet.</p>
                  <Link 
                    to="/create-interview" 
                    className="inline-flex items-center rounded-md bg-[#3ecf8e] px-4 py-2 text-sm font-semibold text-black hover:bg-[#36be81]"
                  >
                    Create Your First Interview
                  </Link>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Account Actions */}
            <section className="rounded-lg border border-white/10 bg-[#0e0e0e] p-6">
              <h2 className="text-sm font-semibold text-white mb-4">Account</h2>
              <div className="space-y-3">
                <button
                  onClick={handleEditProfile}
                  className="w-full text-left text-sm text-emerald-400 hover:text-emerald-300 underline"
                >
                  Manage Account Settings
                </button>
                <Link 
                  to="/create-interview" 
                  className="block w-full text-left text-sm text-emerald-400 hover:text-emerald-300 underline"
                >
                  Create New Interview
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}