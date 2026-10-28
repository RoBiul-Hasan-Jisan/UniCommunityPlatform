import pino from "pino";

// Structured JSON logs in production (easy to ship to any log service),
// readable single-line logs in development.
const isProd = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isTest ? "silent" : isProd ? "info" : "debug"),
  redact: ["req.headers.authorization", "req.headers.cookie"],
  ...(isProd || isTest
    ? {}
    : { transport: { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" } } }),
});
