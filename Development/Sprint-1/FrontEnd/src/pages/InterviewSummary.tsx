import React, { useEffect, useRef, useState } from "react";
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

export default function InterviewSummary(): JSX.Element {
    const location = useLocation();
    const navigate = useNavigate();
    const { getToken, isLoaded, isSignedIn } = useAuth();

    const state = (location.state as LocationState) || {};
    const [interviewId, setInterviewId] = useState<string | null>(state.id ?? null);
    const [jobTitle, setJobTitle] = useState<string>(state.jobTitle ?? "Unknown");
    const [company, setCompany] = useState<string>(state.company ?? "Unknown");
    const [description, setDescription] = useState<string>(state.description ?? "");

    const [questions, setQuestions] = useState<QuestionItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [widgetLoaded, setWidgetLoaded] = useState(false);
    const [interviewStarted, setInterviewStarted] = useState(false);

    const [scriptStatus, setScriptStatus] = useState<'idle'|'found'|'loading'|'loaded'|'error'|'ready'|'timeout'>('idle');
    const [scriptError, setScriptError] = useState<string | null>(null);


    // If we appended the script, scriptRef.current points to it.
    // If the script already existed in DOM before this component loaded, we won't set scriptRef.
    const scriptRef = useRef<HTMLScriptElement | null>(null);
    const widgetRef = useRef<HTMLElement | null>(null);

    const API = import.meta.env.VITE_API_URL || "";

    async function getAuthHeaders() {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (isLoaded && isSignedIn && getToken) {
        try {
            const token = await getToken();
            if (token) headers["Authorization"] = `Bearer ${token}`;
        } catch (err) {
            console.warn("getToken failed", err);
        }
        }
        return headers;
    }

  // Ensure interview exists (create via save-parameters if no id present)
    async function ensureInterviewExists() {
        if (interviewId) return interviewId;
        setCreating(true);
        setError(null);
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API}/api/interviews/save-parameters`, {
                method: "POST",
                headers,
                body: JSON.stringify({ jobTitle, company, jobDescription: description }),
            });
            const text = await res.text();
            let body: any = null;
            try {
                body = text ? JSON.parse(text) : null;
            } catch {
                body = { message: text };
            }
            if (!res.ok) {
                const msg = body?.message || `Server returned ${res.status}`;
                throw new Error(msg);
            }
            const id = body?.id ?? body?.interview?._id ?? body?.interview?.id;
            if (!id) throw new Error("Server did not return interview id");
            setInterviewId(String(id));
            return String(id);
        } catch (err: any) {
            console.error("ensureInterviewExists error", err);
            setError(err?.message || "Failed to create interview");
        throw err;
        } finally {
            setCreating(false);
        }
    }

  // Fetch selected questions for an interview id
    async function fetchSelectedQuestions(id: string) {
        setLoading(true);
        setError(null);
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API}/api/interviews/${id}/questions`, { method: "GET", headers });
            const body = await res.json().catch(() => null);
        if (!res.ok) {
            throw new Error(body?.message || `Failed to fetch questions (${res.status})`);
        }
        if (!body || !Array.isArray(body.questions)) {
            throw new Error("Invalid response for questions");
        }
        setQuestions(body.questions);
            return body.questions;
        } catch (err: any) {
            console.error("fetchSelectedQuestions error", err);
            setError(err?.message || "Failed to load questions");
            throw err;
        } finally {
            setLoading(false);
        }
    }

    function buildWidgetContext(qs: QuestionItem[]) {
        // Build the system/runtime instruction (concise but strict)
        const questionTexts = (qs || []).map((q) => ({
            id: q.question_id ?? (q as any).id ?? null,
            title: q.question_title ?? (q as any).title ?? '',
            text: q.question_text ?? (q as any).text ?? (q as any).question ?? '',
        })).filter(q => q.id != null); // drop any malformed entries

        const questionsList = questionTexts.map((q, index) => 
            `${index + 1}. ${q.title} (ID: ${q.id}): ${q.text}`
        ).join('\n');

        const fullSystemPrompt = `
            You are an automated interview agent used only to run recorded mock technical interviews. Follow these rules exactly.
            
            1) Greeting & permission — Always begin with one concise greeting and ask for permission to start, 
            e.g. “Hello — thank you for joining. May I begin the interview now?” Wait for an explicit affirmative 
            (“yes”, “please start”, “go ahead”, “sure”). If the candidate’s first reply is not explicit, ask once more. Proceed only after explicit permission.
            
            2) Authority of questions — You MUST ONLY ask the following questions in order. Do not invent, add, expand, ask about the 
            job title, company, available roles, or anything outside these questions:
            
            ${questionsList}
            
            3) Asking & waiting — For each question: ask it exactly and concisely, then wait for the candidate’s spoken answer before moving on.

            4) Clarification — If the candidate’s answer is very short, unclear, or incomplete, ask at most one short clarifying follow-up. 
            If that follow-up still yields an inadequate answer, accept it and move to the next question.

            5) Skipping — If the candidate says “skip” or “pass”, acknowledge briefly (“Okay, skipping that question.”) and move on. 
            Allow returning to a skipped question only if the candidate explicitly asks to return after the remaining questions are completed.

            6) End command — If the candidate says “end interview”, “stop interview”, or “finish”, immediately stop the interview flow 
            and say exactly: “Interview complete. Thank you for your time.” Do not ask additional questions.

            7) Webhook / persistence — If webhook/event hooks are configured for the embed, emit an event at the end of each question 
            turn with the candidate’s transcript and the question id. Also emit a final “interview.finished” event when done. 
            (This is informational. The embed platform will send webhooks — ensure your server endpoint accepts them.)

            IMPORTANT: Do not prompt for job info, role summary, or anything else outside the provided questions.
        `;

        console.log('Building widget with embedded prompt:', { fullSystemPrompt, questionsList });
        // const stopPhrases = ['end interview', 'stop interview', 'finish', 'end'];

        // The widget expects a `context` object — include your instructions and the question list there.
        // We set both a `system` key and an explicit `runtimeInstructions` key to be defensive.
        return { fullSystemPrompt};
    }

    function removeMountedWidgetElement() {
        try {
            const container = document.getElementById("widget-container");
            if (!container) return;
            while (container.firstChild) container.removeChild(container.firstChild);
            widgetRef.current = null;
            setWidgetLoaded(false);
        } catch (err) {
            console.warn("removeMountedWidgetElement error", err);
        }
    }

    function unloadWidget() {
        try {
            removeMountedWidgetElement();
            // Remove script only if we appended it (scriptRef)
            if (scriptRef.current && scriptRef.current.parentNode) {
                scriptRef.current.parentNode.removeChild(scriptRef.current);
                scriptRef.current = null;
            }
            setScriptStatus('idle');
            setScriptError(null);
        } catch (err) {
            console.warn("unloadWidget error", err);
        }
    }

    // async function loadAndMountWidget(contextObj: object, questionsArray: QuestionItem[]) {
    //     removeMountedWidgetElement();
    //     setWidgetLoaded(false);
    //     setScriptError(null);
    //     setScriptStatus('idle');

    //     const ELEMENT_NAME = "elevenlabs-convai";
    //     // candidate script URLs — keep the one you used, and a common alternate
    //     const CANDIDATE_SRCS = [
    //         "https://unpkg.com/@elevenlabs/convai-widget-embed",
    //         "https://cdn.elevenlabs.io/convai-widget-embed.js",
    //         "https://cdn.jsdelivr.net/npm/@elevenlabs/convai-widget-embed"
    //     ];

    //     // poll helper: wait until customElements has the element or until timeout
    //     const waitForElementRegistered = async (elementName: string, maxWaitMs = 5000, interval = 150) => {
    //     const start = Date.now();
    //     while (Date.now() - start < maxWaitMs) {
    //         if (customElements && customElements.get(elementName)) {
    //         return true;
    //         }
    //         await new Promise((r) => setTimeout(r, interval));
    //     }
    //     return false;
    //     };

    //     const createWidget = () => {
    //         try {
    //             // if custom element still not registered, abort
    //             if (!customElements.get(ELEMENT_NAME)) {
    //             console.warn("custom element not yet registered:", ELEMENT_NAME);
    //             return false;
    //             }
    //             console.log("Creating widget element: ", customElements.get(ELEMENT_NAME));
    //             removeMountedWidgetElement();
    //             const container = document.getElementById("widget-container");
    //             if (!container) throw new Error("widget container missing");

    //             const widgetEl = document.createElement(ELEMENT_NAME) as HTMLElement;

    //             // IMPORTANT: set your agent id here (required for the widget to fetch agent config and render)
    //             const AGENT_ID = import.meta.env.VITE_ELEVEN_AGENT_ID; // <- replace with your actual agent id
    //             widgetEl.setAttribute("agent-id", AGENT_ID);
    //             try { (widgetEl as any)["agent-id"] = AGENT_ID; } catch {}

    //             // set attributes & properties (both) — increase compatibility
    //             // widgetEl.setAttribute("context", JSON.stringify(contextObj));
    //             // try { widgetEl.setAttribute("questions", JSON.stringify(questionsArray || [])); } catch {}
    //             // try { widgetEl.setAttribute("job", JSON.stringify((contextObj as any).job || {})); } catch {}

    //             // try { (widgetEl as any).context = contextObj; } catch {}
    //             // try { (widgetEl as any).questions = questionsArray; } catch {}
    //             // try { (widgetEl as any).job = (contextObj as any).job || {}; } catch {}
    //             // after creating widgetEl
    //             const payload = contextObj as any;

    //             // Set attributes and properties — include multiple keys to maximize compatibility
    //             try { widgetEl.setAttribute("context", JSON.stringify(payload)); } catch {}
    //             try { widgetEl.setAttribute("data-context", JSON.stringify(payload)); } catch {}
    //             try { (widgetEl as any).context = payload; } catch {}
    //             try { (widgetEl as any)['data-context'] = payload; } catch {}

    //             // Also set questions/job redundantly (some widgets read these directly)
    //             try { widgetEl.setAttribute("questions", JSON.stringify(payload.questions || [])); } catch {}
    //             try { (widgetEl as any).questions = payload.questions || []; } catch {}
    //             try { widgetEl.setAttribute("job", JSON.stringify(payload.job || {})); } catch {}
    //             try { (widgetEl as any).job = payload.job || {}; } catch {}

    //             // ensure widget is visible even if stylesheet is slow to load
    //             try {
    //                 widgetEl.style.display = "block";
    //                 widgetEl.style.minHeight = "240px";
    //                 widgetEl.style.width = "100%";
    //             } catch {}

    //             if (interviewId) {
    //             try {
    //                 widgetEl.setAttribute("metadata", JSON.stringify({ interviewId }));
    //                 (widgetEl as any).metadata = { interviewId };
    //             } catch {}
    //             }

    //             // optional: dispatch an event the widget may listen to
    //             try {
    //             const ev = new CustomEvent("context-updated", { detail: { context: contextObj, questions: questionsArray } });
    //             widgetEl.dispatchEvent(ev);
    //             } catch {}

    //             container.appendChild(widgetEl);
    //             widgetRef.current = widgetEl;
    //             setWidgetLoaded(true);

    //             // small debug log
    //             setTimeout(() => {
    //             try {
    //                 console.log("Widget mounted. element attributes/properties:", {
    //                 agentIdAttr: widgetEl.getAttribute("agent-id"),
    //                 contextAttr: widgetEl.getAttribute("context"),
    //                 questionsAttr: widgetEl.getAttribute("questions"),
    //                 jobAttr: widgetEl.getAttribute("job"),
    //                 propContext: (widgetEl as any).context,
    //                 propQuestions: (widgetEl as any).questions,
    //                 propJob: (widgetEl as any).job,
    //                 });
    //             } catch (e) {
    //                 console.warn("post-mount inspect failed", e);
    //             }
    //             }, 600);
    //             return true;
    //         } catch (err) {
    //             console.error("createWidget error", err);
    //             setScriptError(String(err));
    //             return false;
    //         }
    //     };

    //     try {
    //     // If element already registered, try create immediately
    //     if (customElements && customElements.get(ELEMENT_NAME)) {
    //         setScriptStatus('ready');
    //         const created = createWidget();
    //         if (created) return;
    //         // else continue to attempt script injection fallback
    //     }

    //     // Check if any existing script with known snippet is present (don't inject duplicate)
    //     const existingScript = Array.from(document.getElementsByTagName("script")).find((s) =>
    //         s.src && CANDIDATE_SRCS.some(srcCandidate => s.src.includes(srcCandidate.replace(/^https?:\/\//, '')))
    //     );

    //     if (existingScript) {
    //         setScriptStatus('found');
    //         console.log("Found existing widget script:", existingScript.src);
    //         // wait briefly for element registration
    //         const registered = await waitForElementRegistered(ELEMENT_NAME, 4000, 150);
    //         if (registered) {
    //         setScriptStatus('ready');
    //         const ok = createWidget();
    //         if (ok) return;
    //         } else {
    //         console.warn("Existing script found but element not registered after wait");
    //         }
    //     }

    //     // Try candidate URLs in order. Stop at first successful load where element registers.
    //     let loadedOk = false;
    //     for (const src of CANDIDATE_SRCS) {
    //         // check if a script with same src already present exactly
    //         const sameScript = Array.from(document.getElementsByTagName("script")).find((s) => s.src === src);
    //         if (sameScript) {
    //         scriptRef.current = sameScript as HTMLScriptElement;
    //         setScriptStatus('found');
    //         } else {
    //         // inject script
    //         setScriptStatus('loading');
    //         const script = document.createElement("script");
    //         script.src = src;
    //         script.async = true;
    //         script.type = "text/javascript";
    //         scriptRef.current = script;
    //         const loadPromise = new Promise<void>((resolve, reject) => {
    //             script.addEventListener("load", () => resolve(), { once: true });
    //             script.addEventListener("error", (e) => reject(new Error(`Script load error for ${src}`)), { once: true });
    //             // safety timeout for this script load
    //             setTimeout(() => {
    //             // If the script didn't fire load in 6s, treat as timeout for this src (but try next)
    //             reject(new Error(`Timeout loading script ${src}`));
    //             }, 6000);
    //         });
    //         document.body.appendChild(script);
    //         try {
    //             await loadPromise;
    //             setScriptStatus('loaded');
    //         } catch (err: any) {
    //             // remove script element on failure
    //             console.warn("Script load failed for", src, err);
    //             script.remove();
    //             scriptRef.current = null;
    //             setScriptError(String(err?.message || err));
    //             setScriptStatus('error');
    //             // try next candidate
    //             continue;
    //         }
    //         }

    //         // After injection (or found existing), wait for the custom element to register
    //         const registered = await waitForElementRegistered(ELEMENT_NAME, 5000, 150);
    //         if (registered) {
    //         setScriptStatus('ready');
    //         const ok = createWidget();
    //         if (ok) {
    //             loadedOk = true;
    //             break;
    //         } else {
    //             // If couldn't create despite registration, continue trying other sources (unlikely)
    //             console.warn("Element registered but createWidget returned false; trying next source if any.");
    //         }
    //         } else {
    //         // element didn't register even after script loaded — try next src
    //         setScriptStatus('timeout');
    //         setScriptError(`Element ${ELEMENT_NAME} not registered after script from ${scriptRef.current?.src ?? 'unknown'}`);
    //         // continue loop
    //         }
    //     }

    //     if (!loadedOk) {
    //         // give final message — helpful for debugging
    //         const msg = `Failed to load and mount widget. scriptStatus=${scriptStatus} error=${scriptError ?? 'none'}`;
    //         console.error(msg);
    //         setScriptError(scriptError ?? "Widget registration timeout or load failed");
    //         setScriptStatus('error');
    //     }
    //     } catch (err: any) {
    //     console.error("loadAndMountWidget top-level error", err);
    //     setScriptError(String(err?.message || err));
    //     setScriptStatus('error');
    //     }
        
    // }
    async function loadAndMountWidget(fullSystemPrompt: string, questionsArray: QuestionItem[]) {
    removeMountedWidgetElement();
    setWidgetLoaded(false);
    setScriptError(null);
    setScriptStatus('idle');

    const ELEMENT_NAME = "elevenlabs-convai";
    // Use the recommended src (simplify from candidates for stability)
    const SCRIPT_SRC = "https://unpkg.com/@elevenlabs/convai-widget-embed";

    // poll helper: wait until customElements has the element or until timeout
    const waitForElementRegistered = async (elementName: string, maxWaitMs = 5000, interval = 150) => {
        const start = Date.now();
        while (Date.now() - start < maxWaitMs) {
            if (customElements && customElements.get(elementName)) {
                return true;
            }
            await new Promise((r) => setTimeout(r, interval));
        }
        return false;
    };

    const createWidget = () => {
        try {
            // if custom element still not registered, abort
            if (!customElements.get(ELEMENT_NAME)) {
                console.warn("custom element not yet registered:", ELEMENT_NAME);
                return false;
            }
            console.log("Creating widget element: ", customElements.get(ELEMENT_NAME));
            removeMountedWidgetElement();
            const container = document.getElementById("widget-container");
            if (!container) throw new Error("widget container missing");

            const widgetEl = document.createElement(ELEMENT_NAME) as HTMLElement;

            // IMPORTANT: set your agent id here (required for the widget to fetch agent config and render)
            const AGENT_ID = import.meta.env.VITE_ELEVEN_AGENT_ID; // <- replace with your actual agent id
            widgetEl.setAttribute("agent-id", AGENT_ID);
            try { (widgetEl as any)["agent-id"] = AGENT_ID; } catch {}

            // Set system prompt override (required)
            widgetEl.setAttribute("override-prompt", fullSystemPrompt);

            // ensure widget is visible even if stylesheet is slow to load
            try {
                widgetEl.style.display = "block";
                widgetEl.style.minHeight = "240px";
                widgetEl.style.width = "100%";
            } catch {}

            if (interviewId) {
                try {
                    widgetEl.setAttribute("metadata", JSON.stringify({ interviewId }));
                    (widgetEl as any).metadata = { interviewId };
                } catch {}
            }

            container.appendChild(widgetEl);
            widgetRef.current = widgetEl;
            setWidgetLoaded(true);

            // small debug log (updated to log overrides)
            setTimeout(() => {
                try {
                    console.log("Widget mounted. element attributes/properties:", {
                        agentIdAttr: widgetEl.getAttribute("agent-id"),
                        overridePromptAttr: widgetEl.getAttribute("override-prompt"),
                    });
                } catch (e) {
                    console.warn("post-mount inspect failed", e);
                }
            }, 600);
            return true;
        } catch (err) {
            console.error("createWidget error", err);
            setScriptError(String(err));
            return false;
        }
    };

    try {
        // If element already registered, try create immediately
        if (customElements && customElements.get(ELEMENT_NAME)) {
            setScriptStatus('ready');
            const created = createWidget();
            if (created) return;
        }

        // Check if script already present
        const existingScript = Array.from(document.getElementsByTagName("script")).find((s) => s.src === SCRIPT_SRC);

        if (existingScript) {
            setScriptStatus('found');
            console.log("Found existing widget script:", existingScript.src);
            const registered = await waitForElementRegistered(ELEMENT_NAME, 4000, 150);
            if (registered) {
                setScriptStatus('ready');
                const ok = createWidget();
                if (ok) return;
            } else {
                console.warn("Existing script found but element not registered after wait");
            }
        }

        // Inject script if not found
        setScriptStatus('loading');
        const script = document.createElement("script");
        script.src = SCRIPT_SRC;
        script.async = true;
        script.type = "text/javascript";
        scriptRef.current = script;
        const loadPromise = new Promise<void>((resolve, reject) => {
            script.addEventListener("load", () => resolve(), { once: true });
            script.addEventListener("error", (e) => reject(new Error(`Script load error for ${SCRIPT_SRC}`)), { once: true });
            setTimeout(() => reject(new Error(`Timeout loading script ${SCRIPT_SRC}`)), 6000);
        });
        document.body.appendChild(script);
        try {
            await loadPromise;
            setScriptStatus('loaded');
        } catch (err: any) {
            console.warn("Script load failed for", SCRIPT_SRC, err);
            script.remove();
            scriptRef.current = null;
            setScriptError(String(err?.message || err));
            setScriptStatus('error');
            return; // No more candidates, so exit
        }

        // After load, wait for registration
        const registered = await waitForElementRegistered(ELEMENT_NAME, 5000, 150);
        if (registered) {
            setScriptStatus('ready');
            const ok = createWidget();
            if (ok) return;
        } else {
            setScriptStatus('timeout');
            setScriptError(`Element ${ELEMENT_NAME} not registered after script load`);
        }
    } catch (err: any) {
        console.error("loadAndMountWidget top-level error", err);
        setScriptError(String(err?.message || err));
        setScriptStatus('error');
    }
}
    
    // Primary "Start interview" orchestration
    const startInterview = async () => {
        setError(null);
        try {
        const id = await ensureInterviewExists();
        const qs = await fetchSelectedQuestions(id);
        if (!qs || qs.length === 0) {
            setError("No questions selected for this interview.");
            return;
        }
        const { fullSystemPrompt } = buildWidgetContext(qs);
        await loadAndMountWidget(fullSystemPrompt, qs);
        setInterviewStarted(true);
        
        } catch (err) {
        console.error("startInterview failed", err);
        }
    };

    // const endInterview = async () => {
    //     if (!interviewId) {
    //         setError("Interview not created yet.");
    //         return;
    //     }
    //     try {
    //         const headers = await getAuthHeaders();
    //         await fetch(`${API}/api/interviews/${interviewId}/finish`, 
    //             { 
    //                 method: "POST", 
    //                 headers 
    //             }
    //         );
    //         setInterviewStarted(false);
    //         setWidgetLoaded(false);
    //         // also remove widget
    //         removeMountedWidgetElement();
    //     } catch (e) {
    //         console.error("finish error", e);
    //         setError("Failed to finish interview.");
    //     }
    // };

    useEffect(() => {
        // cleanup when leaving page
        return () => {
        unloadWidget();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <main className="min-h-[calc(100vh-4rem)] bg-[#0c0c0c] px-6 py-10">
            <div className="mx-auto max-w-2xl">
                <h1 className="text-2xl font-semibold text-white">Interview Summary</h1>

                <div className="mt-6 text-white">
                    <p className="text-lg">Job Title: {jobTitle}</p>
                    <p className="text-lg">Company: {company}</p>
                    {description && <p className="mt-2 text-sm text-gray-300">{description}</p>}
                </div>

                <div className="mt-6">
                    <div className="flex items-center gap-3">
                    <div className="text-sm text-gray-300">Interview ID:</div>
                    <div className="text-sm text-emerald-300">{interviewId ?? "Not created yet"}</div>
                </div>

                <div className="mt-4 space-x-2">
                    <button
                        className="rounded-md bg-[#3ecf8e] px-4 py-2 text-sm font-semibold text-black hover:bg-[#36be81]"
                        onClick={startInterview}
                        disabled={creating || loading || widgetLoaded}
                    >
                        {creating ? "Creating..." : loading ? "Loading..." : widgetLoaded ? "Widget loaded" : "Start interview"}
                    </button>

                    <button
                        className="rounded-md border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
                        onClick={() => navigate(-1)}
                    >
                        Edit parameters
                    </button>

                    {/* <button
                        className="rounded-md border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
                        onClick={endInterview}
                    >
                        End Interview
                    </button> */}

                    {widgetLoaded && (
                        <button
                            className="rounded-md border border-white/10 px-3 py-2 text-sm text-gray-300 hover:bg-white/5"
                            onClick={() => {
                            if (!interviewId) return;
                            startInterview();
                            }}
                        >
                            Reload widget
                        </button>
                    )}
                </div>

                    {error && <div className="mt-4 rounded-md bg-red-800/60 p-3 text-red-100">{error}</div>}

                    {/* <div id="widget-container" className="mt-8 min-h-[200px]" /> */}
                    <div id="widget-container" className="mt-8 min-h-[200px]" />

                    {/* DEBUG PANEL */}
                    <div className="mt-3 text-sm text-gray-400">
                        <div>Widget script status: <span className="text-emerald-300 ml-2">{scriptStatus}</span></div>
                        {scriptRef.current?.src && <div>Script src: <code className="text-xs">{scriptRef.current.src}</code></div>}
                        {scriptError && <div className="mt-1 text-red-400">Error: {scriptError}</div>}
                        {!widgetLoaded && !scriptError && <div className="mt-1 text-gray-500">If the widget does not appear after a few seconds, check the console for logs / network errors.</div>}
                    </div>

                    {interviewStarted && (
                        <div className="mt-4 text-sm text-gray-400">
                        The agent should now ask questions from your selected dataset. To persist transcripts you must either
                        configure the Convai/ElevenLabs webhook to POST transcripts to your server or capture/upload audio + call STT endpoints.
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
