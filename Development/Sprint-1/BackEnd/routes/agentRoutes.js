import express from "express";
import crypto from "node:crypto";
import Transcript from "../models/Transcript.js";
import Interview from "../models/Interview.js";
import { scoreResponses } from "../lib/scoringResponse.js";
import { config } from "dotenv";

config({ path: "./back.env" });

const router = express.Router();

/* --------------------------
   Webhook Verification
-------------------------- */
export function verifyWebhook(req, res, next) {
  try {
    const secret = process.env.WEBHOOK_SECRET?.trim();
    if (!secret) return res.status(500).send("WEBHOOK_SECRET missing");

    const sigHeader = req.headers["elevenlabs-signature"];
    if (!sigHeader) return res.status(400).send("Missing signature");

    const parts = sigHeader.split(",");
    const timestampPart = parts.find((p) => p.startsWith("t="));
    const signaturePart = parts.find((p) => p.startsWith("v0="));
    if (!timestampPart || !signaturePart)
      return res.status(400).send("Invalid signature format");

    const timestamp = timestampPart.replace("t=", "");
    const signatureHex = signaturePart.replace("v0=", "");

    const raw = req.rawBody;
    if (!raw) return res.status(400).send("Missing rawBody");

    const payload = `${timestamp}.${raw.toString()}`;
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload);
    const computedHex = hmac.digest("hex");

    const headerBuf = Buffer.from(signatureHex, "hex");
    const computedBuf = Buffer.from(computedHex, "hex");

    if (
      headerBuf.length !== computedBuf.length ||
      !crypto.timingSafeEqual(headerBuf, computedBuf)
    ) {
      return res.status(401).send("Invalid signature");
    }

    req.body = JSON.parse(raw.toString("utf8"));
    next();
  } catch (err) {
    console.error("verifyWebhook error:", err);
    return res.status(500).send("Webhook verification error");
  }
}

/* --------------------------
   Transcript Helpers
-------------------------- */
async function ensureTranscriptDoc(interviewId, providerPayload = {}) {
  let t = await Transcript.findOne({ interviewId });
  if (!t) {
    t = new Transcript({ interviewId, providerPayload, status: "in-progress" });
    await t.save();
    return t;
  }

  if (!t.providerPayload || Object.keys(t.providerPayload).length === 0) {
    t.providerPayload = providerPayload;
    await t.save();
  }

  return t;
}

async function pushUtterance(transcriptDoc, role, text, meta = {}) {
  transcriptDoc.fullTranscript.push({
    role,
    text,
    meta,
    timestamp: new Date(),
  });
  transcriptDoc.updatedAt = new Date();
  await transcriptDoc.save();
}

async function upsertPerQuestion(transcriptDoc, questionId, utterances = []) {
  const qid = String(questionId);
  let entry = transcriptDoc.perQuestion.find(
    (p) => String(p.question_id) === qid
  );

  if (!entry) {
    entry = {
      question_id: qid,
      combined_text: "",
      savedAt: new Date(),
      rawUtterances: [],
    };
    transcriptDoc.perQuestion.push(entry);
  }

  for (const u of utterances) {
    if (!u.role || u.role === "user") {
      entry.rawUtterances.push({
        role: "user",
        text: u.text || "",
        timestamp: u.timestamp || new Date(),
        meta: u.meta || {},
      });
    }
  }

  entry.combined_text = entry.rawUtterances
    .map((r) => r.text.trim())
    .filter(Boolean)
    .join(" ")
    .trim();
  entry.savedAt = new Date();
  transcriptDoc.updatedAt = new Date();
  await transcriptDoc.save();
  return entry;
}

/* --------------------------
   In-Memory Map
-------------------------- */
const convToInterview = new Map();

/* --------------------------
   Routes
-------------------------- */

// Register conversation
router.post("/:id/register-conversation", async (req, res) => {
  try {
    const interviewIdentifier = req.params.id;
    const { conversationId } = req.body || {};
    if (!conversationId)
      return res
        .status(400)
        .json({ ok: false, message: "missing conversationId" });

    convToInterview.set(String(conversationId), String(interviewIdentifier));
    return res.json({ ok: true });
  } catch (err) {
    console.error("register-conversation error", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// Save single question
router.post("/save-question", verifyWebhook, async (req, res) => {
  try {
    const body = req.body || {};
    const parameters = body.parameters || body.input || body.data || {};
    const metadata = body.metadata || {};

    const interviewId =
      metadata?.interviewId || body?.interviewId || body?.metadata?.interviewId;
    const rawQ =
      parameters?.question_id ?? parameters?.questionId ?? parameters?.id;
    const transcriptText =
      parameters?.transcript ??
      parameters?.text ??
      parameters?.answer ??
      body?.transcript;

    if (!interviewId || !rawQ || !transcriptText)
      return res.status(400).json({
        ok: false,
        message: "Missing interviewId, question_id or transcript",
      });

    const qid = String(rawQ);
    const tdoc = await ensureTranscriptDoc(interviewId, body);
    await pushUtterance(tdoc, "user", transcriptText, { source: "tool" });
    const perQ = await upsertPerQuestion(tdoc, qid, [
      { role: "user", text: transcriptText, timestamp: new Date() },
    ]);

    return res.status(200).json({
      ok: true,
      saved: true,
      question_id: qid,
      combined_text: perQ.combined_text,
    });
  } catch (err) {
    console.error("save-question webhook error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// Finish interview
router.post("/finish-interview", verifyWebhook, async (req, res) => {
  try {
    const body = req.body || {};
    const metadata = body.metadata || {};
    const interviewId =
      metadata?.interviewId || body?.interviewId || body?.metadata?.interviewId;

    if (!interviewId)
      return res
        .status(400)
        .json({ ok: false, message: "Missing interviewId" });

    const tdoc = await ensureTranscriptDoc(interviewId, body);
    tdoc.status = "finalized";
    await tdoc.save();

    return res.status(200).json({ ok: true, message: "Transcript finalized" });
  } catch (err) {
    console.error("finish-interview webhook error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

/* --------------------------
   Parsing Helpers
-------------------------- */
function parseTranscriptToPerQuestion(transcriptArr, hints) {
  const map = new Map();
  let currentQid = null;
  let buffer = [];

  const flushBuffer = () => {
    if (currentQid && buffer.length) {
      const text = buffer
        .map((b) => b.text)
        .join(" ")
        .trim();
      map.set(currentQid, (map.get(currentQid) || "") + " " + text);
      buffer = [];
    }
  };

  for (const item of transcriptArr) {
    if (item.role === "agent") {
      const agentText = (item.text || "").toLowerCase();
      const matched = hints.find(
        (h) =>
          h.text &&
          agentText.includes((h.text || "").toLowerCase().slice(0, 60))
      );
      if (matched) {
        flushBuffer();
        currentQid = matched.id;
      }
      continue;
    }
    if (item.role === "user" && currentQid)
      buffer.push({ text: item.text || "" });
  }

  flushBuffer();

  return Array.from(map.entries()).map(([qid, txt]) => ({
    question_id: qid,
    response: (txt || "").trim(),
  }));
}

/* --------------------------
   Helpers for refactored post-call logic
-------------------------- */

function extractTranscriptArray(rawTranscript) {
  if (Array.isArray(rawTranscript)) return rawTranscript;
  if (rawTranscript) return [rawTranscript];
  return [];
}

function cleanTranscriptMessages(arr) {
  return arr
    .map((m) => {
      const text = (m.text || m.content || m.message || m.transcript || "")
        ?.toString()
        ?.trim();
      if (!text) return null;
      return {
        role: m.role || (m.speaker ? m.speaker.toLowerCase() : "user"),
        text,
        timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
        meta: m.meta || m,
      };
    })
    .filter(Boolean);
}

function createQuestionHints(ids, ordered) {
  if (!ids.length) return [];
  return ordered.map((q) => ({
    id: String(q.question_id),
    text: (q.question_text || q.question_title || "").slice(0, 300),
  }));
}

/* --------------------------
   Post-call transcript (Refactored)
-------------------------- */
router.post("/post-call-transcript", verifyWebhook, async (req, res) => {
  try {
    const payload = req.body || {};
    const data = payload.data || {};

    const interviewId =
      data?.conversation_initiation_client_data?.dynamic_variables?.interviewId;
    if (!interviewId)
      return res
        .status(400)
        .json({ ok: false, message: "Missing interviewId" });

    // ---- Fetch interview
    let interview =
      (await Interview.findOne({ interviewId }).lean()) ||
      (await Interview.findById(interviewId).lean());

    if (!interview)
      return res
        .status(404)
        .json({ ok: false, message: "Interview not found" });

    // ---- Prepare IDs
    const ids = Array.isArray(interview.selectedQuestions)
      ? interview.selectedQuestions.map(String)
      : [];

    const answersArray = Array.isArray(interview.answers)
      ? interview.answers
      : [];

    const idToDoc = new Map(
      answersArray.map((a) => [
        String(a.question_id),
        {
          question_id: String(a.question_id),
          question_title: a.question_title ?? "",
          question_text: a.question_text ?? "",
          answer_text: a.answer_text ?? "",
        },
      ])
    );

    const ordered = ids.length
      ? ids.map((id) => idToDoc.get(id)).filter(Boolean)
      : answersArray
          .map((a) => idToDoc.get(String(a.question_id)))
          .filter(Boolean);

    // ---- Extract transcript array (nested ternary removed)
    const transcriptArr = extractTranscriptArray(data?.transcript);
    if (!transcriptArr.length)
      return res
        .status(400)
        .json({ ok: false, message: "Missing transcript array" });

    // ---- Clean transcript
    const cleanedTranscript = cleanTranscriptMessages(transcriptArr);

    // ---- Load transcript document
    const tdoc = await ensureTranscriptDoc(interviewId, payload);
    tdoc.fullTranscript = cleanedTranscript;
    tdoc.providerPayload = payload;
    tdoc.status = "finalized";

    // ---- Create hints
    const questionHints = createQuestionHints(ids, ordered);

    // ---- Parse transcript
    const parsed = parseTranscriptToPerQuestion(
      tdoc.fullTranscript,
      questionHints
    );

    // ---- Save per-question responses
    for (const p of parsed) {
      await upsertPerQuestion(tdoc, p.question_id, [
        { role: "user", text: p.response },
      ]);
    }

    // ---- Score
    const scoringResult = await scoreResponses({
      ordered,
      DEBUG: false,
      sequential: true,
    });

    if (scoringResult.aggregateOverall != null) {
      tdoc.overallScore = scoringResult.aggregateOverall;

      for (const item of scoringResult.items) {
        const pq = tdoc.perQuestion.find(
          (q) => String(q.question_id) === String(item.question_id)
        );
        if (pq) pq.score = item.score;
      }

      await tdoc.save();
    }

    return res.status(200).json({
      ok: true,
      message: "Full transcript saved",
      parsedCount: parsed.length,
    });
  } catch (err) {
    console.error("post-call-transcript webhook error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

//  Get Transcript
router.get("/transcripts/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!id)
      return res.status(400).json({ ok: false, message: "Missing id param" });

    let tdoc = await Transcript.findOne({ interviewId: id }).lean();
    if (!tdoc) tdoc = await Transcript.findById(id).lean();

    return res.json({ ok: true, transcript: tdoc || null });
  } catch (err) {
    console.error("GET /transcripts/:id error", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
