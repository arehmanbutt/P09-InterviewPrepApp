import express from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import Transcript from "../models/Transcript.js";
import Question from "../models/Question.js";
import Interview from "../models/Interview.js";
import { scoreResponses } from "../lib/scoringResponse.js"
import { config } from "dotenv";
config({ path: "./back.env" });

const router = express.Router();

// function verifyWebhook(req, res, next) {
//   const secret = process.env.WEBHOOK_SECRET;
//   if (!secret) {
//     console.warn("WEBHOOK_SECRET not set — webhook verification disabled.");
//     return next();
//   }
//   // console.log("Verifying webhook request...");
//   // console.log("HEADER: ", req.headers);

//   console.log("Verifying webhook with secret:", secret ? "SET" : "NOT SET");
//   // Raw body is needed for HMAC verification
//   const rawBody = req.rawBody;
//   // console.log("Raw body preview:", rawBody.slice(0,200));
//   console.log("RAW BODY TYPE:", typeof req.rawBody);
//   console.log("RAW BODY LENGTH:", req.rawBody?.length);
//   // console.log("raw body is:", rawBody);
  
//   const signature = req.headers["elevenlabs-signature"] || req.headers["x-elevenlabs-signature"];
//   console.log("signature is:", signature);
//   if (!signature) {
//     return res.status(401).json({ ok: false, message: "Missing webhook signature" });
//   }

//   const computed = crypto
//     .createHmac("sha256", secret)
//     .update(rawBody, "utf-8")
//     .digest("hex");

//   console.log("computed signature:", computed);
//   if (computed===signature) {
//     console.log("Webhook verified successfully");
//     // return next();
//   }
//   if (computed !== signature) {
//     return res.status(401).json({ ok: false, message: "Webhook verification failed" });
//   }

//   console.log("Webhook verified successfully");
//   return next();
// }
// agentRoutes.js (or middleware/verifyWebhook.js)

export function verifyWebhook(req, res, next) {
  try {
    const secret = process.env.WEBHOOK_SECRET?.trim();
    if (!secret) {
      console.error("WEBHOOK_SECRET not set");
      return res.status(500).send("WEBHOOK_SECRET missing");
    }

    const sigHeader = req.headers["elevenlabs-signature"];
    if (!sigHeader) {
      console.error("Missing signature header");
      return res.status(400).send("Missing signature");
    }

    // Example: t=1763812856,v0=abcd1234...
    const parts = sigHeader.split(",");
    const timestampPart = parts.find((p) => p.startsWith("t="));
    const signaturePart = parts.find((p) => p.startsWith("v0="));

    if (!timestampPart || !signaturePart) {
      console.error("Invalid signature header format");
      return res.status(400).send("Invalid signature format");
    }

    const timestamp = timestampPart.replace("t=", "");
    const signatureHex = signaturePart.replace("v0=", "");

    const raw = req.rawBody;
    if (!raw) {
      console.error("Missing rawBody");
      return res.status(400).send("Missing rawBody");
    }

    // correct Stripe-style payload
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
      console.error("❌ Signature mismatch");
      return res.status(401).send("Invalid signature");
    }

    console.log("✅ Signature verified");

    // parse JSON
    req.body = JSON.parse(raw.toString("utf8"));

    next();
  } catch (err) {
    console.error("verifyWebhook error:", err);
    return res.status(500).send("Webhook verification error");
  }
}

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
  transcriptDoc.fullTranscript.push({ role, text, meta, timestamp: new Date() });
  transcriptDoc.updatedAt = new Date();
  await transcriptDoc.save();
}

async function upsertPerQuestion(transcriptDoc, questionId, utterances = []) {
  const qid = String(questionId);
  let entry = transcriptDoc.perQuestion.find(p => String(p.question_id) === qid);
  if (!entry) {
    entry = {
      question_id: qid,
      combined_text: "",
      savedAt: new Date(),
      rawUtterances: []
    };
    transcriptDoc.perQuestion.push(entry);
  }

  for (const u of utterances) {
    if (!u.role || u.role === "user") {
      entry.rawUtterances.push({ role: 'user', text: u.text || "", timestamp: u.timestamp || new Date(), meta: u.meta || {} });
    }
  }
  entry.combined_text = entry.rawUtterances.map(r => r.text.trim()).filter(Boolean).join(" ").trim();
  entry.savedAt = new Date();

  transcriptDoc.updatedAt = new Date();
  await transcriptDoc.save();

  return entry;
}

// top-level in your agentRoutes.js
const convToInterview = new Map(); // conv -> interview (in-memory)

router.post('/:id/register-conversation', async (req, res) => {
  try {
    console.log("registering conversation endpoint hit")
    const interviewIdentifier = req.params.id; // your interview id you returned to frontend
    console.log('[mapping] registering conversation for interview', interviewIdentifier);
    const { conversationId } = req.body || {};
    console.log('[mapping] conversationId:', conversationId);
    if (!conversationId) return res.status(400).json({ ok:false, message:'missing conversationId' });
    convToInterview.set(String(conversationId), String(interviewIdentifier));
    console.log('[mapping] mapped', conversationId, '->', interviewIdentifier);
    return res.json({ ok:true });
  } catch (err) {
    console.error('register-conversation error', err);
    return res.status(500).json({ ok:false, error: String(err) });
  }
});


router.post("/save-question", verifyWebhook, async (req, res) => {
  try {
    console.log("HEADER: ", req.headers);
    const body = req.body || {};
    const parameters = body.parameters || body.input || body.data || {};
    const metadata = body.metadata || {};
    const interviewId = metadata?.interviewId || body?.interviewId || body?.metadata?.interviewId;
    const rawQ = parameters?.question_id ?? parameters?.questionId ?? parameters?.id;
    const transcriptText = parameters?.transcript ?? parameters?.text ?? parameters?.answer ?? body?.transcript;

    console.log("SAVING QUESTION IN BACKEND")

    if (!interviewId || !rawQ || !transcriptText) {
      return res.status(400).json({ ok: false, message: "Missing interviewId, question_id or transcript" });
    }

    console.log("saving question id: ", interviewId, rawQ);
    console.log("transcript text:", transcriptText?.slice(0, 100));

    const qid = String(rawQ);
    const tdoc = await ensureTranscriptDoc(interviewId, body);

    await pushUtterance(tdoc, "user", transcriptText, { source: "tool" });
    const perQ = await upsertPerQuestion(tdoc, qid, [{ role: "user", text: transcriptText, timestamp: new Date() }]);

    return res.status(200).json({ ok: true, saved: true, question_id: qid, combined_text: perQ.combined_text });
  } catch (err) {
    console.error("save-question webhook error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

router.post("/finish-interview", verifyWebhook, async (req, res) => {
  try {
    const body = req.body || {};
    const metadata = body.metadata || {};
    const interviewId = metadata?.interviewId || body?.interviewId || body?.metadata?.interviewId;
    if (!interviewId) return res.status(400).json({ ok: false, message: "Missing interviewId" });

    const tdoc = await ensureTranscriptDoc(interviewId, body);
    tdoc.status = "finalized";
    await tdoc.save();

    return res.status(200).json({ ok: true, message: "Transcript finalized" });
  } catch (err) {
    console.error("finish-interview webhook error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

function parseTranscriptToPerQuestion(transcriptArr, hints) {
  const map = new Map();
  let currentQid = null;
  let buffer = [];

  for (const item of transcriptArr) {
    if (item.role === 'agent') {
      const agentText = (item.text || "").toLowerCase();
      const matched = hints.find(h => h.text && agentText.includes((h.text || "").toLowerCase().slice(0, 60)));
      if (matched) {
        // flush previous
        if (currentQid && buffer.length) {
          const combined = buffer.map(b => b.text).join(" ").trim();
          map.set(currentQid, (map.get(currentQid) || "") + " " + combined);
          buffer = [];
        }
        currentQid = matched.id;
        continue;
      } else {
        // no match — ignore
        continue;
      }
    } else if (item.role === 'user') {
      if (!currentQid) continue; // user message before any question match
      buffer.push({ text: item.text || "" });
    }
  }

  // flush last
  if (currentQid && buffer.length) {
    const combined = buffer.map(b => b.text).join(" ").trim();
    map.set(currentQid, (map.get(currentQid) || "") + " " + combined);
  }

  return Array.from(map.entries()).map(([qid, txt]) => ({ question_id: qid, response: (txt || "").trim() }));
}

router.post("/post-call-transcript", verifyWebhook, async (req, res) => {
  try {
    // robust extraction supporting ElevenLabs payload shape

    const payload = req.body || {};
    const data = payload.data || {};

    const interviewId = data.conversation_initiation_client_data.dynamic_variables.interviewId

    // console.log("interview id verified:", interviewId);
    // console.log("interview id type:", typeof interviewId);

    let interview = null;
    if (interviewId) {
      interview = await Interview.findOne({ interviewId: interviewId }).lean();
      if (!interview) {
        interview = await Interview.findById(interviewId).lean();
      }
    }

    if (!interview) {
      console.warn("Interview not found");
      return res.status(404).json({ ok: false, message: "Interview not found" });
    } 

    const ids = (Array.isArray(interview.selectedQuestions) 
      ? interview.selectedQuestions 
      : []
    ).map(id => String(id));

    console.log('SELECTED IDS: ', ids);

    if (ids.length === 0) {
      return res.json({ ok: false, message: "No selected questions in interview to parse against" });
    }

    const answersArray = Array.isArray(interview.answers) ? interview.answers : [];
    console.log("Answers array:", answersArray.slice(0,2));
    if (answersArray.length === 0) {
      console.log("No answers found in interview");
    } 
    
    const idToDoc = new Map(
      answersArray.map(a => [String(a.question_id), {
        question_id: String(a.question_id),
        question_title: a.question_title ?? '',
        question_text: a.question_text ?? '',
        answer_text: a.answer_text ?? '',
      }])
    );

    let ordered = [];
    if (ids.length) {
      ordered = ids.map(id => idToDoc.get(String(id))).filter(Boolean);
    } else {
      ordered = answersArray.map(a => idToDoc.get(String(a.question_id))).filter(Boolean);
    }

    const rawTranscript = data?.transcript || [];

    const transcriptArr = Array.isArray(rawTranscript) ? rawTranscript :
                          rawTranscript ? [rawTranscript] : [];

    if (!interviewId || transcriptArr.length === 0) {
      console.error("post-call-transcript: missing interviewId or transcript array", {
        interviewId, transcriptLength: transcriptArr.length, keys: Object.keys(payload)
      });
      return res.status(400).json({ ok: false, message: "Missing interviewId or transcript array" });
    }

    const tdoc = await ensureTranscriptDoc(interviewId, payload);

    const cleanedTranscript = transcriptArr
      .map((m, index) => {
        const text =
          (m.text || m.content || m.message || m.transcript || "")
            ?.toString()
            ?.trim();

        if (!text) {
          console.warn(
            "[post-call-transcript] Skipping empty transcript item at index",
            index,
            "raw:",
            m
          );
          return null; 
        }

        return {
          role: (m.role || (m.speaker ? m.speaker.toLowerCase() : "user")),
          text,
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          meta: m.meta || m
        };
      })
    .filter(Boolean); 

    tdoc.fullTranscript = cleanedTranscript;
    console.log("ABOUT TO SAVE TDOC with transcript:", tdoc.fullTranscript);

    tdoc.providerPayload = payload;
    tdoc.status = "finalized";
    // await tdoc.save();

    let questionHints = [];
    if (Array.isArray(ids) && ids.length) {
      questionHints = ordered.map(q => ({ id: String(q.question_id), text: (q.question_text || q.question_title || '').slice(0, 300) }));
    }

    const parsed = parseTranscriptToPerQuestion(tdoc.fullTranscript, questionHints);
    console.log("Parsed per-question responses:", parsed);
    for (const p of parsed) {
      await upsertPerQuestion(tdoc, p.question_id, [{ role: "user", text: p.response }]);
    }

    const scoringResult = await scoreResponses({
      ordered,         // your array of questions+expected+response
      DEBUG: false,
      sequential: true // keep true to avoid hitting rate limits
    });

    console.log('scoringResult.aggregateOverall', scoringResult.aggregateOverall);
    for (const it of scoringResult.items) {
      // each item has `.score` with structure returned above
      console.log(it.question_id, it.score.overall_score, it.score.missed_points);
    }

    if(tdoc && scoringResult.aggregateOverall != null) {
      tdoc.overallScore = scoringResult.aggregateOverall;
      
      for (const item of scoringResult.items) {
        const pq = tdoc.perQuestion.find(q => String(q.question_id) === String(item.question_id));
        if (pq) {
          pq.score = item.score;
        }
      }

      await tdoc.save();
      console.log("Saved scoring into transcript.");
    }

    console.log("SUCCESS")

    return res.status(200).json({ ok: true, message: "Full transcript saved", parsedCount: parsed.length });
  } catch (err) {
    console.error("post-call-transcript webhook error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

router.get("/transcripts/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ ok: false, message: "Missing id param" });

    let tdoc = await Transcript.findOne({ interviewId: id }).lean();
    if (!tdoc) {
      try {
        tdoc = await Transcript.findById(id).lean();
      } catch (e) { }
    }

    if (!tdoc) {
      return res.json({ ok: true, transcript: null });
    }

    return res.json({ ok: true, transcript: tdoc });

  } catch (err) {
    console.error("GET /transcripts/:id error", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
