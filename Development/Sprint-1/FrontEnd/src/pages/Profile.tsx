import { useState, useEffect } from "react";
import { useUser, useClerk, useAuth } from "@clerk/clerk-react";
import { Link } from "react-router-dom";

type Interview = {
  id: string;
  title: string;
  company: string;
  status: "completed" | "in-progress" | "scheduled" | string;
  date?: string;
};

type Stats = {
  total: number;
};

export default function Profile() {
  const { user, isLoaded } = useUser();
  const { openUserProfile } = useClerk();
  const { getToken } = useAuth();

  const [stats, setStats] = useState<Stats>({ total: 0 });
  const [recentInterviews, setRecentInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserData() {
      if (!user || !isLoaded) return;
      try {
        setLoading(true);
        const token = await getToken({ template: "interview-backend" });
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        // Fetch user interviews
        const interviewsResponse = await fetch(
          `${import.meta.env.VITE_API_URL}/api/interviews/user/interviews`,
          { headers }
        );
        if (!interviewsResponse.ok)
          throw new Error("Failed to fetch interviews");
        const interviewsData = await interviewsResponse.json();
        if (interviewsData.ok) {
          setRecentInterviews(interviewsData.interviews.slice(0, 3));
        }

        // Fetch user stats
        const statsResponse = await fetch(
          `${import.meta.env.VITE_API_URL}/api/interviews/user/stats`,
          { headers }
        );
        if (!statsResponse.ok) throw new Error("Failed to fetch stats");
        const statsData = await statsResponse.json();
        if (statsData.ok) setStats(statsData.stats);
      } catch (err: any) {
        console.error("Error fetching user data:", err);
        setError(err.message || "Failed to load profile data");
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
  }, [user, isLoaded, getToken]);

  const handleEditProfile = () => openUserProfile();

  const maskEmail = (email: string) => {
    if (!email) return "No email";
    const [name, domain] = email.split("@");
    if (!name || !domain) return email;
    const maskedName = name.length > 2 ? name.substring(0, 2) + "****" : name;
    return `${maskedName}@${domain}`;
  };

  const getStatusClasses = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/10 text-emerald-400";
      case "in-progress":
        return "bg-yellow-500/10 text-yellow-400";
      default:
        return "bg-blue-500/10 text-blue-400";
    }
  };

  if (!isLoaded || loading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-[#0c0c0c] px-6 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="text-center text-gray-400">Loading profile...</div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-[#0c0c0c] px-6 py-10">
        <div className="mx-auto max-w-4xl text-center">
          <div className="text-white text-lg mb-4">
            Please sign in to view your profile
          </div>
          <Link
            to="/"
            className="inline-flex items-center rounded-md bg-[#3ecf8e] px-4 py-2 text-sm font-semibold text-black hover:bg-[#36be81]"
          >
            Go to Homepage
          </Link>
        </div>
      </main>
    );
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
              {user.fullName || "User"}
            </h1>
            <p className="text-gray-400 mt-2">
              {user.primaryEmailAddress
                ? maskEmail(user.primaryEmailAddress.emailAddress)
                : "No email"}
              {user.primaryEmailAddress?.verification?.status ===
                "verified" && (
                <span className="ml-2 inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                  Verified
                </span>
              )}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-4 sm:justify-start">
              <div className="rounded-md bg-[#121212] px-4 py-2 text-center border border-white/5">
                <div className="text-xl font-bold text-white">
                  {stats.total}
                </div>
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
                <h2 className="text-lg font-semibold text-white">
                  Recent Interviews
                </h2>
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
                          <h3 className="font-medium text-white">
                            {interview.title}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {interview.company}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-block rounded px-2 py-1 text-xs font-medium ${getStatusClasses(
                                interview.status
                              )}`}
                            >
                              {interview.status}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            {interview.date
                              ? new Date(interview.date).toLocaleDateString()
                              : "No date"}
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
  );
}
