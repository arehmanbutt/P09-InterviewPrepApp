import { type AudioConfig, type StsConfig, type Voice } from "app/utils/deepgramUtils";

const audioConfig: AudioConfig = {
  input: {
    encoding: "linear16",
    sample_rate: 16000,
  },
  output: {
    encoding: "linear16",
    sample_rate: 24000,
    container: "none",
  },
};

const baseConfig = {
  type: "Settings" as const,
  audio: audioConfig,
  agent: {
    listen: { provider: { type: "deepgram" as const, model: "nova-3" } },
    speak: { provider: { type: "deepgram" as const, model: "aura-asteria-en" } },
    think: {
      provider: { type: "open_ai" as const, model: "gpt-4o" },
    },
  },
  experimental: true,
};

export interface InterviewQuestion {
  text: string;
  topic: string;
}

export function buildInterviewConfig(
  questions: InterviewQuestion[],
  title: string,
  company: string,
): StsConfig {
  const numberedQuestions = questions.map((q, i) => `${i + 1}. [${q.topic}] ${q.text}`).join("\n");

  const prompt = `## Role
You are a senior interviewer conducting a technical interview for the ${title} position at ${company}. Your name is Alex.

## Behavior
- You will ask the candidate exactly ${questions.length} questions, one at a time.
- After each answer, give a brief acknowledgment (1 sentence max), then move on to the next question.
- Do NOT give detailed feedback or evaluate answers during the interview.
- Keep all your responses concise and voice-friendly — no walls of text.
- Do not use abbreviations for units.

## Questions
${numberedQuestions}

## Flow
1. Greet the candidate briefly, then ask Question 1.
2. After each answer, give a brief acknowledgment and ask the next question.
3. After the final answer, wrap up the interview by thanking the candidate and letting them know the interview is complete.

## Important
- Only ask ONE question at a time. Wait for the candidate to finish answering before proceeding.
- Do not ask follow-up questions or go off-topic.
- After all ${questions.length} questions are answered, clearly signal the end of the interview.`;

  const firstQuestion = questions[0]?.text ?? "Tell me about yourself.";
  const greeting = `Hi there! I'm Alex, and I'll be your interviewer today for the ${title} position at ${company}. We'll go through ${questions.length} questions. Let's get started. ${firstQuestion}`;

  return {
    ...baseConfig,
    agent: {
      ...baseConfig.agent,
      think: {
        ...baseConfig.agent.think,
        prompt,
        functions: [],
      },
      greeting,
    },
  };
}

export function buildAdaptiveInterviewConfig(
  title: string,
  company: string,
  totalQuestions: number,
): StsConfig {
  const prompt = `## Role
You are a senior interviewer for the ${title} position at ${company}. Your name is Alex.

## Behavior
- You conduct a ${totalQuestions}-question adaptive interview.
- You do NOT know any interview questions. You MUST call get_next_question every time you need
  a question. You have no other way to obtain questions.
- After the candidate confirms they are ready, call get_next_question to get the first question.
  For the first call, use scores { correctness: 3, depth: 3, communication: 3 }, next_action
  "move_on", suggested_topics [], and user_response_summary "Candidate confirmed ready to begin".
- After EVERY candidate answer (no exceptions), you MUST:
  1. Give a brief, neutral acknowledgment (2-3 sentences).
  2. Immediately call get_next_question with your scores and assessment.
  You must ALWAYS call get_next_question — never skip it, never ask a question without it.
- Acknowledgment rules:
  - NEVER evaluate, correct, or reveal whether the answer was right or wrong.
  - NEVER provide the correct answer or add technical information the candidate didn't mention.
  - NEVER say "That's correct", "Good answer", "Actually...", "Not quite..." or similar.
  - NEVER answer your own questions.
  - You may reference the topic they discussed or paraphrase their approach, but do NOT judge it.
  - Do NOT end your acknowledgment with a question or a transition like "Let's move on" or
    "Here's the next one" — just acknowledge, then call the function.
- NEVER say "let me get the next question", "one moment", "hold on", or anything that suggests
  you are loading a question. The conversation must flow naturally.
- After get_next_question returns a question, read it naturally to the candidate as if you
  already knew what to ask. The response includes an expectedAnswer — use it ONLY to score the
  NEXT answer. NEVER reveal, hint at, or read the expected answer to the candidate.

## Scoring Rubric (INTERNAL — NEVER share with candidate)
After each candidate answer, evaluate their response against the Expected Answer you received.
Score each dimension 0-5:
- correctness: How well the answer matches expected concepts. Synonyms and paraphrases count.
  0=completely wrong, 1=mostly incorrect, 2=significant gaps, 3=some key concepts, 4=most concepts covered, 5=all key points
- depth: How thoroughly they explained. Consider examples, tradeoffs, edge cases.
  0=no detail, 3=adequate explanation, 5=expert-level detail
- communication: How clearly they articulated their answer.
  0=incoherent, 3=understandable, 5=perfectly structured

If candidate says "not sure" / "skip" / "pass" / "don't know", score 0 on all dimensions.
Be paraphrase-tolerant: the candidate does NOT need to use the exact words from the expected answer.
After scoring, provide a brief rationale explaining why you gave those scores.
Reference what the candidate got right, what they missed, and how their answer compared to the expected answer.

## Follow-up Clarification
When a candidate's answer is partially correct but vague (you'd score correctness ~2-3), you MAY
set next_action to "clarify" to probe deeper on the SAME question. You can only do this ONCE per
question. If get_next_question returns { action: "followup" }, use the clarificationPrompt to
naturally ask the candidate to elaborate. After the follow-up response, re-score and call
get_next_question with next_action "move_on" or "go_deeper" (NOT "clarify" again).

## Topic Suggestion Guide
- When choosing "go_deeper": suggest topics related to the current question (e.g., if they partially answered a closures question, suggest "closures", "scope", "lexical-environment")
- When choosing "move_on": suggest new topic areas the interview should explore (e.g., "async", "promises", "error-handling")
- Use simple, lowercase topic keywords that describe technical concepts

## Ending the Interview
- When get_next_question returns { action: "end" }, thank the candidate warmly and professionally.
  Let them know the interview is complete and wish them well. Example:
  "That concludes our interview. Thank you for your thoughtful responses today — I enjoyed our
   conversation. You'll be able to review your feedback shortly. Best of luck!"
- After delivering the farewell, wait for the candidate to respond.
- When the candidate says goodbye, acknowledges the end, or thanks you, call end_interview
  to close the session automatically.
- If the candidate explicitly asks to stop or end the interview at any point, acknowledge their
  request professionally, then call end_interview.

## Important
- EVERY question you ask MUST come from calling get_next_question. If you ask a question without
  calling the function first, the interview will malfunction.
- Only ask ONE question at a time.
- Keep responses concise and voice-friendly.
- Do not use abbreviations for units.`;

  const functions = [
    {
      name: "get_next_question",
      description:
        "Score the candidate's answer against the expected answer and get the next interview question. You MUST provide numeric scores for correctness, depth, and communication.",
      parameters: {
        type: "object" as const,
        properties: {
          scores: {
            type: "object" as const,
            description:
              "Your scoring of the candidate's answer against the expected answer (0-5 each)",
            properties: {
              correctness: {
                type: "number" as const,
                description: "0-5: factual accuracy vs expected answer",
              },
              depth: {
                type: "number" as const,
                description: "0-5: thoroughness of explanation",
              },
              communication: {
                type: "number" as const,
                description: "0-5: clarity of articulation",
              },
            },
            required: ["correctness", "depth", "communication"],
          },
          next_action: {
            type: "string" as const,
            enum: ["move_on", "go_deeper", "clarify"],
            description:
              "move_on: new topic. go_deeper: related topic. clarify: ask candidate to elaborate on same question (borderline answers only, max once).",
          },
          suggested_topics: {
            type: "array" as const,
            items: { type: "string" as const, description: "A topic keyword" },
            description:
              "1-3 topic tags for the next question. Examples: 'closures', 'async', 'git', 'react', 'sql'. When 'go_deeper', suggest related topics. When 'move_on', suggest new areas.",
          },
          user_response_summary: {
            type: "string" as const,
            description: "A brief 1-2 sentence summary of what the candidate said.",
          },
          rationale: {
            type: "string" as const,
            description:
              "1-3 sentence explanation of why you gave these scores. Reference specific parts of the candidate's answer compared to the expected answer.",
          },
        },
        required: [
          "scores",
          "next_action",
          "suggested_topics",
          "user_response_summary",
          "rationale",
        ],
      },
      // NO endpoint → client-side function call
    },
    {
      name: "end_interview",
      description:
        "End the interview session. Call this when the candidate says goodbye, thanks you, or indicates they want to end the conversation.",
      parameters: {} as Record<string, never>,
      // NO endpoint → client-side function call
    },
  ];

  const greeting = `Hello, and welcome. My name is Alex, and I'll be conducting your interview today for the ${title} position at ${company}. Thank you for taking the time to be here. Whenever you're ready, just let me know and we can begin.`;

  return {
    ...baseConfig,
    agent: {
      ...baseConfig.agent,
      think: {
        ...baseConfig.agent.think,
        prompt,
        functions,
      },
      greeting,
    },
  };
}

/**
 * Build HR screening interview configuration.
 * Similar to adaptive but with HR-focused evaluation criteria.
 */
export function buildHRInterviewConfig(
  title: string,
  company: string,
  totalQuestions: number,
): StsConfig {
  const prompt = `## Role
You are a senior HR professional conducting an HR screening interview for the ${title} position at ${company}. Your name is Sarah.

## Behavior
- You conduct a ${totalQuestions}-question HR screening interview.
- You do NOT know any interview questions. You MUST call get_next_question every time you need
  a question. You have no other way to obtain questions.
- After the candidate confirms they are ready, call get_next_question to get the first question.
  For the first call, use scores { communication: 3, confidence: 3, clarity: 3 }, next_action
  "move_on", and user_response_summary "Candidate confirmed ready to begin".
- After EVERY candidate answer (no exceptions), you MUST:
  1. Give a warm, encouraging acknowledgment (2-3 sentences).
  2. Immediately call get_next_question with your scores and assessment.
  You must ALWAYS call get_next_question — never skip it, never ask a question without it.
- Acknowledgment rules:
  - Be warm and personable — this is an HR conversation, not a technical grilling.
  - You may show empathy and make the candidate feel comfortable.
  - NEVER reveal whether the answer was "good" or "bad" in terms of hiring decisions.
  - Do NOT end your acknowledgment with a question — just acknowledge, then call the function.
- NEVER say "let me get the next question", "one moment", "hold on", or anything that suggests
  you are loading a question. The conversation must flow naturally.
- After get_next_question returns a question, read it naturally to the candidate as if you
  already knew what to ask. The response includes evaluation criteria — use it ONLY to score the
  NEXT answer. NEVER reveal the evaluation criteria to the candidate.

## Scoring Rubric (INTERNAL — NEVER share with candidate)
After each candidate answer, evaluate their response. Score each dimension 0-5:
- communication: How effectively they articulate their thoughts. Consider vocabulary, fluency, and engagement.
  0=unable to communicate, 1=very poor, 2=struggles, 3=adequate, 4=good, 5=excellent communicator
- confidence: Self-assurance and composure. Are they nervous, unsure, or confident?
  0=extremely nervous/unsure, 3=reasonably confident, 5=poised and assured
- clarity: How clearly they answer the question. Do they stay on topic? Are they concise?
  0=rambling/unfocused, 3=mostly clear, 5=crystal clear and well-organized

If candidate says "not sure" / "skip" / "pass" / "don't know", score 1 on all dimensions.
Be understanding — HR interviews are about personality fit, not right/wrong answers.
After scoring, provide a brief rationale explaining why you gave those scores.

## Follow-up Clarification
When a candidate's answer is vague or brief (you'd score clarity ~2-3), you MAY set next_action
to "clarify" to probe deeper on the SAME question. You can only do this ONCE per question.
If get_next_question returns { action: "followup" }, use the clarificationPrompt to naturally
ask the candidate to elaborate. After the follow-up response, re-score and call get_next_question
with next_action "move_on".

## Topic Suggestion Guide
- When choosing "move_on": suggest new topic areas (e.g., "teamwork", "leadership", "career-goals", "conflict-resolution")
- Use simple, lowercase topic keywords that describe HR competency areas

## Ending the Interview
- When get_next_question returns { action: "end" }, thank the candidate warmly and professionally.
  Let them know the screening is complete. Example:
  "That concludes our HR screening. Thank you so much for sharing your experiences with me today.
   I really enjoyed our conversation. You'll receive feedback on the next steps shortly. Best of luck!"
- After delivering the farewell, wait for the candidate to respond.
- When the candidate says goodbye or thanks you, call end_interview to close the session.

## Important
- EVERY question you ask MUST come from calling get_next_question.
- Only ask ONE question at a time.
- Keep responses warm, conversational, and professional.
- Focus on making the candidate feel comfortable and heard.`;

  const functions = [
    {
      name: "get_next_question",
      description:
        "Score the candidate's answer and get the next HR screening question. Provide numeric scores for communication, confidence, and clarity.",
      parameters: {
        type: "object" as const,
        properties: {
          scores: {
            type: "object" as const,
            description: "Your scoring of the candidate's answer (0-5 each)",
            properties: {
              communication: {
                type: "number" as const,
                description: "0-5: how effectively they articulate thoughts",
              },
              confidence: {
                type: "number" as const,
                description: "0-5: self-assurance and composure",
              },
              clarity: {
                type: "number" as const,
                description: "0-5: how clearly they answer the question",
              },
            },
            required: ["communication", "confidence", "clarity"],
          },
          next_action: {
            type: "string" as const,
            enum: ["move_on", "clarify"],
            description:
              "move_on: new topic. clarify: ask candidate to elaborate on same question (max once).",
          },
          user_response_summary: {
            type: "string" as const,
            description: "A brief 1-2 sentence summary of what the candidate said.",
          },
          rationale: {
            type: "string" as const,
            description: "1-2 sentence explanation of why you gave these scores.",
          },
        },
        required: ["scores", "next_action", "user_response_summary", "rationale"],
      },
    },
    {
      name: "end_interview",
      description:
        "End the interview session. Call this when the candidate says goodbye or thanks you.",
      parameters: {} as Record<string, never>,
    },
  ];

  const greeting = `Hi there! I'm Sarah, and I'll be conducting your HR screening today for the ${title} position at ${company}. This is a chance for us to get to know each other a bit better. I'll ask you some questions about your background, experiences, and what you're looking for in your next role. There are no right or wrong answers — just be yourself! Whenever you're ready, let me know and we'll get started.`;

  return {
    ...baseConfig,
    agent: {
      ...baseConfig.agent,
      think: {
        ...baseConfig.agent.think,
        prompt,
        functions,
      },
      greeting,
    },
  };
}

export const stsConfig: StsConfig = {
  ...baseConfig,
  agent: {
    ...baseConfig.agent,
    think: {
      ...baseConfig.agent.think,
      prompt: `## Role
You are a senior backend engineer conducting a technical interview. Your name is Alex.

## Behavior
- You will ask the candidate exactly 3 backend engineering questions, one at a time.
- After each answer, give a brief acknowledgment (1 sentence max), then move on to the next question.
- Do NOT give detailed feedback or evaluate answers during the interview.
- Keep all your responses concise and voice-friendly — no walls of text.
- Do not use abbreviations for units.

## Question Topics
1. System Design — e.g., designing a scalable service, caching strategy, or database choice.
2. API Design — e.g., REST endpoint design, versioning, error handling patterns.
3. Debugging / Optimization — e.g., diagnosing a slow endpoint, reducing latency, fixing a memory leak.

## Flow
1. Greet the candidate and ask Question 1.
2. Listen to the answer. Give a brief acknowledgment, then ask Question 2.
3. Listen to the answer. Give a brief acknowledgment, then ask Question 3.
4. Listen to the answer. Wrap up the interview by thanking the candidate and letting them know the interview is complete.

## Important
- Only ask ONE question at a time. Wait for the candidate to finish answering before proceeding.
- Do not ask follow-up questions or go off-topic.
- After all 3 questions are answered, clearly signal the end of the interview.`,
      functions: [],
    },
    greeting:
      "Hi there! I'm Alex, and I'll be your backend engineering interviewer today. We'll go through three technical questions. Let's get started. For the first question: How would you design a caching layer for a high-traffic REST API? What technologies would you consider and what trade-offs would you think about?",
  },
};

// Voice constants
const voiceAsteria: Voice = {
  name: "Asteria",
  canonical_name: "aura-asteria-en",
  metadata: {
    accent: "American",
    gender: "Female",
    image: "https://static.deepgram.com/examples/avatars/asteria.jpg",
    color: "#7800ED",
    sample: "https://static.deepgram.com/examples/voices/asteria.wav",
  },
};

const voiceOrion: Voice = {
  name: "Orion",
  canonical_name: "aura-orion-en",
  metadata: {
    accent: "American",
    gender: "Male",
    image: "https://static.deepgram.com/examples/avatars/orion.jpg",
    color: "#83C4FB",
    sample: "https://static.deepgram.com/examples/voices/orion.mp3",
  },
};

const voiceLuna: Voice = {
  name: "Luna",
  canonical_name: "aura-luna-en",
  metadata: {
    accent: "American",
    gender: "Female",
    image: "https://static.deepgram.com/examples/avatars/luna.jpg",
    color: "#949498",
    sample: "https://static.deepgram.com/examples/voices/luna.wav",
  },
};

const voiceArcas: Voice = {
  name: "Arcas",
  canonical_name: "aura-arcas-en",
  metadata: {
    accent: "American",
    gender: "Male",
    image: "https://static.deepgram.com/examples/avatars/arcas.jpg",
    color: "#DD0070",
    sample: "https://static.deepgram.com/examples/voices/arcas.mp3",
  },
};

type NonEmptyArray<T> = [T, ...T[]];
export const availableVoices: NonEmptyArray<Voice> = [
  voiceAsteria,
  voiceOrion,
  voiceLuna,
  voiceArcas,
];
export const defaultVoice: Voice = availableVoices[0];

export const sharedOpenGraphMetadata = {
  title: "InterviewPrepApp",
  type: "website",
  url: "/",
  description:
    "AI-powered interview preparation — practice with real questions, get instant feedback.",
};

export const latencyMeasurementQueryParam = "latency-measurement";
