import express from "express";
import cors from "cors";
import interviwewRoutes from "./routes/interviewRoutes.js";

export const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'https://ai-interviewprepapp.netlify.app'],
  credentials: true,
}));

app.use(express.json());
app.use('/api/interviews', interviwewRoutes);
