import { NextResponse } from "next/server";
import { getAuthUserId } from "app/lib/auth";
import { checkFeature, incrementUsage } from "app/lib/subscription/gate";
import { parseResume } from "app/lib/resumeParser";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resume parsing requires Pro or Business tier
  const canParse = await checkFeature(userId, "resumeParsing");
  if (!canParse) {
    return NextResponse.json(
      { error: "Resume parsing requires a Pro or Business plan", upgrade: true },
      { status: 403 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a PDF or DOCX file." },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File is too large. Maximum size is 5MB." },
        { status: 400 },
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse the resume
    const resumeData = await parseResume(buffer, file.type);

    await incrementUsage(userId, "resumeParses");

    return NextResponse.json({ resumeData });
  } catch (error) {
    console.error("Resume parsing error:", error);
    const message = error instanceof Error ? error.message : "Failed to parse resume";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
