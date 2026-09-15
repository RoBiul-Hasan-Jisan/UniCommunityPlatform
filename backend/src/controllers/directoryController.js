const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

// GET /api/directory
// Faceted search over verified alumni — replaces the Algolia-backed
// alumniDirectory collection with a direct, filtered Mongo query.
// Query params: q, department, batchYear, location, company, openToMentorship
const listDirectory = asyncHandler(async (req, res) => {
  const { q, department, batchYear, location, company, openToMentorship, page = 1, limit = 20 } = req.query;

  const filter = { role: "alumni", verificationStatus: "verified" };
  if (department) filter.department = department;
  if (batchYear) filter.batchYear = Number(batchYear);
  if (location) filter.location = new RegExp(location, "i");
  if (company) filter.currentCompany = new RegExp(company, "i");
  if (openToMentorship === "true") filter.openToMentorship = true;
  if (q) {
    filter.$or = [
      { fullName: new RegExp(q, "i") },
      { currentCompany: new RegExp(q, "i") },
      { jobTitle: new RegExp(q, "i") },
      { skills: new RegExp(q, "i") },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [alumni, total] = await Promise.all([
    User.find(filter).sort({ fullName: 1 }).skip(skip).limit(Number(limit)),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    alumni: alumni.map((a) => a.toPublicJSON()),
  });
});

// GET /api/directory/facets — distinct filter values for the search UI
const getFacets = asyncHandler(async (req, res) => {
  const filter = { role: "alumni", verificationStatus: "verified" };
  const [departments, batchYears, companies] = await Promise.all([
    User.distinct("department", filter),
    User.distinct("batchYear", filter),
    User.distinct("currentCompany", filter),
  ]);
  res.json({
    success: true,
    departments: departments.filter(Boolean),
    batchYears: batchYears.filter(Boolean).sort((a, b) => b - a),
    companies: companies.filter(Boolean),
  });
});

module.exports = { listDirectory, getFacets };
