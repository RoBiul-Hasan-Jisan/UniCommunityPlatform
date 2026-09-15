// Seeds a minimal dataset: one admin, a few verified alumni, and a student.
// Run with: npm run seed
require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");

async function run() {
  await connectDB();
  await User.deleteMany({});

  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await User.create({
    fullName: "",
    email: "",
    passwordHash,
    role: "admin",
    verificationStatus: "verified",
  });

  const alumni1 = await User.create({
    fullName: "Nabila Rahman",
    email: "nabila.rahman@example.com",
    passwordHash,
    role: "alumni",
    verificationStatus: "verified",
    department: "Computer Science & Engineering",
    batchYear: 2018,
    currentCompany: "Pathao",
    jobTitle: "Senior Product Manager",
    location: "Dhaka, Bangladesh",
    skills: ["Product Strategy", "Roadmapping", "User Research"],
    bio: "Class of 2018. Happy to mentor students interested in product management.",
    openToMentorship: true,
  });

  const alumni2 = await User.create({
    fullName: "Kamal Hossain",
    email: "kamal.hossain@example.com",
    passwordHash,
    role: "alumni",
    verificationStatus: "pending",
    department: "Electrical & Electronic Engineering",
    batchYear: 2015,
    currentCompany: "Grameenphone",
    jobTitle: "Network Engineer",
    location: "Chattogram, Bangladesh",
    skills: ["RF Planning", "5G"],
    openToMentorship: false,
  });

  const student1 = await User.create({
    fullName: "Tanvir Ahmed",
    email: "tanvir.ahmed@eastdelta.edu.bd",
    passwordHash,
    role: "student",
    verificationStatus: "verified",
    department: "Computer Science & Engineering",
    batchYear: 2026,
  });

  console.log("Seeded users (all passwords: password123):");
  console.log(`  admin:    ${admin.email}`);
  console.log(`  alumni:   ${alumni1.email} (verified, open to mentorship)`);
  console.log(`  alumni:   ${alumni2.email} (pending verification)`);
  console.log(`  student:  ${student1.email}`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
