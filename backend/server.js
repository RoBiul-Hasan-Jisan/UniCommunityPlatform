require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./src/config/db");
const { notFound, errorHandler } = require("./src/middleware/errorHandler");
const initSockets = require("./src/sockets");
const startEventReminderJob = require("./src/jobs/eventReminderJob");

const authRoutes = require("./src/routes/authRoutes");
const userRoutes = require("./src/routes/userRoutes");
const directoryRoutes = require("./src/routes/directoryRoutes");
const mentorshipRoutes = require("./src/routes/mentorshipRoutes");
const chatRoutes = require("./src/routes/chatRoutes");
const jobRoutes = require("./src/routes/jobRoutes");
const eventRoutes = require("./src/routes/eventRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");
const adminRoutes = require("./src/routes/adminRoutes");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || "http://localhost:3000", credentials: true },
});

connectDB();

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Make io available to controllers (req.io) so they can emit real-time events
// alongside REST responses (e.g. a new notification).
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.get("/api/health", (req, res) => res.json({ success: true, status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/directory", directoryRoutes);
app.use("/api/mentorship", mentorshipRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

initSockets(io);
startEventReminderJob(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`[server] EDU Alumni Connect API listening on port ${PORT}`);
});
