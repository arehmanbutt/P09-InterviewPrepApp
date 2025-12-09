import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { clerkClient } from "@clerk/clerk-sdk-node";
import Question from "../models/Question.js";
import Interview from "../models/Interview.js";
import { selectQuestions } from "../lib/selectQuestions.js";

const router = express.Router();

/// Fetch user interviews
router.get("/user/interviews", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized - No token" });
    }
    const token = authHeader.split("Bearer ")[1].trim();
    const verified = await clerkClient.verifyToken(token);
    const owner = verified.sub;

    const interviews = await Interview.find({ owner })
      .sort({ date: -1 })
      .lean();

    return res.json({
      ok: true,
      interviews: interviews.map((interview) => ({
        id: interview.interviewId,
        title: interview.parameters?.jobTitle || "Untitled Interview",
        company: interview.parameters?.company || "",
        date: interview.date,
        status: interview.status,
      })),
    });
  } catch (error) {
    console.error("Error fetching user interviews:", error);
    return res
      .status(500)
      .json({ ok: false, message: "Server error", error: error.message });
  }
});

/// Fetch user stats (total interviews)
router.get("/user/stats", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized - No token" });
    }
    const token = authHeader.split("Bearer ")[1].trim();
    const verified = await clerkClient.verifyToken(token);
    const owner = verified.sub;

    const total = await Interview.countDocuments({ owner });

    return res.json({ ok: true, stats: { total } });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return res
      .status(500)
      .json({ ok: false, message: "Server error", error: error.message });
  }
});

/// Import QAs from JSON
router.post("/import-qas", async (req, res) => {
  try {
    const filePath = path.join(process.cwd(), "paraphrased_qas.json");
    const raw = await fs.readFile(filePath, "utf8");
    const items = JSON.parse(raw);

    if (!Array.isArray(items)) {
      return res
        .status(400)
        .json({ message: "Invalid JSON: expected an array" });
    }

    const ops = items.map((it) => {
      const filter =
        it.question_id !== undefined && it.question_id !== null
          ? { question_id: it.question_id }
          : { question_text: it.question_text };

      return {
        updateOne: {
          filter,
          update: {
            $set: {
              question_id: it.question_id ? String(it.question_id) : null,
              question_title: it.question_title || "",
              question_text: it.question_text,
              answer_text: it.answer_text,
              tags: it.tags || [],
            },
            $setOnInsert: { createdAt: new Date() },
          },
          upsert: true,
        },
      };
    });

    if (ops.length === 0) {
      return res.status(204).json({ message: "No items to import" });
    }

    const result = await Question.bulkWrite(ops, { ordered: false });

    return res.json({
      ok: true,
      inserted: result.upsertedCount,
      modified: result.modifiedCount || 0,
    });
  } catch (err) {
    console.error("import-qas error", err);
    return res
      .status(500)
      .json({ message: "server error", error: String(err) });
  }
});

/// Extract all QAs
router.get("/extract-qas", async (req, res) => {
  try {
    const documents = await Question.find({}).sort({ rank_value: -1 }).lean();
    return res.json(documents);
  } catch (err) {
    console.error("extract-qas error", err);
    return res.status(500).json({ message: "server error" });
  }
});

/// Save interview parameters and generate selected questions
router.post("/save-parameters", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized - No token" });
    }
    const token = authHeader.split("Bearer ")[1].trim();
    const verified = await clerkClient.verifyToken(token);
    const owner = verified.sub;

    const { jobTitle, company, jobDescription } = req.body ?? {};
    if (!jobTitle?.trim() || !company?.trim() || !jobDescription?.trim()) {
      return res
        .status(400)
        .json({ ok: false, message: "Missing required fields" });
    }

    const selectedIdsRaw = await selectQuestions(jobTitle, jobDescription, 1);

    const selectedIdsStr = selectedIdsRaw.map(String);
    const selectedIdsNum = selectedIdsRaw
      .map((id) => {
        const n = Number(id);
        return isNaN(n) ? null : n;
      })
      .filter((v) => v !== null);

    const orQueries = [];
    if (selectedIdsNum.length)
      orQueries.push({ question_id: { $in: selectedIdsNum } });
    if (selectedIdsStr.length)
      orQueries.push({ question_id: { $in: selectedIdsStr } });

    let questionDocs = [];
    if (orQueries.length) {
      questionDocs = await Question.find({ $or: orQueries }).lean();
    }

    const idToDoc = new Map(
      questionDocs.map((d) => [String(d.question_id), d])
    );
    const ordered = selectedIdsStr
      .map((qid) => idToDoc.get(qid))
      .filter(Boolean);

    const preFilledAnswers = ordered.map((q) => ({
      question_id: q.question_id,
      question_title: q.question_title ?? "",
      question_text: q.question_text ?? "",
      answer_text: q.answer_text ?? "",
      createdAt: new Date(),
    }));

    const interviewDoc = new Interview({
      owner,
      parameters: { jobTitle, company, jobDescription },
      selectedQuestions: selectedIdsStr,
      answers: preFilledAnswers,
      currentIndex: 0,
      status: "scheduled",
      date: new Date(),
    });
    await interviewDoc.save();

    return res.status(201).json({
      ok: true,
      message: "Interview created successfully",
      interviewId: interviewDoc.interviewId,
    });
  } catch (error) {
    console.error("save-parameters error:", error);
    return res
      .status(500)
      .json({ ok: false, message: "Server error", error: error.message });
  }
});

/// Fetch questions for a given interview
router.get("/:id/questions", async (req, res) => {
  try {
    const param = req.params.id;
    let interview = await Interview.findOne({ interviewId: param }).lean();
    if (!interview) interview = await Interview.findById(param).lean();
    if (!interview)
      return res
        .status(404)
        .json({ ok: false, message: "Interview not found" });

    const ids = (
      Array.isArray(interview.selectedQuestions)
        ? interview.selectedQuestions
        : []
    ).map(String);

    if (ids.length === 0)
      return res.json({ ok: true, questions: [], answersMap: {} });

    const docs = await Question.find({ question_id: { $in: ids } }).lean();
    const idToDoc = new Map(docs.map((d) => [d.question_id, d]));

    const ordered = ids
      .map((id) => {
        const doc = idToDoc.get(id);
        if (!doc) return null;
        return {
          question_id: doc.question_id,
          question_title: doc.question_title || "",
          question_text: doc.question_text || "",
        };
      })
      .filter(Boolean);

    const answersMap = {};
    for (const q of docs) {
      answersMap[q.question_id] = q.answer_text ?? "";
    }

    return res.json({ ok: true, questions: ordered, answersMap });
  } catch (err) {
    console.error("GET /:id/questions error", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
