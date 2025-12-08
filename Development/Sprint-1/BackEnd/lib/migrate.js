// scripts/migrate_question_id_to_string.js
import mongoose from 'mongoose';
import Question from '../models/Question.js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

config({ path: '../back.env' });

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URL, {});

    console.log('Connected to DB');

    // Find docs where question_id is a number OR typeof_question_id == 'number'
    const numericDocs = await Question.find({
      $or: [
        { typeof_question_id: 'number' },
        { question_id: { $type: 'int' } }, // may match 32-bit int
        { question_id: { $type: 'long' } }, // 64-bit
      ]
    }).lean();

    console.log('Numeric-like docs found:', numericDocs.length);

    let updated = 0;
    for (const doc of numericDocs) {
      const qid = doc.question_id;
      if (qid === undefined || qid === null) continue;
      const qidStr = String(qid);

      // Update document to string id
      await Question.updateOne({ _id: doc._id }, {
        $set: { question_id: qidStr },
        $unset: { typeof_question_id: "" }
      });

      updated++;
    }

    console.log(`Updated ${updated} docs to string question_id`);

    // If some docs used numeric but didn't have typeof_question_id, do a generic pass:
    // Note: The $type query above should catch numeric types; leaving this commented:
    // await Question.updateMany({}, [{ $set: { question_id: { $toString: "$question_id" } } }]);

    await mongoose.disconnect();
    console.log('Disconnected. Done.');
  } catch (err) {
    console.error('Migration error', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

run();
