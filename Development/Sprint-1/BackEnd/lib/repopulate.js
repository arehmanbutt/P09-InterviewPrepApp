// scripts/clear_and_reimport_qas.js
import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import Question from '../models/Question.js'; // <- adjust path if needed
import { config } from 'dotenv';

config({ path: '../back.env' });

async function main() {
  const MONGO = process.env.MONGO_URL || process.env.MONGO_URI || process.env.MONGO;
  if (!MONGO) {
    console.error('Missing MONGO_URL in env (back.env). Aborting.');
    process.exit(1);
  }

  await mongoose.connect(MONGO, {});

  try {
    console.log('Connected to MongoDB');

    // 1) Backup hint (not automated here) - you should run mongodump or export before proceeding

    // 2) Remove all existing docs in Question collection
    const del = await Question.deleteMany({});
    console.log(`Deleted ${del.deletedCount} documents from Question collection.`);

    // 3) Read paraphrased file (assumes file at project root: paraphrased_qas.json)
    const filePath = path.join(process.cwd(), '../paraphrased_qas.json');
    console.log('Reading import file:', filePath);
    const raw = await fs.readFile(filePath, 'utf8');
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) {
      throw new Error('paraphrased_qas.json is not an array');
    }
    console.log(`Found ${items.length} items to import.`);

    // 4) Prepare bulk upsert operations (ensure question_id stringified)
    const ops = items.map(it => {
      const qid = (it.question_id !== undefined && it.question_id !== null) ? String(it.question_id) : null;
      const filter = qid ? { question_id: qid } : { question_text: it.question_text || '' };
      const update = {
        $set: {
          question_id: qid,
          question_title: it.question_title || '',
          question_text: it.question_text || '',
          answer_text: it.answer_text || '',
          tags: it.tags || [],
          rank_value: it.rank_value ?? 0
        },
        $setOnInsert: { createdAt: new Date() }
      };
      return { updateOne: { filter, update, upsert: true } };
    });

    if (ops.length === 0) {
      console.log('No operations to run. Exiting.');
      await mongoose.disconnect();
      return;
    }

    const res = await Question.bulkWrite(ops, { ordered: false });
    console.log('BulkWrite result:', {
      matched: res.matchedCount ?? 'N/A',
      modified: res.modifiedCount ?? 0,
      upserted: res.upsertedCount ?? 0,
    });

    console.log('Reimport finished successfully.');
  } catch (err) {
    console.error('Error during clear-and-reimport:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
