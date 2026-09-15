const bcrypt = require("bcryptjs");
const User = require("../models/User");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { generateToken, setTokenCookie } = require("../utils/generateToken");

const UNIVERSITY_DOMAIN = process.env.UNIVERSITY_EMAIL_DOMAIN || "";

// POST /api/auth/register
// Mirrors BG-03 onNewUserCreated: email domain decides role + verification status.

// anything else      -> alumni, pending verification (must be approved by an admin)
const register = asyncHandler(async (req, res) => {
  const { fullName, email, password, department, batchYear } = req.body;

  if (!fullName || !email || !password) {
    throw new ApiError(400, "fullName, email and password are required.");
  }
  if (password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters.");
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, "An account with that email already exists.");
  }

  const isStudent = email.toLowerCase().endsWith(UNIVERSITY_DOMAIN.toLowerCase());
  const role = isStudent ? "student" : "alumni";
  const verificationStatus = isStudent ? "verified" : "pending";

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    fullName,
    email: email.toLowerCase(),
    passwordHash,
    role,
    verificationStatus,
    department: department || null,
    batchYear: batchYear || null,
  });

  const token = generateToken(user._id);
  setTokenCookie(res, token);

  res.status(201).json({ success: true, user: user.toPublicJSON() });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required.");
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const token = generateToken(user._id);
  setTokenCookie(res, token);

  res.json({ success: true, user: user.toPublicJSON() });
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  res.clearCookie("token");
  res.json({ success: true });
});

// GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user.toPublicJSON() });
});

module.exports = { register, login, logout, me };
