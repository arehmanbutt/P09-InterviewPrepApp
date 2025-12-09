// scripts/migrate_question_id_to_string.js
import mongoose from "mongoose";
import Question from "../models/Question.js";
import { config } from "dotenv";
// removed unused imports after sonarqube scan.

config({ path: "../back.env" });

try {
  await mongoose.connect(process.env.MONGO_URL, {});
  console.log("Connected to DB");

  const numericDocs = await Question.find({
    $or: [
      { typeof_question_id: "number" },
      { question_id: { $type: "int" } },
      { question_id: { $type: "long" } },
    ],
  }).lean();

  console.log("Numeric-like docs found:", numericDocs.length);

  let updated = 0;

  for (const doc of numericDocs) {
    const qid = doc.question_id;
    if (qid === undefined || qid === null) continue;

    const qidStr = String(qid);

    await Question.updateOne(
      { _id: doc._id },
      {
        $set: { question_id: qidStr },
        $unset: { typeof_question_id: "" },
      }
    );

    updated++;
  }

  console.log(`Updated ${updated} docs to string question_id`);

  await mongoose.disconnect();
  console.log("Disconnected. Done.");
} catch (err) {
  console.error("Migration error", err);
  await mongoose.disconnect();
  process.exit(1);
}
