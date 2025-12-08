import express from "express";
import cors from "cors";
<<<<<<< HEAD
import interviwewRoutes from "./routes/interviewRoutes.js";
=======
import bodyparser from "body-parser";
// import { authMiddleware } from '@clerk/express';
// import { clerkMiddleware } from '@clerk/clerk-sdk-node';
import interviwewRoutes from "./routes/interviewRoutes.js";
import agentRoutes from "./routes/agentRoutes.js";
>>>>>>> e8a551a48cffd5700857244259a8f9dd7f7fe2b9

export const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'https://ai-interviewprepapp.netlify.app'],
  credentials: true,
}));

<<<<<<< HEAD
app.use(express.json());
app.use('/api/interviews', interviwewRoutes);
=======
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
>>>>>>> e8a551a48cffd5700857244259a8f9dd7f7fe2b9
