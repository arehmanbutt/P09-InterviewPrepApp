import mammoth from "mammoth";

/**
 * Parse a PDF file buffer and extract text
 */
async function parsePDF(buffer: Buffer): Promise<string> {
  // Import the core parser directly to avoid the test file loading bug in pdf-parse index.js
  // @ts-expect-error - pdf-parse doesn't export types for internal lib
  const pdfParse = (await import("pdf-parse/lib/pdf-parse")).default;
  const data = await pdfParse(buffer);
  return data.text;
}

export interface ResumeData {
  name: string;
  email?: string;
  phone?: string;
  summary?: string;
  skills: string[];
  experience: Array<{
    title: string;
    company: string;
    duration?: string;
    description: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year?: string;
  }>;
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
  }>;
  certifications: string[];
  languages: string[];
}

/**
 * Parse a DOCX file buffer and extract text
 */
async function parseDOCX(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

/**
 * Extracts text from a resume file based on its MIME type
 */
export async function extractTextFromResume(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    return parsePDF(buffer);
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return parseDOCX(buffer);
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

/**
 * Uses OpenAI to parse raw resume text into structured data
 */
export async function parseResumeWithAI(rawText: string): Promise<ResumeData> {
  const { getClient } = await import("./openai");
  const openai = getClient();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an expert resume parser. Extract structured information from the resume text provided. Be thorough but only include information that is actually present in the resume.

Return JSON in this exact format:
{
  "name": "Full name of the candidate",
  "email": "email@example.com or null if not found",
  "phone": "phone number or null if not found",
  "summary": "Professional summary/objective if present, or null",
  "skills": ["skill1", "skill2", "..."],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "e.g., Jan 2020 - Present",
      "description": "Brief description of responsibilities and achievements"
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "University/School Name",
      "year": "Graduation year or null if not found"
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "What the project does",
      "technologies": ["tech1", "tech2"]
    }
  ],
  "certifications": ["certification1", "certification2"],
  "languages": ["English", "Spanish", "etc."]
}

Rules:
- Only include information that is explicitly stated in the resume
- For skills, extract both technical and soft skills mentioned
- For projects, include personal, academic, and professional projects
- If a section is not found, use an empty array or null as appropriate
- Normalize skill names (e.g., "ReactJS" and "React.js" should both be "React")
- Extract all relevant technologies from project descriptions`,
      },
      {
        role: "user",
        content: rawText,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty response for resume parsing");
  }

  let parsed: ResumeData;
  try {
    parsed = JSON.parse(content) as ResumeData;
  } catch {
    throw new Error("Failed to parse AI response as valid JSON");
  }

  // Validate and provide defaults
  return {
    name: parsed.name ?? "Unknown",
    email: parsed.email ?? undefined,
    phone: parsed.phone ?? undefined,
    summary: parsed.summary ?? undefined,
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    experience: Array.isArray(parsed.experience) ? parsed.experience : [],
    education: Array.isArray(parsed.education) ? parsed.education : [],
    projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
    languages: Array.isArray(parsed.languages) ? parsed.languages : [],
  };
}

/**
 * Complete resume parsing pipeline: extract text and parse into structured data
 */
export async function parseResume(buffer: Buffer, mimeType: string): Promise<ResumeData> {
  const rawText = await extractTextFromResume(buffer, mimeType);

  if (!rawText || rawText.trim().length < 50) {
    throw new Error(
      "Could not extract sufficient text from the resume. Please ensure the file is readable.",
    );
  }

  return parseResumeWithAI(rawText);
}

/**
 * Formats resume data into a prompt-friendly string for LLM context
 */
export function formatResumeForPrompt(resumeData: ResumeData): string {
  const sections: string[] = [];

  sections.push(`CANDIDATE: ${resumeData.name}`);

  if (resumeData.summary) {
    sections.push(`\nPROFESSIONAL SUMMARY:\n${resumeData.summary}`);
  }

  if (resumeData.skills.length > 0) {
    sections.push(`\nSKILLS:\n${resumeData.skills.join(", ")}`);
  }

  if (resumeData.experience.length > 0) {
    const expLines = resumeData.experience.map(
      (exp) =>
        `- ${exp.title} at ${exp.company}${exp.duration ? ` (${exp.duration})` : ""}: ${exp.description}`,
    );
    sections.push(`\nEXPERIENCE:\n${expLines.join("\n")}`);
  }

  if (resumeData.education.length > 0) {
    const eduLines = resumeData.education.map(
      (edu) => `- ${edu.degree} from ${edu.institution}${edu.year ? ` (${edu.year})` : ""}`,
    );
    sections.push(`\nEDUCATION:\n${eduLines.join("\n")}`);
  }

  if (resumeData.projects.length > 0) {
    const projLines = resumeData.projects.map(
      (proj) =>
        `- ${proj.name}: ${proj.description} [Technologies: ${proj.technologies.join(", ")}]`,
    );
    sections.push(`\nPROJECTS:\n${projLines.join("\n")}`);
  }

  if (resumeData.certifications.length > 0) {
    sections.push(`\nCERTIFICATIONS:\n${resumeData.certifications.join(", ")}`);
  }

  return sections.join("\n");
}
