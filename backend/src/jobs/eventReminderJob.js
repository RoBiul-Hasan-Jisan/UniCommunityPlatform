const cron = require("node-cron");
const Event = require("../models/Event");
const { createNotification } = require("../utils/notify");

// Replaces BG-04 scheduledEventReminder (Cloud Scheduler, every 60 min).
// Notifies everyone RSVP'd to an event starting within the next 24 hours.
function startEventReminderJob(io) {
  cron.schedule("0 * * * *", async () => {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const events = await Event.find({ dateTime: { $gte: now, $lte: in24h }, reminderSent: false });
    if (events.length === 0) return;

    for (const event of events) {
      if (event.rsvpUserIds.length === 0) {
        event.reminderSent = true;
        await event.save();
        continue;
      }

      const title = "Event Reminder 📅";
      const body = `"${event.title}" is happening ${event.date} at ${event.time}. See you there!`;

      for (const uid of event.rsvpUserIds) {
        await createNotification(io, uid, {
          type: "event_reminder",
          title,
          body,
          route: `/events/${event._id}`,
          entityId: String(event._id),
        });
      }

      event.reminderSent = true;
      await event.save();
      console.log(`[eventReminderJob] Sent reminders for "${event.title}" to ${event.rsvpUserIds.length} users.`);
    }
  });

  console.log("[eventReminderJob] Scheduled: every hour on the hour.");
}

module.exports = startEventReminderJob;
