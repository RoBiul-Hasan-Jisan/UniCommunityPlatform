import mongoose from "mongoose";
const { Schema } = mongoose;

const workshopSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ["Technical", "Career", "Research", "Entrepreneurship", "Academic", "Other"],
      default: "Technical",
    },
    host: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    durationMinutes: { type: Number, default: 60 },
    mode: { type: String, enum: ["Online", "Offline"], default: "Online" },
    location: { type: String, default: "" },
    maxParticipants: { type: Number, default: 100 },
    registrationDeadline: { type: Date },
    status: { type: String, enum: ["upcoming", "ongoing", "completed", "cancelled"], default: "upcoming" },
  },
  { timestamps: true }
);

workshopSchema.index({ status: 1, date: 1 });
workshopSchema.index({ host: 1 });

export default mongoose.model("Workshop", workshopSchema);
