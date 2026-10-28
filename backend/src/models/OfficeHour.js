import mongoose from "mongoose";
const { Schema } = mongoose;

// A single bookable slot, not a recurring schedule — the host (an alumnus,
// usually) posts specific times, a student books one, done. Simpler than a
// full calendar system, and matches how these actually get used.
const officeHourSchema = new Schema(
  {
    host: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    durationMinutes: { type: Number, default: 30 },
    topic: { type: String, default: "" },
    mode: { type: String, enum: ["Online", "In-person"], default: "Online" },
    location: { type: String, default: "" }, // a call link or a physical place
    bookedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    bookingNote: { type: String, default: "" },
    status: { type: String, enum: ["open", "booked", "cancelled"], default: "open" },
  },
  { timestamps: true }
);

officeHourSchema.index({ status: 1, date: 1 });
officeHourSchema.index({ host: 1, date: 1 });
officeHourSchema.index({ bookedBy: 1 });

export default mongoose.model("OfficeHour", officeHourSchema);
