import nodemailer from "nodemailer";
import { logger } from "./logger.js";

// Email is optional: with no SMTP_* variables set, sendMail() quietly does
// nothing, so local development and demos never need a mail server.
let transporter = null;
let initialised = false;

function getTransporter() {
  if (initialised) return transporter;
  initialised = true;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST) {
    logger.info("Email: SMTP_HOST not set — email notifications are disabled.");
    return null;
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
  return transporter;
}

export function emailEnabled() {
  return !!getTransporter();
}

const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export async function sendMail({ to, subject, text, link }) {
  const t = getTransporter();
  if (!t || !to) return false;
  const origin = process.env.CLIENT_ORIGIN || "http://localhost:3000";
  const url = link ? (link.startsWith("http") ? link : `${origin}${link}`) : origin;
  try {
    await t.sendMail({
      from: process.env.MAIL_FROM || "UniConnect <no-reply@uniconnect.local>",
      to,
      subject,
      text: `${text}\n\nOpen UniConnect: ${url}\n\nYou can turn these emails off in your profile settings.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#12192B;margin-bottom:8px">${esc(subject)}</h2>
        <p style="color:#333;font-size:15px">${esc(text)}</p>
        <p><a href="${esc(url)}" style="background:#AB812E;color:#12192B;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600">Open UniConnect</a></p>
        <p style="color:#888;font-size:12px">You can turn these emails off in your profile settings.</p></div>`,
    });
    return true;
  } catch (err) {
    logger.error({ err: err.message }, "Email send failed");
    return false;
  }
}
