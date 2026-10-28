import "dotenv/config";
// MUST be imported before any routers are required — it patches Express so
// that a thrown/rejected error inside an async route handler is forwarded
// to the error-handling middleware instead of becoming an unhandled
// rejection that crashes the entire process (and every connected socket
// with it). This is exactly what happened with the duplicate-email crash:
// one bad request took the whole server down for every connected user.
import "express-async-errors";
import http from "http";
import { connectDB } from "./config/db.js";
import { initFirebase } from "./config/firebase.js";
import { assertEnv } from "./config/env.js";
import { initSocket, getIO } from "./socket.js";
import { logger } from "./utils/logger.js";
import { startEventReminderJob } from "./jobs/eventReminders.js";
import app from "./app.js";

// Fail fast (before opening any connection) if the configuration is unsafe or incomplete.
try {
  assertEnv(logger);
} catch (err) {
  logger.fatal(err.message);
  process.exit(1);
}

const PORT = process.env.PORT || 4000;
const httpServer = http.createServer(app);

// express-async-errors only covers Express routes. Socket.IO event handlers
// (socket.on("...", async ...)) are separate async functions it can't patch,
// so this is the last line of defense for those — log and keep running
// instead of taking down every connected user over one bad event.
process.on("unhandledRejection", (err) => {
  logger.error({ err }, "Unhandled rejection (server kept running)");
});
process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception (server kept running)");
});

async function start() {
  try {
    await connectDB();
    initFirebase();
    await initSocket(httpServer); // waits for the optional Redis adapter, if REDIS_URL is set
    startEventReminderJob();
    httpServer.listen(PORT, () => logger.info(`API + WebSocket running on http://localhost:${PORT}`));
  } catch (err) {
    logger.fatal({ err }, "Failed to start server");
    process.exit(1);
  }
}

start();

// Deploy/restart cleanly instead of dropping every open socket mid-conversation.
function shutdown(signal) {
  logger.info(`${signal} received — closing connections gracefully...`);
  getIO()?.close();
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref(); // force-exit if something hangs
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
