import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { Resend } from "resend";
import { getAuthUserId } from "app/lib/auth";
import { connectDB } from "app/lib/mongodb";
import Interview from "app/models/Interview";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAILS = 50;

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

function parseEmails(raw: string): string[] {
  const parts = raw
    .split(/[\n,]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => EMAIL_REGEX.test(e));
  return [...new Set(parts)];
}

/** Escape characters that have special meaning in HTML to prevent injection. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildEmailHtml(params: {
  interviewTitle: string;
  company: string;
  joinUrl: string;
}): string {
  const interviewTitle = escapeHtml(params.interviewTitle);
  const company = escapeHtml(params.company);
  // joinUrl is derived from a server-generated shareToken — escape as defence-in-depth
  const joinUrl = escapeHtml(params.joinUrl);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Interview Invitation</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:ui-sans-serif,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#18181b;padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;letter-spacing:-0.02em;">
                InterviewPrep
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 12px;color:#18181b;font-size:22px;font-weight:600;">
                You&rsquo;ve been invited to interview
              </h2>
              <p style="margin:0 0 8px;color:#52525b;font-size:15px;line-height:1.6;">
                <strong style="color:#18181b;">${company}</strong> has invited you to complete an interview for the following role:
              </p>
              <p style="margin:0 0 32px;color:#18181b;font-size:17px;font-weight:600;">
                ${interviewTitle}
              </p>
              <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6;">
                Click the button below to begin your interview. The process is AI-powered, recorded, and should take around 20&ndash;30 minutes.
              </p>
              <!-- CTA -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px;background:#18181b;">
                    <a href="${joinUrl}"
                       style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
                      Start Interview &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 0;color:#a1a1aa;font-size:13px;line-height:1.6;">
                Or copy this link into your browser:<br />
                <a href="${joinUrl}" style="color:#52525b;word-break:break-all;">${joinUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #f4f4f5;">
              <p style="margin:0;color:#a1a1aa;font-size:12px;">
                This invitation was sent by InterviewPrep. If you were not expecting this email, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid interview ID" }, { status: 400 });
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("emails" in body) ||
    !Array.isArray((body as Record<string, unknown>).emails)
  ) {
    return NextResponse.json(
      { error: "Request body must contain an `emails` array" },
      { status: 400 },
    );
  }

  const rawEmails = ((body as Record<string, unknown>).emails as unknown[])
    .filter((e): e is string => typeof e === "string")
    .join(",");

  const emails = parseEmails(rawEmails);

  if (emails.length === 0) {
    return NextResponse.json({ error: "No valid email addresses provided" }, { status: 400 });
  }

  if (emails.length > MAX_EMAILS) {
    return NextResponse.json(
      { error: `Cannot send more than ${MAX_EMAILS} invitations at once` },
      { status: 400 },
    );
  }

  await connectDB();

  const interview = await Interview.findOne({ _id: id, userId }).lean();

  if (!interview) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }

  if (!interview.isMassInterview) {
    return NextResponse.json(
      { error: "Email invitations are only available for mass interviews" },
      { status: 400 },
    );
  }

  if (!interview.shareToken) {
    return NextResponse.json(
      { error: "This interview does not have a share link yet" },
      { status: 400 },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${request.headers.get("host") ?? ""}`;
  const joinUrl = `${appUrl}/join/${interview.shareToken}`;
  // Use RESEND_FROM_EMAIL if set (requires a verified domain in Resend dashboard).
  // Falls back to Resend's shared sandbox address which works without domain verification.
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

  const resend = new Resend(process.env.RESEND_API_KEY);

  const sent: string[] = [];
  const failed: string[] = [];

  // Send emails individually so partial failures don't block the whole batch
  await Promise.all(
    emails.map(async (email) => {
      try {
        const { error } = await resend.emails.send({
          from: fromEmail,
          to: email,
          subject: `You're invited to interview for ${interview.title} at ${interview.company}`,
          html: buildEmailHtml({
            interviewTitle: interview.title,
            company: interview.company,
            joinUrl,
          }),
        });

        if (error) {
          console.error(`Resend error for ${email}:`, error);
          failed.push(email);
        } else {
          sent.push(email);
        }
      } catch (err) {
        console.error(`Failed to send invite to ${email}:`, err);
        failed.push(email);
      }
    }),
  );

  return NextResponse.json({ sent: sent.length, failed });
}
