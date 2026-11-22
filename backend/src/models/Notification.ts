import mongoose from "mongoose";
const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: [
        "connection_request", "connection_accepted", "message", "workshop_registration",
        "workshop_update", "workshop_upcoming", "mentorship_request", "mentorship_update",
        "post_comment", "comment_reply", "reaction", "admin",
        "endorsement", "referral_request", "referral_update",
        "office_hours_booked", "office_hours_cancelled",
        "project_star", "event_rsvp", "event_reminder", "report_update",
      ],
      required: true,
    },
    text: { type: String, required: true },
    link: { type: String, default: "" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
