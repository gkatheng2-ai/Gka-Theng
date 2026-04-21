import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // In-memory store for demo (replace with DB for production)
  const messages: any[] = [];
  const users = new Map();

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("join", (user) => {
      users.set(socket.id, user);
      socket.join(user.id);
      console.log(`User ${user.id} joined room ${user.id}`);
      
      // Notify others about online status
      socket.broadcast.emit("user_status", { userId: user.id, status: "online" });
      
      // Send message history
      socket.emit("history", messages);
    });

    socket.on("send_message", (message) => {
      const fullMessage = {
        ...message,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        deletedFor: [], // Array of user IDs who have hidden this message
        isDeletedForEveryone: false
      };
      messages.push(fullMessage);
      io.emit("new_message", fullMessage);
    });

    socket.on("delete_message", ({ messageId, forEveryone, userId }) => {
      const msgIndex = messages.findIndex(m => m.id === messageId);
      if (msgIndex !== -1) {
        if (forEveryone) {
          messages[msgIndex].isDeletedForEveryone = true;
          messages[msgIndex].content = "This message was deleted";
          messages[msgIndex].type = "text";
          delete messages[msgIndex].mediaUrl;
        } else {
          if (!messages[msgIndex].deletedFor.includes(userId)) {
            messages[msgIndex].deletedFor.push(userId);
          }
        }
        io.emit("message_deleted", { messageId, forEveryone, userId, updatedMessage: messages[msgIndex] });
      }
    });

    socket.on("typing", (data) => {
      // Broadcast typing status to everyone else
      socket.broadcast.emit("user_typing", data);
    });

    socket.on("call_user", (data) => {
      // data: { to, from, signal, type: 'voice' | 'video' }
      socket.to(data.to).emit("incoming_call", { from: data.from, signal: data.signal, type: data.type });
    });

    socket.on("answer_call", (data) => {
      // data: { to, signal }
      socket.to(data.to).emit("call_accepted", data.signal);
    });

    socket.on("end_call", (data) => {
      // data: { to }
      socket.to(data.to).emit("call_ended");
    });

    socket.on("update_status", ({ userId, status }) => {
      const user = users.get(socket.id);
      if (user && user.id === userId) {
        user.status = status;
        users.set(socket.id, user);
        socket.broadcast.emit("user_status", { userId, status });
      }
    });

    socket.on("disconnect", () => {
      const user = users.get(socket.id);
      if (user) {
        socket.broadcast.emit("user_status", { userId: user.id, status: "offline" });
        users.delete(socket.id);
      }
      console.log("User disconnected:", socket.id);
    });
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/upload", upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  });

  app.use("/uploads", express.static(uploadsDir));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
