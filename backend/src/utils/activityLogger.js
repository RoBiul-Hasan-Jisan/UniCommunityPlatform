import Activity from "../models/Activity.js";

export async function logActivity(actor, action, targetType = "", targetId = null) {
  try {
    await Activity.create({ actor, action, targetType, targetId });
  } catch (err) {
    console.error("Activity log failed:", err.message);
  }
}
