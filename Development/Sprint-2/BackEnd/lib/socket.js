// server/socket.js
import { Server } from "socket.io";

let ioInstance = null;

/**
 * Initialize Socket.IO with an existing http.Server instance.
 * Call this exactly once during server startup (after http.createServer(app)).
 * Returns the created io instance.
 */
export function initSocket(server, opts = {}) {
  if (ioInstance) return ioInstance;
  ioInstance = new Server(server, {
    cors: {
      origin: ['http://localhost:5173', 'https://ai-interviewprepapp.netlify.app'],
      methods: ["GET", "POST"],
      credentials: true,
    },
    ...opts,
  });

  // optional: attach basic connection handler
  ioInstance.on("connection", (socket) => {
    console.log(" A user connected:", socket.id);

    socket.on("join_interview", (payload) => {
      const interviewId = payload?.interviewId;
      if (interviewId) {
        socket.join(String(interviewId));
        console.log(`Socket ${socket.id} joined room ${interviewId}`);
      }
    });

    socket.on("disconnect", () => {
      console.log("socket disconnected:", socket.id);
    });
  });

  return ioInstance;
}

/**
 * Getter for the initialized io instance.
 * Throws if not initialized (so callers know to call initSocket first).
 */
export function getIO() {
  if (!ioInstance) {
    throw new Error("Socket.IO not initialized. Call initSocket(server) during startup first.");
  }
  return ioInstance;
}
