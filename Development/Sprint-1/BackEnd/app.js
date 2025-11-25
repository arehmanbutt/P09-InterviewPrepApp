import express from "express";
import cors from "cors";
import bodyparser from "body-parser";
// import { authMiddleware } from '@clerk/express';
// import { clerkMiddleware } from '@clerk/clerk-sdk-node';
import interviwewRoutes from "./routes/interviewRoutes.js";
import agentRoutes from "./routes/agentRoutes.js";

export const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'https://ai-interviewprepapp.netlify.app'],
  credentials: true,
}));

app.use(bodyparser.json({
  verify: (req, res, buf) => {
    // req.rawBody = buf.toString();
    req.rawBody = buf;
  }
}));
// app.use(express.json());

// app.use(express.json({
//   verify: (req, res, buf) => {
//     req.rawBody = buf.toString();
//   }
// }));
// app.use(bodyparser.json());

// app.use(clerkMiddleware());
// app.use('/api', authMiddleware());
app.use('/api/interviews', interviwewRoutes);
app.use('/api/webhooks', agentRoutes);
