import Activity from "../models/Activity.js";
import { logger } from "./logger.js";

// Audit trail. `req` and `meta` are optional so existing call sites keep working;
// pass `req` from admin/moderation routes to record the IP address too.
export async function logActivity(actor, action, targetType = "", targetId = null, { req, meta } = {}) {
  try {
    await Activity.create({
      actor,
      action,
      targetType,
      targetId,
      ip: req?.ip || "",
      ...(meta ? { meta } : {}),
    });
  } catch (err) {
    logger.error({ err: err.message }, "Activity log failed");
  }
}
