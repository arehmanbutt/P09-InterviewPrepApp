"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ErrorBoundary from "../../components/ErrorBoundary";
import {
  Loader2,
  Monitor,
  Server,
  Layers,
  BarChart3,
  Cloud,
  Briefcase,
  X,
  Code,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Template {
  name: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

const TEMPLATES: Template[] = [
  {
    name: "Frontend Developer",
    icon: Monitor,
    title: "Frontend Developer",
    description:
      "We are looking for a Frontend Developer skilled in React, TypeScript, CSS, web performance optimization, and responsive design. The ideal candidate will build modern, accessible user interfaces and collaborate with cross-functional teams.",
  },
  {
    name: "Backend Developer",
    icon: Server,
    title: "Backend Developer",
    description:
      "We are seeking a Backend Developer with expertise in designing RESTful APIs, working with databases (SQL and NoSQL), server architecture, scalability patterns, and security best practices.",
  },
  {
    name: "Full Stack Developer",
    icon: Layers,
    title: "Full Stack Developer",
    description:
      "We need a Full Stack Developer experienced in end-to-end web development, covering frontend frameworks, backend services, database design, and basic DevOps and deployment workflows.",
  },
  {
    name: "Data Scientist",
    icon: BarChart3,
    title: "Data Scientist",
    description:
      "We are hiring a Data Scientist proficient in machine learning, statistics, Python, data pipelines, and model evaluation. The role involves extracting insights from large datasets and building predictive models.",
  },
  {
    name: "DevOps Engineer",
    icon: Cloud,
    title: "DevOps Engineer",
    description:
      "We are looking for a DevOps Engineer experienced with CI/CD pipelines, cloud infrastructure (AWS/GCP/Azure), containerization (Docker, Kubernetes), monitoring, and infrastructure as code (Terraform).",
  },
  {
    name: "Product Manager",
    icon: Briefcase,
    title: "Product Manager",
    description:
      "We are seeking a Product Manager skilled in product strategy, roadmap planning, stakeholder management, user analytics, and cross-functional collaboration to drive product development from ideation to launch.",
  },
];

function CreateInterviewForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [jobLevel, setJobLevel] = useState("mid");
  const [isMassInterview, setIsMassInterview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template.name);
    setTitle(template.title);
    setDescription(template.description);
  };

  const handleClearTemplate = () => {
    setSelectedTemplate(null);
    setTitle("");
    setDescription("");
  };

  const handleSubmit = async (interviewType: "technical" | "hr") => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          company,
          description,
          numQuestions,
          jobLevel,
          isMassInterview,
          interviewType,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create interview");
      }

      toast.success("Interview created");
      router.push("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCodingInterview = () => {
    router.push("/coding-interview");
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Templates Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white mb-1">Start from a Template</h2>
        <p className="text-sm text-gray-400 mb-4">
          Pick a template to pre-fill the job title and description, or start from scratch below.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {TEMPLATES.map((template) => {
            const Icon = template.icon;
            const isSelected = selectedTemplate === template.name;
            return (
              <button
                key={template.name}
                type="button"
                onClick={() => handleSelectTemplate(template)}
                className={`rounded-xl border p-4 text-left transition cursor-pointer ${
                  isSelected
                    ? "border-[#3ecf8e] bg-[#3ecf8e]/10"
                    : "border-white/10 bg-white/5 hover:border-[#3ecf8e]/50"
                }`}
              >
                <Icon size={20} className={isSelected ? "text-[#3ecf8e]" : "text-gray-400"} />
                <p
                  className={`mt-2 text-sm font-medium ${isSelected ? "text-[#3ecf8e]" : "text-white"}`}
                >
                  {template.name}
                </p>
              </button>
            );
          })}
        </div>
        {selectedTemplate && (
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
            <span>
              Using template: <span className="text-[#3ecf8e]">{selectedTemplate}</span>
            </span>
            <button
              type="button"
              onClick={handleClearTemplate}
              aria-label="Clear template"
              className="rounded-full p-0.5 text-gray-400 transition hover:bg-white/10 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        <h1 className="text-2xl font-bold text-white mb-2">Create Interview</h1>
        <p className="text-gray-400 mb-6">
          Enter a job description and we&apos;ll generate tailored interview questions.
        </p>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-5" noValidate>
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
              Job Title
            </label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Backend Engineer"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-[#3ecf8e] focus:outline-none focus:ring-1 focus:ring-[#3ecf8e]"
            />
          </div>

          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-300 mb-1">
              Company
            </label>
            <input
              id="company"
              type="text"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-[#3ecf8e] focus:outline-none focus:ring-1 focus:ring-[#3ecf8e]"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
              Job Description
            </label>
            <textarea
              id="description"
              required
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paste the job description here..."
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-[#3ecf8e] focus:outline-none focus:ring-1 focus:ring-[#3ecf8e] resize-none"
            />
          </div>

          <div>
            <label htmlFor="jobLevel" className="block text-sm font-medium text-gray-300 mb-1">
              Job Level
            </label>
            <select
              id="jobLevel"
              value={jobLevel}
              onChange={(e) => setJobLevel(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-[#3ecf8e] focus:outline-none focus:ring-1 focus:ring-[#3ecf8e]"
            >
              <option value="associate" className="bg-gray-900">
                Associate
              </option>
              <option value="junior" className="bg-gray-900">
                Junior
              </option>
              <option value="mid" className="bg-gray-900">
                Mid-Level
              </option>
              <option value="senior" className="bg-gray-900">
                Senior
              </option>
              <option value="lead" className="bg-gray-900">
                Lead
              </option>
            </select>
          </div>

          <div>
            <label htmlFor="numQuestions" className="block text-sm font-medium text-gray-300 mb-1">
              Number of Questions
            </label>
            <input
              id="numQuestions"
              type="number"
              min={1}
              max={20}
              required
              value={numQuestions}
              onChange={(e) =>
                setNumQuestions(Math.max(1, Math.min(20, Number(e.target.value) || 1)))
              }
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-[#3ecf8e] focus:outline-none focus:ring-1 focus:ring-[#3ecf8e]"
            />
            <p className="mt-1 text-xs text-gray-500">
              We&apos;ll generate a larger pool ({numQuestions * 4} questions) and adaptively pick
              the best {numQuestions} during the interview.
            </p>
          </div>

          {/* Mass Interview Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-300">Mass Interview</p>
              <p className="text-xs text-gray-500">
                Allow multiple candidates to take this interview via a shareable link
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isMassInterview}
              onClick={() => setIsMassInterview(!isMassInterview)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                isMassInterview ? "bg-[#3ecf8e]" : "bg-white/20"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  isMassInterview ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 w-full">
            <button
              type="button"
              disabled={loading || !title || !company || !description}
              onClick={() => handleSubmit("hr")}
              className="flex-1 rounded-lg bg-[#3ecf8e] px-4 py-2.5 font-medium text-black transition hover:bg-[#33b87a] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? "Generating..." : "Create HR Screening Interview"}
            </button>
            <button
              type="button"
              disabled={loading || !title || !company || !description}
              onClick={() => handleSubmit("technical")}
              className="flex-1 rounded-lg bg-[#3ecf8e] px-4 py-2.5 font-medium text-black transition hover:bg-[#33b87a] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? "Generating..." : "Create Technical Interview"}
            </button>
          </div>

          {loading && (
            <p className="text-center text-xs text-gray-500 animate-pulse">
              This may take 10-15 seconds...
            </p>
          )}
        </form>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#0f0f0f] px-4 text-gray-500">or</span>
          </div>
        </div>

        {/* Coding Interview Button */}
        <button
          onClick={handleCodingInterview}
          className="w-full rounded-lg border border-[#3ecf8e] bg-transparent px-4 py-3 font-medium text-[#3ecf8e] transition hover:bg-[#3ecf8e]/10 inline-flex items-center justify-center gap-2"
        >
          <Code size={20} />
          Create Coding Interview
        </button>
        <p className="text-center text-xs text-gray-500 mt-2">
          Practice with LeetCode-style coding problems
        </p>
      </div>
    </div>
  );
}

export default function CreateInterviewPage() {
  return (
    <ErrorBoundary>
      <CreateInterviewForm />
    </ErrorBoundary>
  );
}
