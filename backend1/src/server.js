import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { connectDB } from "./config/db.js";
import { initFirebase } from "./config/firebase.js";
import { initSocket } from "./socket.js";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import postRoutes from "./routes/posts.js";
import connectionRoutes from "./routes/connections.js";
import messageRoutes from "./routes/messages.js";
import workshopRoutes from "./routes/workshops.js";
import registrationRoutes from "./routes/registrations.js";
import mentorshipRoutes from "./routes/mentorship.js";
import notificationRoutes from "./routes/notifications.js";
import reportRoutes from "./routes/reports.js";
import adminRoutes from "./routes/admin.js";

const app = express();

// Security headers (hides tech stack fingerprinting, blocks MIME sniffing, etc.)
app.use(helmet());

// Only the configured frontend origin may call this API with credentials.
// Falling back to "*" would let ANY website's JavaScript read responses if a
// visitor happened to have a valid token lying around — always set
// CLIENT_ORIGIN in production.
const allowedOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";
app.use(cors({ origin: allowedOrigin, credentials: true }));

app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/workshops", workshopRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/mentorship", mentorshipRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

const PORT = process.env.PORT || 4000;
const httpServer = http.createServer(app);
initSocket(httpServer);

connectDB()
  .then(() => {
    initFirebase();
    httpServer.listen(PORT, () => console.log(`API + WebSocket running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
