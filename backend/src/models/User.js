import mongoose from "mongoose";

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },

    // Auth linkage — a user is authenticated via Firebase OR via demo login.
    firebaseUid: { type: String, unique: true, sparse: true },
    isDemo: { type: Boolean, default: false },
    passwordHash: { type: String }, // only used for demo/local accounts

    role: { type: String, enum: ["student", "alumni", "admin"], default: "student" },
    status: { type: String, enum: ["active", "disabled"], default: "active" },

    // Shared profile fields
    department: { type: String, default: "" },
    // A small base64 data URI, resized/compressed client-side before
    // upload — no object storage dependency needed for a photo this small.
    avatarUrl: { type: String, default: "" },
    about: { type: String, default: "" },
    skills: [{ type: String }],
    achievements: [{ type: String }],
    // One-click endorsements from other members — "I can vouch for this skill".
    endorsements: [
      {
        skill: { type: String, required: true },
        endorsedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Student-only
    studentId: { type: String, default: "" },
    batch: { type: String, default: "" },
    semester: { type: String, default: "" },
    interests: [{ type: String }],
    projects: [{ type: String }],

    // Alumni-only
    alumniId: { type: String, default: "" },
    graduationYear: { type: String, default: "" },
    currentCompany: { type: String, default: "" },
    currentPosition: { type: String, default: "" },
    industry: { type: String, default: "" },
    experience: [{ type: String }],

    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

userSchema.index({ name: "text", department: "text", skills: "text", currentCompany: "text" });

export default mongoose.model("User", userSchema);
