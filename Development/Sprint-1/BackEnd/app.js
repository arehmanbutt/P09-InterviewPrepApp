// app.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import interviewRoutes from "./routes/interviewRoutes.js";
import agentRoutes from "./routes/agentRoutes.js";

export const app = express();

app.disable("x-powered-by");

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://ai-interviewprepapp.netlify.app",
    ],
    credentials: true,
  })
);

app.use(
  bodyParser.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use("/api/interviews", interviewRoutes);
app.use("/api/webhooks", agentRoutes);
