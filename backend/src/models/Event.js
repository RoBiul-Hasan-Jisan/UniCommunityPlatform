const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    tag: { type: String, required: true, uppercase: true },
    dateTime: { type: Date, required: true },
    date: { type: String, required: true }, // display, e.g. "OCT 14"
    time: { type: String, required: true }, // display, e.g. "6:00 PM"
    location: { type: String, required: true },
    bannerUrl: { type: String, default: null },
    isOnline: { type: Boolean, default: false },
    maxAttendees: { type: Number, required: true, min: 1 },
    rsvpCount: { type: Number, default: 0 },
    rsvpUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    postedByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reminderSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
