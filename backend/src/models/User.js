const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["student", "alumni", "admin"], required: true },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    photoUrl: { type: String, default: null },
    coverPhotoUrl: { type: String, default: null },
    department: { type: String, default: null },
    batchYear: { type: Number, default: null },
    currentCompany: { type: String, default: null },
    jobTitle: { type: String, default: null },
    certificateUrl: { type: String, default: null },
    bio: { type: String, default: null },
    location: { type: String, default: null },
    skills: { type: [String], default: [] },
    openToMentorship: { type: Boolean, default: false },
    linkedinUrl: { type: String, default: null },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    fullName: this.fullName,
    email: this.email,
    role: this.role,
    verificationStatus: this.verificationStatus,
    photoUrl: this.photoUrl,
    coverPhotoUrl: this.coverPhotoUrl,
    department: this.department,
    batchYear: this.batchYear,
    currentCompany: this.currentCompany,
    jobTitle: this.jobTitle,
    certificateUrl: this.certificateUrl,
    bio: this.bio,
    location: this.location,
    skills: this.skills,
    openToMentorship: this.openToMentorship,
    linkedinUrl: this.linkedinUrl,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);
