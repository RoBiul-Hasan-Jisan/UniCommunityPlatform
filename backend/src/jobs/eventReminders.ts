import Event from "../models/Event.js";
import { notify } from "../utils/notify.js";
import { logger } from "../utils/logger.js";

// Every 30 minutes: find events starting within the next 24 hours that
// haven't had a reminder yet, and remind the host + everyone who RSVP'd.
// `reminderSent` makes this idempotent, so restarts never double-send.
// (Single-process timer: if you scale to several API instances, run this on
// only one of them — e.g. set RUN_JOBS=false on the others.)
export async function sendDueEventReminders(now = new Date()) {
  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const due = await Event.find({
    isDeletedByAdmin: false,
    reminderSent: false,
    date: { $gte: now, $lte: soon },
  });

  for (const event of due) {
    // Claim it first so a concurrent run can't send twice.
    const claimed = await Event.updateOne({ _id: event._id, reminderSent: false }, { reminderSent: true });
    if (claimed.modifiedCount === 0) continue;
    const people = new Set([String(event.host), ...event.rsvps.map(String)]);
    for (const userId of people) {
      await notify(userId, "event_reminder", `Reminder: "${event.title}" is coming up soon.`, `/events/${event._id}`);
    }
    logger.info({ eventId: String(event._id), recipients: people.size }, "Event reminders sent");
  }
  return due.length;
}

export function startEventReminderJob() {
  if (process.env.RUN_JOBS === "false") return null;
  const run = () => sendDueEventReminders().catch((err) => logger.error({ err: err.message }, "Event reminder job failed"));
  setTimeout(run, 15_000).unref();
  return setInterval(run, 30 * 60 * 1000).unref();
}
