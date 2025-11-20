import mongoose from "mongoose";
import { config } from "dotenv";
import fs from "fs";
import Question from './models/Question.js';

config({ path: './back.env' });

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    // Check if collection is empty
    const count = await Question.countDocuments();
    if (count > 0) {
      console.log('Data already exists; skipping seed to avoid duplicates.');
      return;
    }

    const data = JSON.parse(fs.readFileSync('./so_selected_qas.json', 'utf-8'));
    await Question.insertMany(data);
    console.log('Data seeded successfully');
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    mongoose.connection.close();
  }
};

seedDB();