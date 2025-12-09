import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";

type LocationState = {
  id?: string;
  jobTitle?: string;
  company?: string;
  description?: string;
};

type QuestionItem = {
  question_id: number;
  question_title: string;
  question_text: string;
};

function buildWidgetContext(qs: QuestionItem[]) {
  const questionTexts = qs.map((q) => ({
    id: q.question_id,
    title: q.question_title,
    text: q.question_text,
  }));

  const questionsList = questionTexts
    .map((q, index) => `${index + 1}. ${q.title} (ID: ${q.id}): ${q.text}`)
    .join("\n");

  const fullSystemPrompt = `
        You are an automated interview agent used only to run recorded mock technical interviews. Follow these rules exactly.

        1) Greeting & permission — Always ask for permission to start,
        e.g. “Thank you for joining. May I begin the interview now?” Wait for an explicit affirmative
        (“yes”, “please start”, “go ahead”, “sure”). If the candidate’s first reply is not explicit, ask once more. Proceed only after explicit permission.

        2) Authority of questions — You MUST ONLY ask the following questions in order. Do not invent, add, expand, ask about the
        job title, company, available roles, or anything outside these questions:

        ${questionsList}

        3) Asking & waiting — For each question: ask it exactly and concisely, then wait for the candidate’s spoken answer before moving on.

        4) Clarification — If the candidate’s answer is very short, unclear, or incomplete, ask at most one short clarifying follow-up.
        If that follow-up still yields an inadequate answer, accept it and move to the next question.

        5) Skipping — If the candidate says “skip” or “pass”, acknowledge briefly (“Okay, skipping that question.”) and move on.
        Allow returning to a skipped question only if the candidate explicitly asks to return after the remaining questions are completed.

        6) Persistence — After receiving the full answer to each question (including any clarification or skip, and handling any interruptions by
        combining partial utterances into a complete response), call the 'save_question_transcript' tool with parameters: question_id (the ID from the list)
        and transcript (the candidate's full spoken answer as a single string).

        7) Ending the interview — After receiving and acknowledging the answer to the last question (including any clarification),
        immediately say exactly: “Interview complete. Thank you for your time.” Do not ask additional questions or continue the conversation.
        End the session.

        IMPORTANT: Do not prompt for job info, role summary, or anything else outside the provided questions.
        `;
  return { fullSystemPrompt };
}

export default function InterviewSummary(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const state = (location.state as LocationState) || {};

  const interviewIdFromState = state.id ?? null;
  const jobTitle = state.jobTitle ?? "Unknown";
  const company = state.company ?? "Unknown";
  const description = state.description ?? "";

  const [interviewId, setInterviewId] = useState<string | null>(
    interviewIdFromState
  );
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [scoreLoading, setScoreLoading] = useState(false);

  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const widgetRef = useRef<HTMLElement | null>(null);
  const API = import.meta.env.VITE_API_URL || "";

  async function getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (isLoaded && isSignedIn && getToken) {
      try {
        const token = await getToken({ template: "interview-backend" });
        if (token) headers["Authorization"] = `Bearer ${token}`;
      } catch (err) {
        console.warn("getToken failed", err);
      }
    }
    return headers;
  }

  async function ensureInterviewExists() {
    if (interviewId) return interviewId;
    setCreating(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API}/api/interviews/save-parameters`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          jobTitle,
          company,
          jobDescription: description,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(body?.message || `Server returned ${res.status}`);
      const id = body?.interviewId || body?.id || body?.interview?._id;
      if (!id) throw new Error("Server did not return interview id");
      setInterviewId(String(id));
      return String(id);
    } catch (err: any) {
      setError(err.message || "Failed to create interview");
      throw err;
    } finally {
      setCreating(false);
    }
  }

  async function fetchSelectedQuestions(id: string) {
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API}/api/interviews/${id}/questions`, {
        headers,
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message || "Failed to load");
      if (!Array.isArray(body.questions))
        throw new Error("Invalid questions format");
      return body.questions as QuestionItem[];
    } catch (err: any) {
      setError(err.message || "Failed to load questions");
      throw err;
    } finally {
      setLoading(false);
    }
  }

  function removeMountedWidgetElement() {
    const container = document.getElementById("widget-container");
    if (!container) return;
    Array.from(container.childNodes).forEach((n) => n.remove());
    widgetRef.current = null;
    setWidgetLoaded(false);
  }

  function unloadWidget() {
    removeMountedWidgetElement();
    scriptRef.current?.remove();
    scriptRef.current = null;
  }

  function mountWidgetElement(fullSystemPrompt: string) {
    const ELEMENT_NAME = "elevenlabs-convai";
    const container = document.getElementById("widget-container");
    if (!container || !customElements?.get(ELEMENT_NAME)) return false;
    removeMountedWidgetElement();
    const AGENT_ID = import.meta.env.VITE_ELEVEN_AGENT_ID;
    const el = document.createElement(ELEMENT_NAME);
    el.setAttribute("agent-id", AGENT_ID);
    el.setAttribute("override-prompt", fullSystemPrompt);
    el.style.display = "block";
    el.style.minHeight = "240px";
    if (interviewId)
      el.setAttribute("dynamic-variables", JSON.stringify({ interviewId }));
    container.appendChild(el);
    widgetRef.current = el;
    return true;
  }

  async function loadAndMountWidget(fullSystemPrompt: string) {
    removeMountedWidgetElement();
    const SCRIPT_SRC = "https://unpkg.com/@elevenlabs/convai-widget-embed";
    const ELEMENT_NAME = "elevenlabs-convai";

    const waitForElement = async () => {
      const maxWait = 5000;
      const interval = 150;
      const start = Date.now();
      while (Date.now() - start < maxWait) {
        if (customElements?.get(ELEMENT_NAME)) return true;
        await new Promise((r) => setTimeout(r, interval));
      }
      return false;
    };

    if (customElements?.get(ELEMENT_NAME)) {
      if (mountWidgetElement(fullSystemPrompt)) return;
    }

    const existing = [...document.scripts].find((s) => s.src === SCRIPT_SRC);
    if (!existing) {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      scriptRef.current = script;
      document.body.appendChild(script);
      try {
        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () =>
            reject(new Error(`Failed loading: ${SCRIPT_SRC}`));
          setTimeout(
            () => reject(new Error("Timeout loading widget script")),
            6000
          );
        });
      } catch {
        script.remove();
        scriptRef.current = null;
        return;
      }
    }

    if (await waitForElement()) {
      mountWidgetElement(fullSystemPrompt);
    }
  }

  const startInterview = async () => {
    setError(null);
    try {
      const id = await ensureInterviewExists();
      const qs = await fetchSelectedQuestions(id);
      if (!qs || qs.length === 0) {
        setError("No questions selected.");
        return;
      }
      const { fullSystemPrompt } = buildWidgetContext(qs);
      await loadAndMountWidget(fullSystemPrompt);
      setWidgetLoaded(true);
    } catch (err) {
      console.error("startInterview failed", err);
    }
  };

  useEffect(() => {
    return () => unloadWidget();
  }, []);

  async function fetchOverallScoreOnce(interviewId: string) {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${API}/api/webhooks/transcripts/${interviewId}`,
        {
          method: "GET",
          headers,
        }
      );
      const body = await res.json().catch(() => null);
      return body?.transcript?.overallScore ?? null;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    if (!interviewId) return;
    setScoreLoading(true);
    const interval = setInterval(async () => {
      const score = await fetchOverallScoreOnce(interviewId);
      if (score !== null) {
        setOverallScore(score);
        setScoreLoading(false);
        clearInterval(interval);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [interviewId]);

  let startInterviewLabel = creating
    ? "Creating..."
    : loading
    ? "Loading..."
    : widgetLoaded
    ? "Widget loaded"
    : "Start interview";

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#0c0c0c] px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-white">Interview Summary</h1>

        <div className="mt-6 text-white">
          <p className="text-lg">Job Title: {jobTitle}</p>
          <p className="text-lg">Company: {company}</p>
          {description && (
            <p className="mt-2 text-sm text-gray-300">{description}</p>
          )}
        </div>

        <div className="mt-6">
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-300">Interview ID:</div>
            <div className="text-sm text-emerald-300">
              {interviewId ?? "Not created yet"}
            </div>
          </div>

          <div className="mt-4 space-x-2">
            <button
              className="rounded-md bg-[#3ecf8e] px-4 py-2 text-sm font-semibold text-black hover:bg-[#36be81]"
              onClick={startInterview}
              disabled={creating || loading || widgetLoaded}
            >
              {startInterviewLabel}
            </button>
            <button
              className="rounded-md border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
              onClick={() => navigate(-1)}
            >
              Edit parameters
            </button>
            {widgetLoaded && (
              <button
                className="rounded-md border border-white/10 px-3 py-2 text-sm text-gray-300 hover:bg-white/5"
                onClick={startInterview}
              >
                Reload widget
              </button>
            )}
          </div>

          <div className="mt-4 p-3 bg-gray-800 rounded-md text-white">
            <div className="text-sm font-semibold">Overall Score</div>
            {scoreLoading ? (
              <div className="text-gray-400 text-sm">Waiting for score…</div>
            ) : (
              <div className="text-lg font-bold">{overallScore}</div>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-md bg-red-800/60 p-3 text-red-100">
              {error}
            </div>
          )}

          <div id="widget-container" className="mt-8 min-h-[200px]" />
        </div>
      </div>
    </main>
  );
}
