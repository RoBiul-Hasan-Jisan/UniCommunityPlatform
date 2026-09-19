import mongoose from "mongoose";
const { Schema } = mongoose;

const eventSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    time: { type: String, default: "" },
    mode: { type: String, enum: ["Online", "In-person"], default: "In-person" },
    location: { type: String, default: "" }, // a call link or a physical address
    category: { type: String, enum: ["Reunion", "Meetup", "Networking", "Social", "Other"], default: "Other" },
    host: { type: Schema.Types.ObjectId, ref: "User", required: true },
    capacity: { type: Number, default: 0 }, // 0 = unlimited
    rsvps: [{ type: Schema.Types.ObjectId, ref: "User" }],
    isDeletedByAdmin: { type: Boolean, default: false },
  },
  { timestamps: true }
);

eventSchema.index({ title: "text", description: "text", location: "text" });

export default mongoose.model("Event", eventSchema);
