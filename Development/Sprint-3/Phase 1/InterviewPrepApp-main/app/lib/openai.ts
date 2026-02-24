import OpenAI from "openai";
import type { TranscriptEntry, InterviewFeedback } from "app/models/Interview";
import type { QuestionScore } from "./types";
import type { IPoolQuestion } from "./types";

export interface GeneratedQuestion {
  text: string;
  topic: string;
}

let client: OpenAI | null = null;

function getClient(): OpenAI {
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
): Promise<IPoolQuestion[]> {
  const openai = getClient();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an expert technical interviewer. Generate exactly ${count} open-ended interview questions for a voice interview. Each question should cover a different skill area relevant to the job. Vary difficulty from 1 (basic) to 5 (expert).

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
- Questions should be suitable for a verbal/voice interview (not coding exercises)`,
      },
      {
        role: "user",
        content: `Job Title: ${jobTitle}\n\nJob Description: ${jobDescription}`,
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
