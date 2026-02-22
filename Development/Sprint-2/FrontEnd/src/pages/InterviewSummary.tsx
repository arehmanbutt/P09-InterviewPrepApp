import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { io as ioClient } from "socket.io-client";

type LocationState = {
  id?: string;
  jobTitle?: string;
  company?: string;
  description?: string;
};

type QuestionItem = {
    question_id: string;
    question_title: string;
    question_text: string;
    difficulty_score: number;
};

type AgentQuestion = {
    question_id: string;    
    question_text: string;
}

type NextQuestionPayload = {
    action: string;
    question: {
        question_id: string;
        question_title: string;
        question_text: string;
        difficulty_score: number;
    };
    followup_prompt: string;
}

let socket: any = null;

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
    const [answersMap, setAnswersMap] = useState<Record<string, string>>({});
    const [transcript, setTranscript] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [widgetLoaded, setWidgetLoaded] = useState(false);
    const [interviewStarted, setInterviewStarted] = useState(false);

    const [scriptStatus, setScriptStatus] = useState<'idle'|'found'|'loading'|'loaded'|'error'|'ready'|'timeout'>('idle');
    const [scriptError, setScriptError] = useState<string | null>(null);

    const [overallScore, setOverallScore] = useState<number | null>(null);
    const [scoreLoading, setScoreLoading] = useState(false);

    // --- question sampling / difficulty state (new) ---
    const [questionBuckets, setQuestionBuckets] = useState<Record<number, QuestionItem[]>>({
        1: [], 2: [], 3: [], 4: [], 5: []
    });
    const [samplingPlan, setSamplingPlan] = useState<number[]>([]);
    const [extrasList, setExtrasList] = useState<QuestionItem[]>([]);
    const [totalToAsk, setTotalToAsk] = useState<number>(0);
    const [targetCounts, setTargetCounts] = useState<Record<number, number>>({});
    const [availability, setAvailability] = useState<Record<number, { available: number; target: number }>>({});

    const scriptRef = useRef<HTMLScriptElement | null>(null);
    const widgetRef = useRef<HTMLElement | null>(null);

    const API = import.meta.env.VITE_API_URL || "";

    async function getAuthHeaders() {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
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
        console.log("Ensuring interview exists, current id:", interviewId);
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
            const id = body?.interviewId || body?.id || body?.interview?._id;
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

    async function fetchSelectedQuestions(id: string) {
        setLoading(true);
        setError(null);
        console.log("Fetching selected questions for interview id:", id);
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API}/api/interviews/${id}/questions`, { method: "GET", headers });
            const body = await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(body?.message || `Failed to fetch questions (${res.status})`);
            }

            const saveRes = await fetch(`${API}/api/interviews/${id}/init-sampling`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    samplingPlan: body.samplingPlan,
                    buckets: body.buckets,
                    extras: body.extras || [],
                }),
            });
            
            if (!saveRes.ok) {
                throw new Error(`Failed to persist questions and sampling plan`);
            }

            // --- Handle new enriched response shape (preferred) ---
            if (body && Array.isArray(body.samplingPlan) && body.buckets) {
                // buckets may have string keys '1'..'5' or numeric keys; normalize to numeric keys
                const rawBuckets = body.buckets || {};
                const normalizedBuckets: Record<number, any[]> = {1: [],2: [],3: [],4: [],5: []};
                for (let lvl = 1; lvl <= 5; lvl++) {
                    const maybe = rawBuckets[lvl] ?? rawBuckets[String(lvl)] ?? [];
                    normalizedBuckets[lvl] = Array.isArray(maybe) ? maybe : [];
                }

                // set frontend state for later sampling
                setQuestionBuckets(normalizedBuckets);
                setSamplingPlan(Array.isArray(body.samplingPlan) ? body.samplingPlan : []);
                setExtrasList(Array.isArray(body.extras) ? body.extras : []);
                setTotalToAsk(Number(body.totalToAsk ?? body.totalToAsk ?? (body.samplingPlan?.length ?? 0)));
                setTargetCounts(body.targetCounts ?? {});
                setAvailability(body.availability ?? { 1:{available: normalizedBuckets[1].length, target: (body.targetCounts?.[1] ?? 0) },
                                                        2:{available: normalizedBuckets[2].length, target: (body.targetCounts?.[2] ?? 0) },
                                                        3:{available: normalizedBuckets[3].length, target: (body.targetCounts?.[3] ?? 0) },
                                                        4:{available: normalizedBuckets[4].length, target: (body.targetCounts?.[4] ?? 0) },
                                                        5:{available: normalizedBuckets[5].length, target: (body.targetCounts?.[5] ?? 0) } });

                // answers map (if provided)
                const receivedAnswers = body.answersMap ?? {};
                const normalized: Record<string, string> = {};
                for (const k of Object.keys(receivedAnswers)) {
                    normalized[String(k)] = String(receivedAnswers[k] ?? '');
                }
                setAnswersMap(normalized);

                // Return a flattened array for backward-compatible widget building:
                // preserve bucket ordering so the widget gets a predictable pool
                
                const flattened: QuestionItem[] = [];
                for (let lvl = 1; lvl <= 5; lvl++) {
                    const items = normalizedBuckets[lvl] ?? [];
                    for (const it of items) {
                    // ensure shape matches QuestionItem (id/title/text); if server already returns that shape, fine
                        flattened.push({
                            question_id: String(it.question_id ?? it.id ?? ''),
                            question_title: String(it.question_title ?? it.title ?? ''),
                            question_text: String(it.question_text ?? it.text ?? it.question ?? ''),
                            difficulty_score: Number(it.difficulty_score ?? lvl),
                        });
                    }
                }
                // append extras (ordered fallback) at the end (if any)
                if (Array.isArray(body.extras)) {
                    for (const it of body.extras) {
                    flattened.push({
                        question_id: String(it.question_id ?? it.id),
                        question_title: String(it.question_title ?? it.title ?? ''),
                        question_text: String(it.question_text ?? it.text ?? it.question ?? ''),
                        difficulty_score: Number(it.difficulty_score ?? 3),
                    });
                    }
                }

                return flattened;
            }

        } catch (err: any) {
            console.error("fetchSelectedQuestions error", err);
            setError(err?.message || "Failed to load questions");
            throw err;
        } finally {
            setLoading(false);
        }
    }

    function buildWidgetContext(currentQuestion: AgentQuestion | null) {
        // Build cleaned list and include difficulty if present
        // const questionTexts = (qs || []).map((q) => ({
        //     id: q.question_id ?? (q as any).id ?? null,
        //     title: q.question_title ?? (q as any).title ?? '',
        //     text: q.question_text ?? (q as any).text ?? (q as any).question ?? '',
        //     difficulty: Number((q as any).difficulty_score ?? (q as any).difficulty ?? 3)
        // })).filter(q => q.id != null);

        // // include difficulty in the question list for transparency
        // const questionsList = questionTexts.map((q, index) => 
        //     `${index + 1}. ${q.title} (ID: ${q.id}, difficulty: ${q.difficulty}): ${q.text}`
        // ).join('\n');

        // console.log('Prepared questions for widget context:', questionTexts.slice(0,3));
        if(!interviewId){
            console.error("Interview ID is missing when building widget context.");
            throw new Error("Interview ID is required to build widget context.");
        }

        /* 
            2) When the conversation is created by the widget/runtime, after the first message, CALL the tool named register_conversation exactly once.
            {
                "conversationId": system__conversation_id,   // use the system-provided conversation id variable (use the tool UI variable picker to set this field in tool config)
                "interviewId": interviewId                  // use the interviewId provided in the session context (dynamic variable)
            }
            Wait for the tool call to complete and for the server to respond with success. Do not speak while the tool call is in progress.

        */

        // **and only after** you receive explicit permission to start the interview, 
            
        const fullSystemPrompt = `
            You are an automated interview agent used only to run recorded mock technical interviews. Follow these rules exactly.

            1) Greeting & permission — Always ask for permission to start, 
            e.g. “Thank you for joining. May I begin the interview now?” Wait for an explicit affirmative 
            (“yes”, “please start”, “go ahead”, “sure”). If the candidate’s first reply is not explicit, ask once more. Proceed only after explicit permission.
            Do not invoke the save_question_transcript tool for this user response nor speak anything related to it.
            
            2) Authority of questions — You MUST ONLY ask the single question provided to you for the current turn.
            The orchestrator will provide exactly one question as ${currentQuestion} (with fields 'question_id' and 'question_text'). This is the question you must ask now. This applies to the first question of the interview and to every subsequent question.
            After you complete a question and save the response, the orchestrator will explicitly provide the next ${currentQuestion} in sequence. Do not assume, predict, or iterate through questions on your own.

            3) Asking & waiting — For the current question: ask it exactly and concisely (use '${currentQuestion?.question_text ?? "[NO_QUESTION_PROVIDED]"}'), then wait for the candidate’s spoken answer before moving on.

            4) Clarification — Do not ask clarifying questions on your own. Always accept whatever the candidate says as their final answer for the 
            current question (even if it is short, unclear, or incomplete). Immediately proceed to save that response via the save tool (per Rule 6).

            5) Skipping — If the candidate says “skip” or “pass”, acknowledge briefly (“Okay, skipping that question.”) and stop further questioning for this question. 
            Allow returning to a skipped question only if the orchestrator later supplies that question again explicitly.
            
            6) Persistence & tool call — After receiving the candidate’s spoken answer for the current question (including any short interruptions or fragments), combine all 
            speech segments for that question into one coherent string, then invoke the save_question_transcript tool exactly once with parameters: question_id (from ${currentQuestion}) 
            and transcript (the candidate's full spoken answer as one string). Call this tool immediately after the candidate finishes speaking for the current question—do not wait for or 
            assume any scoring outcome. After invoking the tool, wait for the orchestrator to supply the next instruction (next question, a clarification to ask, or END_INTERVIEW). 
            Do not END_INTERVIEW without the orchestrator's explicit instruction to do so.
            
            7) Wait for orchestration instruction — After calling save_question_transcript, wait for the tool response. If a new ${currentQuestion} object is present (with question_id and question_text), 
            ask that question exactly once. If the ${currentQuestion} object is null, say exactly “Interview complete. Thank you for your time.” and stop. 
            Do not ask any question until you have processed the tool response.

            8) Ending the interview — If the ${currentQuestion} object is null, say exactly “Interview complete. Thank you for your time.” and stop. 
            Do not call "save_question_transcript" for this; only call it for actual question answers.
            
            INTERVIEW CONTEXT:
            - interviewId: '${interviewId}'

            IMPORTANT: 
            - Do not prompt for job info, role summary, or anything else outside the provided questions.
            - The interviewId above is a fixed identifier for this entire session.
            - You MUST include this exact interviewId in every call to the save_question_transcript tool.
            - When you call save_question_transcript tool, the backend will return JSON that will include currentQuestion. 
            Wait for the response: if currentQuestion appears, you must use it as the next ${currentQuestion} and ask it.
            `;

            // 7) Wait for orchestration instruction — **After calling 'save_question_transcript', do not ask another question or continue the interview.** Wait for the orchestrator/backend to supply 
            // the next '${currentQuestion}' (or an explicit termination command). Only after you receive the next question object from the orchestrator should you proceed to ask it. If the orchestrator 
            // instead sends an explicit “END_INTERVIEW” instruction, say exactly: “Interview complete. Thank you for your time.” and terminate the session.
            
            // 8) Ending the interview — If you have been given the last question and have received and acknowledged its final answer (including any clarification), follow rule 6 to save, 
            // then say exactly: “Interview complete. Thank you for your time.” Do not ask additional questions or continue the conversation.
            
            // console.log('Building widget with embedded prompt:', { fullSystemPrompt, questionsList });
        // 6) Webhook / persistence — If webhook/event hooks are configured for the embed, emit an event at the end of each question 
        // turn with the candidate’s transcript and the question id. Also emit a final “interview.finished” event when done. 
        // (This is informational. The embed platform will send webhooks — ensure your server endpoint accepts them.)
        // const stopPhrases = ['end interview', 'stop interview', 'finish', 'end']; //end added

        // The widget expects a `context` object — include your instructions and the question list there.
        // We set both a `system` key and an explicit `runtimeInstructions` key to be defensive.
        return { fullSystemPrompt };
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
                        widgetEl.setAttribute("dynamic-variables", JSON.stringify({ interviewId: interviewId }));
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

                widgetEl.addEventListener('user_transcript', (e) => {
                    const event = e as CustomEvent;
                    const detail = event.detail;
                    if (detail?.user_transcript) {
                        setTranscript((prev) => [...prev, { role: 'user', text: detail.user_transcript, questionId: detail.question_id || null }]);
                        // Optionally send to backend via fetch to persist
                    }
                    console.log('User transcript:', detail);
                });

                // Listen for agent responses (fired with agent's message)
                widgetEl.addEventListener('agent_response', (e) => {
                    const event = e as CustomEvent;
                    const detail = event.detail;
                    if (detail?.text) {
                        setTranscript((prev) => [...prev, { role: 'agent', text: detail.text, questionId: detail.question_id || null }]);
                    }
                    console.log('Agent response:', detail);
                });

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
        const firstQuestion: AgentQuestion = {question_id: qs[0].question_id, question_text: qs[0].question_text};
        console.log("Starting interview with first question:", firstQuestion.question_text);  
        const { fullSystemPrompt } = buildWidgetContext(firstQuestion);
        console.log("Built full system prompt for widget.");
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

    async function fetchOverallScoreOnce(interviewId: string) {
        try {
            const headers = await getAuthHeaders();

            const res = await fetch(`${API}/api/webhooks/transcripts/${interviewId}`, {
                method: "GET",
                headers,
            });

            const body = await res.json().catch(() => null);

            if (!res.ok) return null;

            return body?.transcript?.overallScore ?? null;
        } catch (err) {
            console.error("polling score error:", err);
            return null;
        }
    }
    
    useEffect(() => {
        if (!interviewId) return;
        
        console.log("Interview id type is: ", typeof interviewId);
        console.log("Starting overall score polling for interview id:", interviewId);

        let intervalId: ReturnType<typeof setInterval>; 

        async function startPolling() {
            intervalId = setInterval(async () => {
            let score: number | null = null;
            if (interviewId){
                score = await fetchOverallScoreOnce(interviewId);
            }

            if (score !== null) {
                setOverallScore(score);
                setScoreLoading(false);
                clearInterval(intervalId); // stop polling once ready
            }
            }, 3000); // poll every 3 seconds
        }

        startPolling();

        // cleanup
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [interviewId]);

    // function remountWidgetWithQuestion(nextQuestion: AgentQuestion) {
    //     const container = document.getElementById('widget-container');
    //     if (!container) return;

    //     // remove old widget
    //     removeMountedWidgetElement(); // reuse your helper

    //     // Build new override prompt that includes currentQuestion substitution (same format you used at mount)
    //     const overridePrompt = buildWidgetContext(nextQuestion); // implement to return string

    //     // create widget again (same code as in loadAndMountWidget but pass overridePrompt and dynamic vars)
    //     const widgetEl = document.createElement('elevenlabs-convai') as HTMLElement;
    //     widgetEl.setAttribute('agent-id', import.meta.env.VITE_ELEVEN_AGENT_ID);
    //     widgetEl.setAttribute('override-prompt', overridePrompt.fullSystemPrompt);
    //     widgetEl.setAttribute('dynamic-variables', JSON.stringify({ interviewId, currentQuestion: nextQuestion }));
    //     container.appendChild(widgetEl);
    //     widgetRef.current = widgetEl;
    // }

    // async function applyRuntimeVarsToWidget(el: HTMLElement, currentQuestion: AgentQuestion, debug = true) {
    //     console.log('Applying runtime variables to widget');
    //     if (!el) throw new Error("widget element missing");

    //     const safeJson = JSON.stringify(currentQuestion);

    //     // 1) set attribute and property (best-effort)
    //     try {
    //         el.setAttribute('dynamic-variables', safeJson);
    //     } catch (e) {
    //         if (debug) console.warn('setAttribute(dynamic-variables) failed', e);
    //     }
    //     console.log(el.getAttribute('dynamic-variables'));
    //     try {
    //         // some builds use .metadata or .dynamicVariables property
    //         (el as any).metadata = currentQuestion;
    //         (el as any).dynamicVariables = currentQuestion;
    //         (el as any).runtimeVariables = currentQuestion;
    //     } catch (e) {
    //         if (debug) console.debug('setting properties failed (ok):', e && String(e).slice(0,120));
    //     }

    //     // 2) inspect available methods/properties (very helpful for debugging)
    //     try {
    //         const proto = Object.getPrototypeOf(el) || {};
    //         const protoNames = Object.getOwnPropertyNames(proto).sort();
    //         const instNames = Object.keys(el as any).sort();
    //         if (debug) {
    //             console.log('widget element prototype methods:', protoNames);
    //             console.log('widget element own properties:', instNames);
    //             console.log('typeof refresh:', typeof (el as any).refresh);
    //         }
    //     } catch (e) {
    //         if (debug) console.warn('failed introspecting element', e);
    //     }

    //     // 3) try calling common candidate APIs (stop at first success)
    //     const methodCandidates = [
    //         'refresh', 'refreshRuntime', 'update', 'updateRuntime', 'reload', 'rehydrate',
    //         'setRuntimeVariables', 'setDynamicVariables', 'applyRuntimeVariables', 'setMetadata',
    //         'setContext', 'setProps', 'rebind', 'resume', 'start', 'updateContext'
    //     ];

    //     for (const name of methodCandidates) {
    //         try {
    //         const fn = (el as any)[name];
    //         if (typeof fn === 'function') {
    //             console.log("Calling widget method: ", name);
    //             if (debug) console.log(`Calling widget method: ${name}()`);
    //             // call with runtimeVars if function accepts args, otherwise call with no args
    //             try { fn.call(el, currentQuestion); } catch (e) { try { fn.call(el, safeJson); } catch (_) { fn.call(el); } }
    //             return { applied: true, via: name };
    //         }
    //         } catch (e) {
    //         if (debug) console.warn(`Calling ${name}() threw`, e);
    //         }
    //     }

    //     // 4) If widget contains an iframe, use postMessage fallback (some widgets use iframe bridge)
    //     try {
    //         const iframe = el.querySelector && (el.querySelector('iframe') as HTMLIFrameElement | null);
    //         if (iframe && iframe.contentWindow) {
    //             if (debug) console.log('Posting runtime vars to iframe via postMessage');
    //             iframe.contentWindow.postMessage({ type: 'elevenlabs.runtimeVars', payload: currentQuestion }, '*');
    //             return { applied: true, via: 'iframe-postMessage' };
    //         }
    //     } catch (e) {
    //         if (debug) console.warn('iframe postMessage failed', e);
    //     }

    //     // 5) Try dispatching a CustomEvent which some widgets listen to
    //     try {
    //         const ev = new CustomEvent('runtime-variables-update', { detail: currentQuestion, bubbles: true, composed: true });
    //         el.dispatchEvent(ev);
    //         if (debug) console.log('Dispatched runtime-variables-update event on widget');
    //         // we cannot know if widget consumed it — just return "attempted"
    //         return { applied: true, via: 'custom-event' };
    //     } catch (e) {
    //         if (debug) console.warn('dispatchEvent failed', e);
    //     }

    //     console.log("GOING IN PROMISE")
    //     // 6) Wait a bit for methods to appear (some lazy-init widgets attach API after async load)
    //     const appeared = await new Promise<{ applied: boolean; via?: string }>((resolve) => {
    //         let settled = false;
    //         const timer = setTimeout(() => {
    //         if (!settled) { settled = true; resolve({ applied: false }); }
    //         }, 3500);

    //         const observer = new MutationObserver(() => {
    //         for (const name of methodCandidates) {
    //             if (typeof (el as any)[name] === 'function') {
    //                 console.log('Widget method appeared via MutationObserver:', name);
    //                 if (!settled) {
    //                     console.log('Widget method appeared via MutationObserver !settled:');
    //                     settled = true;
    //                     clearTimeout(timer);
    //                     observer.disconnect();
    //                     try {
    //                       (el as any)[name](currentQuestion);
    //                     } catch (e) {}
    //                     resolve({ applied: true, via: name });
    //                 }
    //             }
    //         }
    //         });
    //         try { observer.observe(el as any, { attributes: true, childList: true, subtree: false }); } catch (e) {}

    //         // also check immediate
    //         for (const name of methodCandidates) {
    //             if (typeof (el as any)[name] === 'function') {
    //                 console.log('Widget method already present on immediate check:', name);
    //                 if (!settled) {
    //                     console.log('Widget method already present on immediate check !settled:');
    //                     settled = true;
    //                     clearTimeout(timer);
    //                     observer.disconnect();
    //                     try { (el as any)[name](currentQuestion); } catch (e) {}
    //                     resolve({ applied: true, via: name });
    //                 }
    //             }
    //         }
    //     });

    //     if (appeared.applied) return appeared;
    //     console.log("ENDING FALSE PROMISE")
    //     // 7) Last resort: return false — caller can decide to remount the widget (not recommended)
    //     return { applied: false, via: 'none' };
    // }


    // async function handleNextQuestion(payload: NextQuestionPayload) {
    //     if (!payload) return;
    //     const { action, question, followup_prompt } = payload;
        
    //     if(!question.question_id || !question.question_text){
    //         console.error("Next question payload is missing required fields");
    //         return;
    //     }

    //     const nextQuestion: AgentQuestion = {question_id: question?.question_id, question_text: question.question_text};

    //     // If followup prompt -> ask followup via the widget
    //     const el = widgetRef.current;
    //     if(!el) throw new Error("Widget element not found in handleNextQuestion");

    //     if (action === 'followup' && followup_prompt) {
    //         console.log("Handling followup prompt via widget API");
    //         // Some widgets expose custom API; try a best-effort call:
    //         try {
    //             if ((el as any).callRuntimeAction) {
    //                 (el as any).callRuntimeAction('ask_followup', { prompt: followup_prompt });
    //                 return;
    //             }
    //         } catch (e) {
    //             console.warn('widget runtime call failed', e);
    //             return;
    //         }
    //     }

    //     if (action === 'ask' && question) {
    //         console.log("Handling next question via dynamic variables update");

    //         // const runtimeVars = {interviewId , currentQuestion: nextQuestion };
    //         // const runtimeVars = {interviewId, currentQuestion: nextQuestion};
    //         try {
    //             // // 1) Update dynamic variables attribute (widget will read this)
    //             // el.setAttribute('dynamic-variables', JSON.stringify(runtimeVars));
    //             // console.log(el.getAttribute('dynamic-variables'));
    //             // console.log("LOGGIN METADATA");
    //             // console.log((el as any).metadata);
    //             // try { 
    //             //     console.log("Setting widget metadata to:", runtimeVars);
    //             //     (el as any).metadata = runtimeVars; 
    //             // } 
    //             // catch(e) 
    //             //     {}
    //             // // 2) If widget offers a refresh method, call it. If not, re-mount the widget (fallback below)
    //             // if (typeof (el as any).refresh === 'function') {
    //             //     console.log("Calling widget refresh() to apply new question");
    //             //     (el as any).refresh();
    //             //     return;
    //             // }
    //             // const result = await applyRuntimeVarsToWidget(el!, runtimeVars, true);
    //             console.log("Applying runtime variables to widget for next question: ", nextQuestion);
    //             const result = await applyRuntimeVarsToWidget(el!, nextQuestion, true);
    //             console.log('applyRuntimeVarsToWidget result:', result);
    //             if (result.applied) {
    //                 // good — if widget had a real API, it probably applied. If that API expects a response,
    //                 // the agent will proceed.
    //                 console.log("Widget runtime variables updated successfully via:", result.via);
    //                 return;
    //             }
    //         } catch (err) {
    //             console.warn('Failed to update widget runtime variables:', err);
    //             return;
    //         }
    //     }
        
    //     console.log("GETTING TO FALLBACK FOR NEXT-QUESTION")
    //     // remountWidgetWithQuestion(nextQuestion);
    // }

    // useEffect(() => {
    //     if (!interviewId) return;
    //     console.log("Setting up WebSocket in useEffect: ", API);
    //     socket = ioClient(API, { path: '/socket.io', transports: ['websocket', 'polling'] });

    //     socket.on('connect', () => {
    //         console.log('socket connected', socket.id);
    //         socket.emit('join_interview', { interviewId });
    //     });

    //      socket.on('connect_timeout', (t: number) => {
    //         console.warn('socket connect_timeout', t);
    //     });

    //     socket.on('reconnect_attempt', (n: number) => {
    //         console.log('socket reconnect_attempt', n);
    //     });

    //     socket.on('next_question', (payload: NextQuestionPayload) => {
    //         console.log('received next_question', payload);
    //         handleNextQuestion(payload);
    //     });

    //     socket.on('disconnect', () => console.log('socket disconnected'));

    //     return () => {
    //         try { socket.disconnect(); } catch (e) {}
    //     };
    // }, [interviewId]);

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

                <div className="mt-4 p-3 bg-gray-800 rounded-md text-white">
                    <div className="text-sm font-semibold">Overall Score</div>

                    {scoreLoading ? (
                        <div className="text-gray-400 text-sm">Waiting for score…</div>
                    ) : (
                        <div className="text-lg font-bold">{overallScore}</div>
                    )}
                </div>

                    {error && <div className="mt-4 rounded-md bg-red-800/60 p-3 text-red-100">{error}</div>}

                    {/* <div id="widget-container" className="mt-8 min-h-[200px]" /> */}
                    <div id="widget-container" className="mt-8 min-h-[200px]" />

                    {/* DEBUG PANEL */}
                    {/* <div className="mt-3 text-sm text-gray-400">
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
                    )} */}
                </div>
            </div>
        </main>
    );
}
