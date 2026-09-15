import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set. Add it to backend/.env");
    process.exit(1);
  }
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || "university_community" });
  console.log("MongoDB connected");
}
