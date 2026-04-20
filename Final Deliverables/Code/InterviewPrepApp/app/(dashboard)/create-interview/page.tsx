"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ErrorBoundary from "../../components/ErrorBoundary";
import { useSubscription } from "app/hooks/useSubscription";
import {
  Loader2,
  Monitor,
  Server,
  Layers,
  BarChart3,
  Cloud,
  Briefcase,
  X,
  Code2,
  Mic,
  Users as UsersIcon,
  ArrowLeft,
  Heart,
  MessageSquare,
  Shield,
  Handshake,
  Target,
  Lightbulb,
  UserCheck,
  Flame,
  ListChecks,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { cn } from "@/app/lib/cn";

// ─── Interview Type Selection ──────────────────────────────────────

type InterviewType = "technical" | "hr" | "coding";

interface TypeOption {
  type: InterviewType;
  icon: LucideIcon;
  title: string;
  description: string;
}

const TYPE_OPTIONS: TypeOption[] = [
  {
    type: "technical",
    icon: Monitor,
    title: "Technical Interview",
    description: "Data structures, algorithms, system design, and domain-specific questions",
  },
  {
    type: "hr",
    icon: UsersIcon,
    title: "HR Interview",
    description: "Behavioral questions, communication, cultural fit, and soft skills",
  },
  {
    type: "coding",
    icon: Code2,
    title: "Coding Interview",
    description: "LeetCode-style problems with a full code editor and test cases",
  },
];

// ─── Templates (Technical only) ───────────────────────────────────

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
      "We are looking for a Frontend Developer skilled in React, TypeScript, CSS, web performance optimization, and responsive design.",
  },
  {
    name: "Backend Developer",
    icon: Server,
    title: "Backend Developer",
    description:
      "We are seeking a Backend Developer with expertise in designing RESTful APIs, databases (SQL and NoSQL), server architecture, and security best practices.",
  },
  {
    name: "Full Stack Developer",
    icon: Layers,
    title: "Full Stack Developer",
    description:
      "We need a Full Stack Developer experienced in end-to-end web development, covering frontend frameworks, backend services, and database design.",
  },
  {
    name: "Data Scientist",
    icon: BarChart3,
    title: "Data Scientist",
    description:
      "We are hiring a Data Scientist proficient in machine learning, statistics, Python, data pipelines, and model evaluation.",
  },
  {
    name: "DevOps Engineer",
    icon: Cloud,
    title: "DevOps Engineer",
    description:
      "We are looking for a DevOps Engineer experienced with CI/CD pipelines, cloud infrastructure, containerization, and infrastructure as code.",
  },
  {
    name: "Product Manager",
    icon: Briefcase,
    title: "Product Manager",
    description:
      "We are seeking a Product Manager skilled in product strategy, roadmap planning, stakeholder management, and cross-functional collaboration.",
  },
];

// ─── HR Focus Areas ───────────────────────────────────────────────

interface FocusArea {
  id: string;
  label: string;
  icon: LucideIcon;
}

const HR_FOCUS_AREAS: FocusArea[] = [
  { id: "behavioral", label: "Behavioral", icon: MessageSquare },
  { id: "leadership", label: "Leadership", icon: Shield },
  { id: "communication", label: "Communication", icon: Mic },
  { id: "teamwork", label: "Teamwork", icon: Handshake },
  { id: "conflict", label: "Conflict Resolution", icon: Target },
  { id: "motivation", label: "Motivation & Drive", icon: Flame },
  { id: "cultural_fit", label: "Cultural Fit", icon: Heart },
  { id: "problem_solving", label: "Problem Solving", icon: Lightbulb },
  { id: "adaptability", label: "Adaptability", icon: UserCheck },
];

// ─── Shared Form Label ────────────────────────────────────────────

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground mb-1">
      {children}
    </label>
  );
}

// ─── Technical Interview Form ─────────────────────────────────────

function TechnicalInterviewForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const { isBusiness } = useSubscription();
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [jobLevel, setJobLevel] = useState("mid");
  const [isMassInterview, setIsMassInterview] = useState(false);
  const [useCustomQuestions, setUseCustomQuestions] = useState(false);
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

  const handleSubmit = async () => {
    if (useCustomQuestions) {
      sessionStorage.setItem(
        "customInterviewConfig",
        JSON.stringify({ title, company, jobLevel, interviewType: "technical", isMassInterview }),
      );
      router.push("/create-interview/custom-questions");
      return;
    }
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
          interviewType: "technical",
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to interview types
      </Button>

      {/* Templates */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-1">Templates</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Pick a template to pre-fill, or start from scratch below.
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
                className={cn(
                  "rounded-xl border p-4 text-left transition-all",
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40 hover:bg-primary/5",
                )}
              >
                <Icon
                  className={cn("h-5 w-5", isSelected ? "text-primary" : "text-muted-foreground")}
                />
                <p
                  className={cn(
                    "mt-2 text-sm font-medium",
                    isSelected ? "text-primary" : "text-foreground",
                  )}
                >
                  {template.name}
                </p>
              </button>
            );
          })}
        </div>
        {selectedTemplate && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Using: <span className="text-primary">{selectedTemplate}</span>
            </span>
            <button
              type="button"
              onClick={handleClearTemplate}
              className="rounded-full p-0.5 transition hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Form */}
      <Card className="p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Monitor className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Create Technical Interview</h1>
            <p className="text-sm text-muted-foreground">
              Generate tailored technical questions for the role
            </p>
          </div>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-5" noValidate>
          <div>
            <Label htmlFor="title">Job Title</Label>
            <Input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Backend Engineer"
            />
          </div>

          <div>
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              type="text"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Acme Corp"
            />
          </div>

          {!useCustomQuestions && (
            <div>
              <Label htmlFor="description">Job Description</Label>
              <textarea
                id="description"
                required
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Paste the job description here..."
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none transition-colors"
              />
            </div>
          )}

          <div className={cn("grid gap-4", useCustomQuestions ? "grid-cols-1" : "grid-cols-2")}>
            <div>
              <Label htmlFor="jobLevel">Job Level</Label>
              <Select value={jobLevel} onValueChange={setJobLevel}>
                <SelectTrigger id="jobLevel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="associate">Associate</SelectItem>
                  <SelectItem value="junior">Junior</SelectItem>
                  <SelectItem value="mid">Mid-Level</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!useCustomQuestions && (
              <div>
                <Label htmlFor="numQuestions">Questions</Label>
                <Input
                  id="numQuestions"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={numQuestions === 0 ? "" : numQuestions}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    setNumQuestions(v === "" ? 0 : Math.min(20, Number(v)));
                  }}
                  onBlur={() => {
                    if (numQuestions < 1) setNumQuestions(1);
                  }}
                  placeholder="1-20"
                />
              </div>
            )}
          </div>

          {isBusiness && (
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Mass Interview</p>
                  <p className="text-xs text-muted-foreground">
                    Share a link for multiple candidates
                  </p>
                </div>
                <Switch
                  checked={isMassInterview}
                  onCheckedChange={(v) => {
                    setIsMassInterview(v);
                    if (!v) setUseCustomQuestions(false);
                  }}
                />
              </div>

              {isMassInterview && (
                <button
                  type="button"
                  onClick={() => setUseCustomQuestions((v) => !v)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all",
                    useCustomQuestions
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/40 hover:bg-primary/5",
                  )}
                >
                  <ListChecks
                    className={cn(
                      "h-4 w-4 shrink-0",
                      useCustomQuestions ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <div>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        useCustomQuestions ? "text-primary" : "text-foreground",
                      )}
                    >
                      Use Custom Questions
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Write your own questions with sample answers and scoring rubrics
                    </p>
                  </div>
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          <Button
            type="button"
            disabled={loading || !title || !company || (!useCustomQuestions && !description)}
            onClick={handleSubmit}
            size="lg"
            className="w-full gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Questions...
              </>
            ) : useCustomQuestions ? (
              <>
                <ListChecks className="h-4 w-4" />
                Continue to Custom Questions
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                Create Technical Interview
              </>
            )}
          </Button>
          {loading && (
            <p className="text-center text-xs text-muted-foreground animate-pulse">
              This may take 10-15 seconds...
            </p>
          )}
        </form>
      </Card>
    </div>
  );
}

// ─── HR Interview Form ────────────────────────────────────────────

function HRInterviewForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const { isBusiness } = useSubscription();
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [focusAreas, setFocusAreas] = useState<Set<string>>(
    new Set(["behavioral", "communication"]),
  );
  const [numQuestions, setNumQuestions] = useState(5);
  const [jobLevel, setJobLevel] = useState("mid");
  const [isMassInterview, setIsMassInterview] = useState(false);
  const [useCustomQuestions, setUseCustomQuestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleFocus = (id: string) => {
    setFocusAreas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (useCustomQuestions) {
      sessionStorage.setItem(
        "customInterviewConfig",
        JSON.stringify({
          title: role || "HR Interview",
          company: company || "Company",
          jobLevel,
          interviewType: "hr",
          isMassInterview,
        }),
      );
      router.push("/create-interview/custom-questions");
      return;
    }
    if (focusAreas.size === 0) {
      setError("Select at least one focus area");
      return;
    }
    setError("");
    setLoading(true);

    const selectedLabels = HR_FOCUS_AREAS.filter((f) => focusAreas.has(f.id)).map((f) => f.label);
    const description = `HR screening interview for ${role || "the role"} at ${company || "the company"}. Focus areas: ${selectedLabels.join(", ")}. Assess the candidate's soft skills, personality, and fit for the team.`;

    try {
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: role || "HR Interview",
          company: company || "Company",
          description,
          numQuestions,
          jobLevel,
          isMassInterview,
          interviewType: "hr",
          focusAreas: Array.from(focusAreas),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create interview");
      }
      toast.success("HR Interview created");
      router.push("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to interview types
      </Button>

      <Card className="p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <UsersIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Create HR Interview</h1>
            <p className="text-sm text-muted-foreground">
              Assess communication, behavior, and cultural fit
            </p>
          </div>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-5" noValidate>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hr-role">Role</Label>
              <Input
                id="hr-role"
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Software Engineer"
              />
            </div>
            <div>
              <Label htmlFor="hr-company">Company</Label>
              <Input
                id="hr-company"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Acme Corp"
              />
            </div>
          </div>

          {/* Focus Areas */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Focus Areas</label>
            <p className="text-xs text-muted-foreground mb-3">
              Select the areas you want the interview to cover
            </p>
            <div className="grid grid-cols-3 gap-2">
              {HR_FOCUS_AREAS.map((area) => {
                const Icon = area.icon;
                const isSelected = focusAreas.has(area.id);
                return (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => toggleFocus(area.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-all",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-border/80 hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{area.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={cn("grid gap-4", useCustomQuestions ? "grid-cols-1" : "grid-cols-2")}>
            <div>
              <Label htmlFor="hr-level">Job Level</Label>
              <Select value={jobLevel} onValueChange={setJobLevel}>
                <SelectTrigger id="hr-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="associate">Associate</SelectItem>
                  <SelectItem value="junior">Junior</SelectItem>
                  <SelectItem value="mid">Mid-Level</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!useCustomQuestions && (
              <div>
                <Label htmlFor="hr-questions">Questions</Label>
                <Input
                  id="hr-questions"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={numQuestions === 0 ? "" : numQuestions}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    setNumQuestions(v === "" ? 0 : Math.min(20, Number(v)));
                  }}
                  onBlur={() => {
                    if (numQuestions < 1) setNumQuestions(1);
                  }}
                  placeholder="1-20"
                />
              </div>
            )}
          </div>

          {isBusiness && (
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Mass Interview</p>
                  <p className="text-xs text-muted-foreground">
                    Share a link for multiple candidates
                  </p>
                </div>
                <Switch
                  checked={isMassInterview}
                  onCheckedChange={(v) => {
                    setIsMassInterview(v);
                    if (!v) setUseCustomQuestions(false);
                  }}
                />
              </div>

              {isMassInterview && (
                <button
                  type="button"
                  onClick={() => setUseCustomQuestions((v) => !v)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all",
                    useCustomQuestions
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/40 hover:bg-primary/5",
                  )}
                >
                  <ListChecks
                    className={cn(
                      "h-4 w-4 shrink-0",
                      useCustomQuestions ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <div>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        useCustomQuestions ? "text-primary" : "text-foreground",
                      )}
                    >
                      Use Custom Questions
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Write your own questions with sample answers and scoring rubrics
                    </p>
                  </div>
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          <Button
            type="button"
            disabled={loading || (!useCustomQuestions && focusAreas.size === 0)}
            onClick={handleSubmit}
            size="lg"
            className="w-full gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Questions...
              </>
            ) : useCustomQuestions ? (
              <>
                <ListChecks className="h-4 w-4" />
                Continue to Custom Questions
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                Create HR Interview
              </>
            )}
          </Button>
          {loading && (
            <p className="text-center text-xs text-muted-foreground animate-pulse">
              This may take 10-15 seconds...
            </p>
          )}
        </form>
      </Card>
    </div>
  );
}

// ─── Coding Interview Form ────────────────────────────────────────

function CodingInterviewForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const { isBusiness } = useSubscription();
  const [codingTitle, setCodingTitle] = useState("Coding Practice");
  const [codingDifficulty, setCodingDifficulty] = useState<"easy" | "medium" | "hard" | "mixed">(
    "mixed",
  );
  const [codingNumProblems, setCodingNumProblems] = useState(5);
  const [codingTimeLimit, setCodingTimeLimit] = useState<number | null>(60);
  const [isMassInterview, setIsMassInterview] = useState(false);
  const [usePickQuestions, setUsePickQuestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (usePickQuestions) {
      sessionStorage.setItem(
        "codingMassConfig",
        JSON.stringify({
          title: codingTitle,
          timeLimit: codingTimeLimit,
          isMassInterview,
        }),
      );
      router.push("/create-interview/pick-questions");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/coding-interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: codingTitle,
          difficulty: codingDifficulty,
          numProblems: codingNumProblems,
          timeLimit: codingTimeLimit,
          isMassInterview,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create coding interview");
      }
      toast.success("Coding interview created");
      router.push("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to interview types
      </Button>

      <Card className="p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Code2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Create Coding Interview</h1>
            <p className="text-sm text-muted-foreground">
              Practice LeetCode-style problems with a full code editor
            </p>
          </div>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-5" noValidate>
          <div>
            <Label htmlFor="codingTitle">Session Title</Label>
            <Input
              id="codingTitle"
              type="text"
              value={codingTitle}
              onChange={(e) => setCodingTitle(e.target.value)}
              placeholder="e.g. Frontend Coding Practice"
            />
          </div>

          {!usePickQuestions && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="codingDifficulty">Difficulty</Label>
                <Select
                  value={codingDifficulty}
                  onValueChange={(v) =>
                    setCodingDifficulty(v as "easy" | "medium" | "hard" | "mixed")
                  }
                >
                  <SelectTrigger id="codingDifficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="codingNumProblems">Problems</Label>
                <Select
                  value={String(codingNumProblems)}
                  onValueChange={(v) => setCodingNumProblems(parseInt(v))}
                >
                  <SelectTrigger id="codingNumProblems">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 problems</SelectItem>
                    <SelectItem value="5">5 problems</SelectItem>
                    <SelectItem value="10">10 problems</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="codingTimeLimit">Time Limit</Label>
            <Select
              value={codingTimeLimit === null ? "none" : String(codingTimeLimit)}
              onValueChange={(v) => setCodingTimeLimit(v === "none" ? null : parseInt(v))}
            >
              <SelectTrigger id="codingTimeLimit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
                <SelectItem value="90">90 minutes</SelectItem>
                <SelectItem value="none">No limit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isBusiness && (
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Mass Interview</p>
                  <p className="text-xs text-muted-foreground">
                    Share a link for multiple candidates
                  </p>
                </div>
                <Switch
                  checked={isMassInterview}
                  onCheckedChange={(v) => {
                    setIsMassInterview(v);
                    if (!v) setUsePickQuestions(false);
                  }}
                />
              </div>

              {isMassInterview && (
                <button
                  type="button"
                  onClick={() => setUsePickQuestions((v) => !v)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all",
                    usePickQuestions
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/40 hover:bg-primary/5",
                  )}
                >
                  <ListChecks
                    className={cn(
                      "h-4 w-4 shrink-0",
                      usePickQuestions ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <div>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        usePickQuestions ? "text-primary" : "text-foreground",
                      )}
                    >
                      Pick Questions Manually
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Choose specific problems from our library
                    </p>
                  </div>
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !codingTitle}
            size="lg"
            className="w-full gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : usePickQuestions ? (
              <>
                <ListChecks className="h-4 w-4" />
                Continue to Pick Questions
              </>
            ) : (
              <>
                <Code2 className="h-4 w-4" />
                Create Coding Interview
              </>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────

function CreateInterviewPage() {
  const [selectedType, setSelectedType] = useState<InterviewType | null>(null);

  if (selectedType === "technical") {
    return <TechnicalInterviewForm onBack={() => setSelectedType(null)} />;
  }
  if (selectedType === "hr") {
    return <HRInterviewForm onBack={() => setSelectedType(null)} />;
  }
  if (selectedType === "coding") {
    return <CodingInterviewForm onBack={() => setSelectedType(null)} />;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-foreground">Create Interview</h1>
        <p className="mt-2 text-muted-foreground">
          Choose the type of interview you want to practice or create
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {TYPE_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.type}
              onClick={() => setSelectedType(option.type)}
              className="group rounded-2xl border border-border bg-card p-6 text-left transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted transition group-hover:bg-primary/10">
                <Icon className="h-6 w-6 text-muted-foreground transition group-hover:text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{option.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{option.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CreateInterviewPageWrapper() {
  return (
    <ErrorBoundary>
      <CreateInterviewPage />
    </ErrorBoundary>
  );
}
