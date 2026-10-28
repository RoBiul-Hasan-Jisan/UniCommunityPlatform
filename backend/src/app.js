// The Express app, built but NOT started — server.js starts it, and the tests
// import it directly (no database or open port needed for most checks).
import "express-async-errors"; // forwards errors thrown in async handlers to the error middleware
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";
import pinoHttp from "pino-http";
import { logger } from "./utils/logger.js";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import postRoutes from "./routes/posts.js";
import connectionRoutes from "./routes/connections.js";
import messageRoutes from "./routes/messages.js";
import workshopRoutes from "./routes/workshops.js";
import jobRoutes from "./routes/jobs.js";
import registrationRoutes from "./routes/registrations.js";
import mentorshipRoutes from "./routes/mentorship.js";
import notificationRoutes from "./routes/notifications.js";
import reportRoutes from "./routes/reports.js";
import adminRoutes from "./routes/admin.js";
import officeHoursRoutes from "./routes/officeHours.js";
import projectRoutes from "./routes/projects.js";
import eventRoutes from "./routes/events.js";
import searchRoutes from "./routes/search.js";
import uploadRoutes from "./routes/uploads.js";
import pushRoutes from "./routes/push.js";

const app = express();

// Required behind any reverse proxy (Render, Railway, nginx, an ALB...) so
// rate limiting and req.ip see the real visitor instead of the proxy.
app.set("trust proxy", 1);

app.use(helmet());
app.use(compression());

// Only the configured frontend origin may call this API with credentials.
const allowedOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";
app.use(cors({ origin: allowedOrigin, credentials: true }));

app.use(express.json({ limit: "1mb" }));
// Strips $ and . operators from req.body/query/params — blocks NoSQL injection
// payloads like { "email": { "$gt": "" } }.
app.use(mongoSanitize());

app.use(
  pinoHttp({
    logger,
    autoLogging: { ignore: (req) => req.url === "/api/health" },
    customLogLevel: (req, res, err) => (err || res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info"),
    serializers: {
      req: (req) => ({ id: req.id, method: req.method, url: req.url }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  })
);

app.get("/api/health", (req, res) => res.json({ ok: true, uptime: Math.round(process.uptime()) }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/workshops", workshopRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/mentorship", mentorshipRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/office-hours", officeHoursRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/push", pushRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found" }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Duplicate-key and validation errors are the caller's fault, not a crash.
  if (err?.code === 11000) return res.status(409).json({ error: "That already exists." });
  if (err?.name === "ValidationError") return res.status(400).json({ error: Object.values(err.errors)[0]?.message || "Invalid data" });
  if (err?.name === "CastError") return res.status(400).json({ error: "Invalid id" });
  if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "Malformed JSON body" });
  if (err?.type === "entity.too.large") return res.status(413).json({ error: "Request body too large" });
  req.log?.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Server error" });
});

export default app;
