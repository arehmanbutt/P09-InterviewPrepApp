import OpenAI from "openai";
import type { TranscriptEntry, InterviewFeedback } from "app/models/Interview";
import type { QuestionScore } from "./types";
import type { IPoolQuestion } from "./types";
import type { ResumeData } from "./resumeParser";
import { formatResumeForPrompt } from "./resumeParser";

export interface GeneratedQuestion {
  text: string;
  topic: string;
}

let client: OpenAI | null = null;

export function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export async function generateInterviewQuestions(
  jobTitle: string,
  jobDescription: string,
): Promise<GeneratedQuestion[]> {
  const openai = getClient();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an expert technical interviewer. Generate exactly 3 open-ended interview questions for a voice interview. Each question should cover a different skill area relevant to the job. Return JSON in this exact format: { "questions": [{ "text": "...", "topic": "..." }] }`,
      },
      {
        role: "user",
        content: `Job Title: ${jobTitle}\n\nJob Description: ${jobDescription}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty response");
  }

  const parsed: unknown = JSON.parse(content);

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("questions" in parsed) ||
    !Array.isArray((parsed as { questions: unknown }).questions)
  ) {
    throw new Error("OpenAI response did not match expected format");
  }

  const questions = (parsed as { questions: unknown[] }).questions;

  const validated: GeneratedQuestion[] = [];
  for (const q of questions) {
    if (
      !q ||
      typeof q !== "object" ||
      !("text" in q) ||
      !("topic" in q) ||
      typeof (q as { text: unknown }).text !== "string" ||
      typeof (q as { topic: unknown }).topic !== "string"
    ) {
      throw new Error("Invalid question format in OpenAI response");
    }
    validated.push({
      text: (q as { text: string }).text,
      topic: (q as { topic: string }).topic,
    });
  }

  return validated;
}

export async function generateSingleQuestion(
  jobTitle: string,
  jobDescription: string,
  excludeTopics: string[] = [],
): Promise<GeneratedQuestion> {
  const openai = getClient();

  const excludeClause =
    excludeTopics.length > 0
      ? `Do NOT ask about these topics (already covered): ${excludeTopics.join(", ")}.`
      : "";

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an expert technical interviewer. Generate exactly 1 open-ended interview question for a voice interview. ${excludeClause} Return JSON: { "text": "...", "topic": "..." }`,
      },
      {
        role: "user",
        content: `Job Title: ${jobTitle}\n\nJob Description: ${jobDescription}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty response");
  }

  const parsed: unknown = JSON.parse(content);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("text" in parsed) ||
    !("topic" in parsed) ||
    typeof (parsed as { text: unknown }).text !== "string" ||
    typeof (parsed as { topic: unknown }).topic !== "string"
  ) {
    throw new Error("OpenAI single question response did not match format");
  }

  return {
    text: (parsed as { text: string }).text,
    topic: (parsed as { topic: string }).topic,
  };
}

export async function generatePoolQuestions(
  jobTitle: string,
  jobDescription: string,
  count: number = 10,
  resumeData?: ResumeData | null,
): Promise<IPoolQuestion[]> {
  const openai = getClient();

  // Build resume context if available
  const resumeContext = resumeData ? formatResumeForPrompt(resumeData) : null;

  // Enhanced system prompt when resume is provided
  const systemContent = resumeContext
    ? `You are an expert technical interviewer. Generate exactly ${count} open-ended interview questions for a voice interview.

You have been provided with the candidate's resume. Generate PERSONALIZED questions that:
1. Probe into their specific projects and technologies they've worked with
2. Ask about challenges they faced in their listed experience
3. Dive deeper into skills they claim to have
4. Connect their background to the job requirements
5. Verify the depth of their knowledge in listed technologies

Return JSON in this exact format:
{
  "questions": [
    {
      "question_title": "Short descriptive title",
      "question_text": "The full interview question to ask verbally",
      "answer_text": "Brief expected answer covering key points (2-3 sentences)",
      "tags": ["lowercase-tag1", "lowercase-tag2"],
      "difficulty_score": 3
    }
  ]
}

Rules:
- At least 60% of questions should be personalized based on the resume
- Reference specific projects, companies, or technologies from their resume
- Each question MUST have 2-4 tags as lowercase keywords
- difficulty_score must be an integer from 1 to 5
- Include at least one question at each difficulty level (1 through 5)
- Questions should be suitable for a verbal/voice interview (not coding exercises)
- Make questions feel natural for conversation, not like reading from a list`
    : `You are an expert technical interviewer. Generate exactly ${count} open-ended interview questions for a voice interview. Each question should cover a different skill area relevant to the job. Vary difficulty from 1 (basic) to 5 (expert).

Return JSON in this exact format:
{
  "questions": [
    {
      "question_title": "Short descriptive title",
      "question_text": "The full interview question to ask verbally",
      "answer_text": "Brief expected answer covering key points (2-3 sentences)",
      "tags": ["lowercase-tag1", "lowercase-tag2"],
      "difficulty_score": 3
    }
  ]
}

Rules:
- Each question MUST have 2-4 tags as lowercase keywords (e.g. "python", "django", "orm")
- difficulty_score must be an integer from 1 to 5
- Include at least one question at each difficulty level (1 through 5)
- Cover diverse topics relevant to the job description
- Questions should be suitable for a verbal/voice interview (not coding exercises)`;

  // Build user content
  const userContent = resumeContext
    ? `Job Title: ${jobTitle}\n\nJob Description: ${jobDescription}\n\n--- CANDIDATE'S RESUME ---\n${resumeContext}`
    : `Job Title: ${jobTitle}\n\nJob Description: ${jobDescription}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: systemContent,
      },
      {
        role: "user",
        content: userContent,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned an empty response");

  const parsed: unknown = JSON.parse(content);

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("questions" in parsed) ||
    !Array.isArray((parsed as { questions: unknown }).questions)
  ) {
    throw new Error("OpenAI pool question response did not match expected format");
  }

  const questions = (parsed as { questions: unknown[] }).questions;
  const result: IPoolQuestion[] = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q || typeof q !== "object") continue;
    const obj = q as Record<string, unknown>;

    result.push({
      question_id: `openai_${Date.now()}_${i}`,
      question_title: typeof obj.question_title === "string" ? obj.question_title : "",
      question_text: typeof obj.question_text === "string" ? obj.question_text : "",
      answer_text: typeof obj.answer_text === "string" ? obj.answer_text : "",
      tags: Array.isArray(obj.tags)
        ? obj.tags.filter((t): t is string => typeof t === "string").map((t) => t.toLowerCase())
        : [],
      difficulty_score:
        typeof obj.difficulty_score === "number" &&
        obj.difficulty_score >= 1 &&
        obj.difficulty_score <= 5
          ? obj.difficulty_score
          : 3,
    });
  }

  if (result.length === 0) {
    throw new Error("No valid questions in OpenAI pool response");
  }

  return result;
}

/**
 * Generate HR screening questions via LLM.
 * These focus on communication, cultural fit, behavioral competencies, and soft skills.
 */
export async function generateHRQuestions(
  jobTitle: string,
  jobDescription: string,
  count: number = 10,
): Promise<IPoolQuestion[]> {
  const openai = getClient();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an expert HR interviewer. Generate exactly ${count} HR screening questions for a voice interview. These questions should assess soft skills, communication ability, cultural fit, motivation, and behavioral competencies.

Return JSON in this exact format:
{
  "questions": [
    {
      "question_title": "Short descriptive title",
      "question_text": "The full interview question to ask verbally",
      "answer_text": "Key points to look for in a good answer (2-3 sentences)",
      "tags": ["hr-category1", "hr-category2"],
      "difficulty_score": 3
    }
  ]
}

HR Question Categories to cover:
- Communication & Presentation: How clearly and confidently they express ideas
- Cultural Fit: Alignment with company values and work style
- Motivation & Career Goals: Why they want this role and their ambitions
- Teamwork & Collaboration: Working with others, handling conflicts
- Problem Solving & Adaptability: How they handle challenges and change
- Leadership & Initiative: Taking ownership and leading others
- Work Ethic & Reliability: Commitment, time management, accountability
- Self-Awareness: Understanding their strengths and weaknesses

Rules:
- Each question MUST have 2-4 tags from the HR categories above (lowercase, e.g., "communication", "cultural-fit", "teamwork")
- difficulty_score: 1=icebreaker, 2=background, 3=behavioral, 4=situational, 5=challenging scenario
- Include a mix of difficulty levels
- Questions should be open-ended and suitable for verbal interview
- Focus on STAR-method style behavioral questions where appropriate
- Do NOT include technical or role-specific knowledge questions`,
      },
      {
        role: "user",
        content: `Job Title: ${jobTitle}\n\nJob Description: ${jobDescription}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned an empty response for HR questions");

  const parsed: unknown = JSON.parse(content);

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("questions" in parsed) ||
    !Array.isArray((parsed as { questions: unknown }).questions)
  ) {
    throw new Error("OpenAI HR question response did not match expected format");
  }

  const questions = (parsed as { questions: unknown[] }).questions;
  const result: IPoolQuestion[] = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q || typeof q !== "object") continue;
    const obj = q as Record<string, unknown>;

    result.push({
      question_id: `hr_${Date.now()}_${i}`,
      question_title: typeof obj.question_title === "string" ? obj.question_title : "",
      question_text: typeof obj.question_text === "string" ? obj.question_text : "",
      answer_text: typeof obj.answer_text === "string" ? obj.answer_text : "",
      tags: Array.isArray(obj.tags)
        ? obj.tags.filter((t): t is string => typeof t === "string").map((t) => t.toLowerCase())
        : [],
      difficulty_score:
        typeof obj.difficulty_score === "number" &&
        obj.difficulty_score >= 1 &&
        obj.difficulty_score <= 5
          ? obj.difficulty_score
          : 3,
    });
  }

  if (result.length === 0) {
    throw new Error("No valid questions in OpenAI HR response");
  }

  return result;
}

export async function generateFeedback(
  transcript: TranscriptEntry[],
  jobTitle: string,
  company: string,
): Promise<InterviewFeedback> {
  const openai = getClient();

  const conversationText = transcript
    .map((t) => `${t.role === "user" ? "Candidate" : "Interviewer"}: ${t.content}`)
    .join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an expert interview coach. Analyze the following interview transcript for a "${jobTitle}" position at "${company}" and provide detailed, constructive feedback.

Return JSON in this exact format:
{
  "overallScore": <number 1-5>,
  "summary": "<2-3 sentence overall assessment>",
  "categories": [
    { "name": "Technical Knowledge", "score": <1-5>, "feedback": "<2-3 sentences>" },
    { "name": "Communication Skills", "score": <1-5>, "feedback": "<2-3 sentences>" },
    { "name": "Problem Solving", "score": <1-5>, "feedback": "<2-3 sentences>" },
    { "name": "Depth of Understanding", "score": <1-5>, "feedback": "<2-3 sentences>" }
  ],
  "questionFeedback": [
    { "question": "<the question asked>", "score": <1-5>, "assessment": "<1-2 sentence assessment>" }
  ],
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "improvements": ["<area 1>", "<area 2>", ...]
}

Scoring guide:
- 1: Very Poor — no understanding demonstrated
- 2: Below Average — significant gaps, mostly incorrect
- 3: Average — some understanding, room for improvement
- 4: Good — solid understanding with minor gaps
- 5: Excellent — thorough, well-articulated, expert-level

Be specific and constructive. Reference actual answers from the transcript. Identify 2-4 strengths and 2-4 areas for improvement. For questionFeedback, include every question the interviewer asked.`,
      },
      {
        role: "user",
        content: conversationText,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty response for feedback");
  }

  const parsed = JSON.parse(content) as InterviewFeedback;

  // Basic validation
  if (
    typeof parsed.overallScore !== "number" ||
    !parsed.summary ||
    !Array.isArray(parsed.categories) ||
    !Array.isArray(parsed.strengths) ||
    !Array.isArray(parsed.improvements)
  ) {
    throw new Error("Feedback response did not match expected format");
  }

  return parsed;
}

export async function generateScoreSummary(
  questionScores: QuestionScore[],
  jobTitle: string,
  company: string,
): Promise<{ summary: string; strengths: string[]; improvements: string[] }> {
  const openai = getClient();

  const scoreLines = questionScores
    .map(
      (qs, i) =>
        `Q${i + 1}: "${qs.questionText}" — correctness=${qs.scores.correctness}, depth=${qs.scores.depth}, communication=${qs.scores.communication}, overall=${qs.overallScore.toFixed(2)} (${qs.category})`,
    )
    .join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an expert interview coach. Based on the per-question scores from a "${jobTitle}" interview at "${company}", provide a brief assessment.

Return JSON in this exact format:
{
  "summary": "<2-3 sentence overall assessment based on score patterns>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<area 1>", "<area 2>"]
}

Guidelines:
- summary: Reference specific score patterns (e.g., "consistently strong correctness but limited depth")
- strengths: 2-4 areas where scores were consistently high (>=3.5)
- improvements: 2-4 areas where scores were consistently low (<3.0)
- Be specific and constructive. Reference question topics where relevant.`,
      },
      {
        role: "user",
        content: scoreLines,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty response for score summary");
  }

  const parsed = JSON.parse(content) as {
    summary: string;
    strengths: string[];
    improvements: string[];
  };

  if (
    typeof parsed.summary !== "string" ||
    !Array.isArray(parsed.strengths) ||
    !Array.isArray(parsed.improvements)
  ) {
    throw new Error("Score summary response did not match expected format");
  }

  return parsed;
}

export interface HRInterviewEvaluation {
  communication: number;
  culturalFit: number;
  confidence: number;
  clarity: number;
  overallSuitability: number;
  recommendation: "hire" | "consider" | "reject";
  structuredFeedback: string;
  strengths: string[];
  improvements: string[];
  summary: string;
}

/**
 * Evaluate an HR screening interview transcript using LLM.
 * Returns structured feedback focused on soft skills and HR criteria.
 */
export async function evaluateHRInterview(
  transcript: TranscriptEntry[],
  jobTitle: string,
  company: string,
): Promise<HRInterviewEvaluation> {
  if (!transcript.length) {
    throw new Error("Cannot evaluate an empty transcript");
  }

  const openai = getClient();

  const conversationText = transcript
    .map((t) => `${t.role === "user" ? "Candidate" : "Interviewer"}: ${t.content}`)
    .join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an expert HR interviewer evaluating a candidate for the "${jobTitle}" position at "${company}". Analyze the interview transcript and provide a comprehensive HR screening assessment.

Return JSON in this exact format:
{
  "communication": <number 1-5>,
  "culturalFit": <number 1-5>,
  "confidence": <number 1-5>,
  "clarity": <number 1-5>,
  "overallSuitability": <number 1-5>,
  "recommendation": "<hire|consider|reject>",
  "structuredFeedback": "<2-3 paragraph detailed assessment>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "improvements": ["<area 1>", "<area 2>", ...],
  "summary": "<2-3 sentence executive summary>"
}

Evaluation Criteria:
1. Communication (1-5): How effectively the candidate articulates thoughts, uses professional language, and engages in dialogue
2. Cultural Fit (1-5): Alignment with typical workplace values, team orientation, and professional demeanor
3. Confidence (1-5): Self-assurance without arrogance, composure under questioning
4. Clarity (1-5): How clearly and concisely they answer questions, staying on topic
5. Overall Suitability (1-5): Holistic assessment for the HR screening stage

Recommendation Guidelines:
- "hire": Scores averaging 4+ with no major red flags. Candidate demonstrates strong soft skills and cultural alignment
- "consider": Scores averaging 3-4 with some concerns but potential. May need further evaluation
- "reject": Scores averaging below 3 or significant red flags in communication, professionalism, or fit

Scoring Guide:
- 1: Very Poor — significant concerns, unprofessional, or unable to communicate effectively
- 2: Below Average — notable gaps, needs substantial improvement
- 3: Average — meets basic expectations with room for improvement
- 4: Good — strong performance, minor areas to develop
- 5: Excellent — exceptional soft skills, highly recommended

Be specific and reference actual responses from the transcript. Identify 2-4 strengths and 2-4 areas for improvement.`,
      },
      {
        role: "user",
        content: conversationText,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty response for HR evaluation");
  }

  const parsed = JSON.parse(content) as HRInterviewEvaluation;

  // Validate required fields
  if (
    typeof parsed.communication !== "number" ||
    typeof parsed.culturalFit !== "number" ||
    typeof parsed.confidence !== "number" ||
    typeof parsed.clarity !== "number" ||
    typeof parsed.overallSuitability !== "number" ||
    !["hire", "consider", "reject"].includes(parsed.recommendation) ||
    typeof parsed.structuredFeedback !== "string" ||
    typeof parsed.summary !== "string" ||
    !Array.isArray(parsed.strengths) ||
    !Array.isArray(parsed.improvements)
  ) {
    throw new Error("HR evaluation response did not match expected format");
  }

  return parsed;
}
