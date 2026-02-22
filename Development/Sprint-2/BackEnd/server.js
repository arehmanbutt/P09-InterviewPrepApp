// server.js
import http from "http";
import { app } from "./app.js";
import mongoose from "mongoose";
import { config } from "dotenv";
import { initSocket } from "./lib/socket.js"; // <--- new module

config({ path: "./back.env" });

const server = http.createServer(app);

// initialize Socket.IO after server created
initSocket(server);

// Then continue with DB connect + listen
const PORT = process.env.PORT || 8000;
const MONGO_URL = process.env.MONGO_URL;

async function startServer() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("✅ Connected to MongoDB Atlas");

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Startup error:", err);
    process.exit(1);
  }
}

startServer();
