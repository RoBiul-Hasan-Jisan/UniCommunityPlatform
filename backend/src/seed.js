import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "./config/db.js";
import User from "./models/User.js";
import Post from "./models/Post.js";
import Workshop from "./models/Workshop.js";
import Registration from "./models/Registration.js";
import Connection from "./models/Connection.js";
import Mentorship from "./models/Mentorship.js";
import Notification from "./models/Notification.js";
import Activity from "./models/Activity.js";

async function run() {
  await connectDB();
  console.log("Clearing existing demo data...");
  await Promise.all([
    User.deleteMany({}),
    Post.deleteMany({}),
    Workshop.deleteMany({}),
    Registration.deleteMany({}),
    Connection.deleteMany({}),
    Mentorship.deleteMany({}),
    Notification.deleteMany({}),
    Activity.deleteMany({}),
  ]);

  const pass = await bcrypt.hash(process.env.SEED_DEMO_PASSWORD || "Demo@12345", 10);

  const admin = await User.create({
    name: "Platform Admin",
    email: "admin@demo.university.edu",
    role: "admin",
    isDemo: true,
    passwordHash: pass,
    department: "Administration",
    about: "Platform administrator overseeing the university community.",
  });

  const students = await User.insertMany([
    {
      name: "Rahim Ahmed", email: "rahim@demo.university.edu", role: "student", isDemo: true, passwordHash: pass,
      department: "CSE", studentId: "CSE-2021-045", batch: "2021", semester: "7th",
      about: "CSE undergrad interested in AI and web development.",
      skills: ["JavaScript", "React", "Python"], interests: ["AI/ML", "Web Dev"],
      projects: ["University Event Portal"], achievements: ["Dean's List 2023"],
    },
    {
      name: "Sadia Islam", email: "sadia@demo.university.edu", role: "student", isDemo: true, passwordHash: pass,
      department: "EEE", studentId: "EEE-2022-018", batch: "2022", semester: "5th",
      about: "Exploring robotics and embedded systems.",
      skills: ["C++", "Arduino", "MATLAB"], interests: ["Robotics", "IoT"],
      projects: ["Smart Irrigation System"], achievements: [],
    },
    {
      name: "Tanvir Hossain", email: "tanvir@demo.university.edu", role: "student", isDemo: true, passwordHash: pass,
      department: "BBA", studentId: "BBA-2021-102", batch: "2021", semester: "6th",
      about: "Aspiring product manager, curious about startups.",
      skills: ["Excel", "Market Research"], interests: ["Entrepreneurship", "Marketing"],
      projects: [], achievements: ["Business Case Competition — 2nd place"],
    },
  ]);

  const alumni = await User.insertMany([
    {
      name: "Karim Rahman", email: "karim@demo.university.edu", role: "alumni", isDemo: true, passwordHash: pass,
      department: "CSE", alumniId: "ALM-2018-CSE-021", graduationYear: "2018",
      currentCompany: "Techverse Inc.", currentPosition: "Senior Software Engineer", industry: "Software",
      about: "Backend engineer, loves mentoring students on career paths in tech.",
      skills: ["Node.js", "System Design", "AWS"], experience: ["5+ years in backend engineering"],
      achievements: ["Speaker at DevFest 2023"],
    },
    {
      name: "Nadia Chowdhury", email: "nadia@demo.university.edu", role: "alumni", isDemo: true, passwordHash: pass,
      department: "BBA", alumniId: "ALM-2016-BBA-009", graduationYear: "2016",
      currentCompany: "Brightline Consulting", currentPosition: "Strategy Manager", industry: "Consulting",
      about: "Helping students break into consulting and strategy roles.",
      skills: ["Strategy", "Consulting", "Public Speaking"], experience: ["7 years in management consulting"],
      achievements: [],
    },
    {
      name: "John Doe", email: "john@demo.university.edu", role: "alumni", isDemo: true, passwordHash: pass,
      department: "CSE", alumniId: "ALM-2015-CSE-004", graduationYear: "2015",
      currentCompany: "NeuralWorks AI", currentPosition: "ML Engineering Lead", industry: "AI/ML",
      about: "Runs workshops on AI/ML career prep for students.",
      skills: ["Machine Learning", "Python", "Career Coaching"], experience: ["8 years in AI/ML"],
      achievements: ["Published 3 papers on applied ML"],
    },
  ]);

  const [rahim, sadia, tanvir] = students;
  const [karim, nadia, john] = alumni;

  // --- Bulk demo roster for a live-audience demo (e.g. ~50 students + ~50
  // alumni logging in at once) --------------------------------------------
  const FIRST_NAMES = [
    "Arif", "Farhan", "Mahin", "Nusrat", "Priya", "Rifat", "Sabbir", "Tasnim",
    "Zara", "Imran", "Labiba", "Naeem", "Orin", "Piyal", "Rumana", "Shuvo",
    "Anika", "Bashar", "Chandni", "Dip", "Elma", "Fahim", "Gulshan", "Hridoy",
    "Ishika", "Jubayer", "Kabir", "Lamia", "Mahfuz", "Nadia", "Omar", "Parvez",
    "Quazi", "Raisa", "Saif", "Trisha", "Umar", "Vabna", "Wasi", "Yasmin",
    "Zaman", "Afsana", "Biplob", "Chayan", "Dola", "Emon", "Faria", "Golam",
    "Habiba", "Ivan",
  ];
  const LAST_NAMES = [
    "Khan", "Ahmed", "Islam", "Rahman", "Hossain", "Chowdhury", "Akter",
    "Siddique", "Karim", "Alam", "Sultana", "Uddin", "Haque", "Mia", "Rashid",
    "Bhuiyan", "Talukder", "Sarker", "Molla", "Majumder",
  ];
  const DEPARTMENTS = ["CSE", "EEE", "BBA", "Civil Engineering", "Architecture", "Economics", "Pharmacy", "Law"];
  const SKILL_POOL = [
    "JavaScript", "Python", "React", "Node.js", "SQL", "Figma", "Excel",
    "Public Speaking", "Data Analysis", "AutoCAD", "Market Research",
    "C++", "Java", "AWS", "Project Management", "Content Writing",
  ];
  const INTEREST_POOL = ["AI/ML", "Web Dev", "Robotics", "Finance", "Entrepreneurship", "Design", "Research", "Public Policy"];
  const COMPANIES = [
    "Techverse Inc.", "Brightline Consulting", "NeuralWorks AI", "Delta Bank",
    "Orbit Logistics", "Prime Health Group", "Summit Legal", "BlueRiver Studio",
    "Northgate Partners", "Vantage Analytics",
  ];
  const POSITIONS = [
    "Software Engineer", "Product Manager", "Data Analyst", "Business Consultant",
    "Marketing Lead", "Financial Analyst", "UX Designer", "Operations Manager",
  ];

  function pick(arr, n = 1) {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return n === 1 ? shuffled[0] : shuffled.slice(0, n);
  }

  const usedNames = new Set([...students, ...alumni].map((u) => u.name));
  function uniqueName() {
    let name;
    do {
      name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    } while (usedNames.has(name));
    usedNames.add(name);
    return name;
  }

  console.log("Generating additional demo students and alumni...");
  const bulkStudentDocs = [];
  for (let i = 0; i < 47; i++) {
    const name = uniqueName();
    const dept = pick(DEPARTMENTS);
    const batch = String(2020 + Math.floor(Math.random() * 5));
    bulkStudentDocs.push({
      name,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@demo.university.edu`,
      role: "student",
      isDemo: true,
      passwordHash: pass,
      department: dept,
      studentId: `${dept.slice(0, 3).toUpperCase()}-${batch}-${100 + i}`,
      batch,
      semester: `${1 + Math.floor(Math.random() * 8)}th`,
      about: `${dept} student interested in ${pick(INTEREST_POOL).toLowerCase()}.`,
      skills: pick(SKILL_POOL, 3),
      interests: pick(INTEREST_POOL, 2),
      projects: [],
      achievements: [],
    });
  }
  const bulkStudents = await User.insertMany(bulkStudentDocs);

  const bulkAlumniDocs = [];
  for (let i = 0; i < 47; i++) {
    const name = uniqueName();
    const dept = pick(DEPARTMENTS);
    const gradYear = String(2010 + Math.floor(Math.random() * 12));
    bulkAlumniDocs.push({
      name,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@demo.university.edu`,
      role: "alumni",
      isDemo: true,
      passwordHash: pass,
      department: dept,
      alumniId: `ALM-${gradYear}-${dept.slice(0, 3).toUpperCase()}-${100 + i}`,
      graduationYear: gradYear,
      currentCompany: pick(COMPANIES),
      currentPosition: pick(POSITIONS),
      industry: pick(["Software", "Consulting", "Finance", "Healthcare", "Legal", "Design"]),
      about: `${dept} graduate, happy to mentor students on ${pick(INTEREST_POOL).toLowerCase()}.`,
      skills: pick(SKILL_POOL, 3),
      experience: [`${2 + Math.floor(Math.random() * 10)}+ years in the field`],
      achievements: [],
    });
  }
  const bulkAlumni = await User.insertMany(bulkAlumniDocs);

  console.log(`Demo roster ready: ${students.length + bulkStudents.length} students, ${alumni.length + bulkAlumni.length} alumni.`);
  // -------------------------------------------------------------------------

  console.log("Creating posts...");
  await Post.insertMany([
    { author: rahim._id, content: "Just finished my first React + Node.js project! Any tips for landing a summer internship?", category: "Career" },
    { author: john._id, content: "Hosting an AI/ML Career Workshop next week — would love to see students there. Link in workshops tab!", category: "Announcement" },
    { author: nadia._id, content: "Sharing my notes on breaking into management consulting straight out of university.", category: "Career" },
    { author: sadia._id, content: "Looking for teammates for a smart-agriculture IoT project. DM if interested!", category: "Project" },
    { author: karim._id, content: "AMA: 5 years as a backend engineer — ask me anything about system design interviews.", category: "Discussion" },
  ]);

  console.log("Creating workshops...");
  const workshop1 = await Workshop.create({
    title: "AI/ML Career Workshop", description: "A practical session on preparing for AI/ML internships and interviews.",
    category: "Career", host: john._id, date: new Date("2026-09-20T00:00:00Z"), time: "7:00 PM",
    durationMinutes: 90, mode: "Online", location: "Zoom (link sent after registration)",
    maxParticipants: 60, registrationDeadline: new Date("2026-09-19T00:00:00Z"), status: "upcoming",
  });
  const workshop2 = await Workshop.create({
    title: "Breaking Into Management Consulting", description: "Case interview basics and how to network into consulting firms.",
    category: "Career", host: nadia._id, date: new Date("2026-09-25T00:00:00Z"), time: "6:00 PM",
    durationMinutes: 60, mode: "Offline", location: "Business Building, Room 204",
    maxParticipants: 40, registrationDeadline: new Date("2026-09-24T00:00:00Z"), status: "upcoming",
  });
  const workshop3 = await Workshop.create({
    title: "System Design Bootcamp", description: "Deep dive into designing scalable backend systems.",
    category: "Technical", host: karim._id, date: new Date("2026-10-02T00:00:00Z"), time: "5:00 PM",
    durationMinutes: 120, mode: "Online", location: "Google Meet (link sent after registration)",
    maxParticipants: 50, registrationDeadline: new Date("2026-10-01T00:00:00Z"), status: "upcoming",
  });

  console.log("Creating registrations...");
  await Registration.insertMany([
    { workshop: workshop1._id, participant: rahim._id, status: "registered" },
    { workshop: workshop1._id, participant: sadia._id, status: "registered" },
    { workshop: workshop3._id, participant: rahim._id, status: "registered" },
    { workshop: workshop2._id, participant: tanvir._id, status: "registered" },
  ]);

  console.log("Creating connections...");
  await Connection.insertMany([
    { requester: rahim._id, recipient: john._id, status: "accepted" },
    { requester: sadia._id, recipient: karim._id, status: "pending" },
    { requester: tanvir._id, recipient: nadia._id, status: "accepted" },
    { requester: rahim._id, recipient: karim._id, status: "pending" },
  ]);

  console.log("Creating mentorship requests...");
  await Mentorship.insertMany([
    {
      student: rahim._id, alumni: john._id, topic: "AI / Machine Learning",
      message: "I am interested in starting a career in AI/ML and would like some guidance about preparing for internships.",
      status: "accepted",
      responses: [{ author: john._id, text: "Happy to help — let's start with your resume and a mock interview." }],
    },
    {
      student: sadia._id, alumni: karim._id, topic: "Backend Engineering",
      message: "Could you share how you prepared for backend engineering interviews?",
      status: "pending", responses: [],
    },
  ]);

  console.log("Creating notifications...");
  await Notification.insertMany([
    { user: rahim._id, type: "workshop_upcoming", text: 'Reminder: "AI/ML Career Workshop" is coming up soon.', link: `/workshops/${workshop1._id}` },
    { user: john._id, type: "mentorship_request", text: "Rahim Ahmed requested guidance on AI / Machine Learning", link: "/mentorship" },
    { user: karim._id, type: "connection_request", text: "Sadia Islam sent you a connection request", link: "/network" },
  ]);

  console.log("Creating activity log entries...");
  await Activity.insertMany([
    { actor: rahim._id, action: "registered as Student" },
    { actor: john._id, action: "created a workshop", targetType: "Workshop", targetId: workshop1._id },
    { actor: sadia._id, action: "registered for AI Workshop", targetType: "Workshop", targetId: workshop1._id },
    { actor: karim._id, action: "created a post" },
    { actor: tanvir._id, action: "connected with Alumni" },
  ]);

  console.log("\nSeed complete. Demo accounts (all use password:", process.env.SEED_DEMO_PASSWORD || "Demo@12345", "if you ever wire up password login):\n");
  console.log("Admin:  ", admin.email);
  students.forEach((s) => console.log("Student:", s.email));
  alumni.forEach((a) => console.log("Alumni: ", a.email));
  console.log("\nBut the frontend's Demo Login screen lets you pick any of these with ONE CLICK — no password needed.\n");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
