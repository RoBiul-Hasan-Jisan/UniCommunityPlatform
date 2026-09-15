const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");

// Reads JWT from httpOnly cookie (or Authorization: Bearer header as a fallback
// for non-browser clients), verifies it, and attaches req.user.
const protect = asyncHandler(async (req, res, next) => {
  let token = req.cookies?.token;
  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    throw new ApiError(401, "Not authenticated. Please log in.");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new ApiError(401, "Session expired or invalid. Please log in again.");
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    throw new ApiError(401, "User no longer exists.");
  }

  req.user = user;
  next();
});

// Equivalent to requireRole() in the original Cloud Functions utils.
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    throw new ApiError(403, `This action requires one of these roles: ${roles.join(", ")}.`);
  }
  next();
};

module.exports = { protect, requireRole };
