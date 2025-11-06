// import { useNavigate } from 'react-router-dom'
// import { addInterview } from '../lib/storage'
// import { useState } from 'react'
// import { useAuth } from '@clerk/clerk-react'
// import { Navigate } from 'react-router-dom'


// export default function CreateInterview() {
//   const navigate = useNavigate()
//   const [title, setTitle] = useState('')
//   const [company, setCompany] = useState('')
//   const [role, setRole] = useState('')
//   const [date, setDate] = useState('')

//   const { isLoaded, isSignedIn, userId, getToken } = useAuth()

//   if (!isLoaded) return <div /> // or spinner
//   if (!isSignedIn) return <Navigate to="/login" replace />

//   return (
//     <main className="min-h-[calc(100vh-4rem)] bg-[#0c0c0c] px-6 py-10">
//       <div className="mx-auto max-w-2xl">
//         <h1 className="text-2xl font-semibold text-white">Create Interview</h1>
//         <form
//           className="mt-6 grid grid-cols-1 gap-5"
//           onSubmit={(e) => {
//             e.preventDefault()
//             const created = addInterview({ title, company, role, date })
//             navigate(`/interview/${created.id}`)
//           }}
//         >
//           <div>
//             <label className="mb-1 block text-sm text-gray-300">Title</label>
//             <input
//               value={title}
//               onChange={(e) => setTitle(e.target.value)}
//               required
//               className="w-full rounded-md border border-white/10 bg-[#0b0b0b] px-3 py-2 text-white placeholder-gray-500 outline-none ring-emerald-500/20 focus:ring-2"
//               placeholder="Frontend Interview #1"
//             />
//           </div>
//           <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
//             <div>
//               <label className="mb-1 block text-sm text-gray-300">Company</label>
//               <input
//                 value={company}
//                 onChange={(e) => setCompany(e.target.value)}
//                 required
//                 className="w-full rounded-md border border-white/10 bg-[#0b0b0b] px-3 py-2 text-white placeholder-gray-500 outline-none ring-emerald-500/20 focus:ring-2"
//                 placeholder="Acme Inc"
//               />
//             </div>
//             <div>
//               <label className="mb-1 block text-sm text-gray-300">Role</label>
//               <input
//                 value={role}
//                 onChange={(e) => setRole(e.target.value)}
//                 required
//                 className="w-full rounded-md border border-white/10 bg-[#0b0b0b] px-3 py-2 text-white placeholder-gray-500 outline-none ring-emerald-500/20 focus:ring-2"
//                 placeholder="Frontend Engineer"
//               />
//             </div>
//           </div>
//           <div>
//             <label className="mb-1 block text-sm text-gray-300">Date & Time</label>
//             <input
//               type="datetime-local"
//               value={date}
//               onChange={(e) => setDate(e.target.value)}
//               required
//               className="w-full rounded-md border border-white/10 bg-[#0b0b0b] px-3 py-2 text-white placeholder-gray-500 outline-none ring-emerald-500/20 focus:ring-2"
//             />
//           </div>
//           <div className="flex justify-end gap-3">
//             <button
//               type="button"
//               onClick={() => navigate(-1)}
//               className="rounded-md border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
//             >
//               Cancel
//             </button>
//             <button
//               type="submit"
//               className="rounded-md bg-[#3ecf8e] px-4 py-2 text-sm font-semibold text-black hover:bg-[#36be81]"
//             >
//               Save & Start
//             </button>
//           </div>
//         </form>
//       </div>
//     </main>
//   )
// }
// src/pages/CreateInterview.tsx
// src/pages/CreateInterview.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { Navigate } from "react-router-dom";

export default function CreateInterview(): JSX.Element {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn, getToken } = useAuth();

  const [jobTitle, setJobTitle] = useState<string>("");
  const [company, setCompany] = useState<string>("");
  const [jobDescription, setJobDescription] = useState<string>("");

  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isLoaded) return <div />; // optional spinner
  if (!isSignedIn) return <Navigate to="/login" replace />;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // Basic client-side validation
    if (!jobTitle.trim() || !company.trim() || !jobDescription.trim()) {
      setError("Please fill in Job Title, Company and Job Description.");
      return;
    }

    setSaving(true);

    try {
      // Get a session token from Clerk (if available) to call protected endpoints
      let token: string | null = null;
      if (getToken) {
        try {
          token = await getToken();
        } catch (err) {
          console.warn("getToken failed:", err);
          token = null;
        }
      }

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/interviews/save-parameters`, {
        method: "POST",
        headers,
        body: JSON.stringify({ jobTitle, company, jobDescription }),
      });

      // Read response body even on non-ok so we can show helpful message
      const text = await res.text();
      let body: any = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch (err) {
        body = { message: text };
      }

      if (!res.ok) {
        // Prefer structured message, fallback to status
        const msg = body?.message || body?.error || `Server error: ${res.status}`;
        setError(String(msg));
        console.error("Failed to create interview:", res.status, body);
        return;
      }

      // success
      const interviewId = body?.interview._id ?? null;
      console.log("Interview created, ID:", interviewId);
      console.log("Interview created successfully:", body);

      if (interviewId) {
        // Navigate to interview session page if id is returned
        console.log("navigating")
        // navigate(`/interview/${interviewId}`);
        navigate("/interview-summary", {
          state: { jobTitle, company, description: jobDescription },
        });
      } else {
        // fallback to summary page with state
        // navigate("/interview-summary", {
        //   state: { jobTitle, company, description: jobDescription },
        // });
        setError("Error in creating interview. Please try again.");
      }
    } catch (err: any) {
      console.error("Error submitting interview:", err);
      setError(err?.message || "An unexpected error occurred while creating the interview.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#0c0c0c] px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-white">Create Interview</h1>

        <form className="mt-6 grid grid-cols-1 gap-5" onSubmit={handleSubmit}>
          {error && <div className="rounded-md bg-red-800/60 p-3 text-red-100">{error}</div>}

          <div>
            <label htmlFor="jobTitle" className="mb-1 block text-sm text-gray-300">
              Job Title
            </label>
            <input
              id="jobTitle"
              name="jobTitle"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              required
              className="w-full rounded-md border border-white/10 bg-[#0b0b0b] px-3 py-2 text-white placeholder-gray-500 outline-none ring-emerald-500/20 focus:ring-2"
              placeholder="Frontend Engineer"
            />
          </div>

          <div>
            <label htmlFor="company" className="mb-1 block text-sm text-gray-300">
              Company
            </label>
            <input
              id="company"
              name="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              required
              className="w-full rounded-md border border-white/10 bg-[#0b0b0b] px-3 py-2 text-white placeholder-gray-500 outline-none ring-emerald-500/20 focus:ring-2"
              placeholder="Acme Inc"
            />
          </div>

          <div>
            <label htmlFor="jobDescription" className="mb-1 block text-sm text-gray-300">
              Job Description
            </label>
            <textarea
              id="jobDescription"
              name="jobDescription"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              required
              className="w-full rounded-md border border-white/10 bg-[#0b0b0b] px-3 py-2 text-white placeholder-gray-500 outline-none ring-emerald-500/20 focus:ring-2"
              placeholder="Provide a detailed job description here..."
              rows={6}
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-md border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-[#3ecf8e] px-4 py-2 text-sm font-semibold text-black hover:bg-[#36be81] disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
