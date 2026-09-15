const Event = require("../models/Event");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function formatDisplayDate(date) {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}
function formatDisplayTime(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const amPm = hours >= 12 ? "PM" : "AM";
  return `${hours > 12 ? hours - 12 : hours || 12}:${minutes} ${amPm}`;
}

// GET /api/events
const listEvents = asyncHandler(async (req, res) => {
  const { upcoming } = req.query;
  const filter = {};
  if (upcoming === "true") filter.dateTime = { $gte: new Date() };
  const events = await Event.find(filter).sort({ dateTime: 1 });
  res.json({ success: true, events });
});

// GET /api/events/:id
const getEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new ApiError(404, "Event not found.");
  res.json({ success: true, event });
});

// POST /api/events  (admin only) — mirrors CF-07 createEvent.
const createEvent = asyncHandler(async (req, res) => {
  const { title, description, tag, dateTime, location, isOnline, maxAttendees, bannerUrl } = req.body;

  if (!title) throw new ApiError(400, "title is required.");
  if (!description) throw new ApiError(400, "description is required.");
  if (!tag) throw new ApiError(400, "tag is required.");
  if (!dateTime) throw new ApiError(400, "dateTime (ISO string) is required.");
  if (!location) throw new ApiError(400, "location is required.");
  if (typeof maxAttendees !== "number" || maxAttendees < 1) {
    throw new ApiError(400, "maxAttendees must be a positive number.");
  }

  const parsedDate = new Date(dateTime);
  if (isNaN(parsedDate.getTime())) throw new ApiError(400, "dateTime must be a valid ISO date string.");

  const event = await Event.create({
    title,
    description,
    tag: tag.toUpperCase(),
    dateTime: parsedDate,
    date: formatDisplayDate(parsedDate),
    time: formatDisplayTime(parsedDate),
    location,
    bannerUrl: bannerUrl || null,
    isOnline: !!isOnline,
    maxAttendees,
    postedByAdminId: req.user._id,
  });

  res.status(201).json({ success: true, event });
});

// PATCH /api/events/:id/rsvp  { action: "rsvp" | "cancel" }
// Mirrors CF-05 rsvpEvent. Uses an atomic conditional update instead of a
// Firestore-style transaction (a standalone MongoDB instance has no
// multi-document transactions), which is safe under concurrent requests.
const rsvpEvent = asyncHandler(async (req, res) => {
  const { action } = req.body;
  if (!["rsvp", "cancel"].includes(action)) {
    throw new ApiError(400, "action must be 'rsvp' or 'cancel'.");
  }

  const event = await Event.findById(req.params.id);
  if (!event) throw new ApiError(404, "Event not found.");

  const alreadyRsvped = event.rsvpUserIds.some((id) => String(id) === String(req.user._id));

  if (action === "rsvp") {
    if (alreadyRsvped) return res.json({ success: true, newRsvpCount: event.rsvpCount });
    if (event.rsvpCount >= event.maxAttendees) throw new ApiError(409, "This event is at full capacity.");

    const updated = await Event.findOneAndUpdate(
      { _id: event._id, rsvpUserIds: { $ne: req.user._id }, rsvpCount: { $lt: event.maxAttendees } },
      { $addToSet: { rsvpUserIds: req.user._id }, $inc: { rsvpCount: 1 } },
      { new: true }
    );
    if (!updated) throw new ApiError(409, "This event is at full capacity.");
    return res.json({ success: true, newRsvpCount: updated.rsvpCount });
  } else {
    if (!alreadyRsvped) return res.json({ success: true, newRsvpCount: event.rsvpCount });
    const updated = await Event.findOneAndUpdate(
      { _id: event._id, rsvpUserIds: req.user._id },
      { $pull: { rsvpUserIds: req.user._id }, $inc: { rsvpCount: -1 } },
      { new: true }
    );
    return res.json({ success: true, newRsvpCount: updated.rsvpCount });
  }
});

module.exports = { listEvents, getEvent, createEvent, rsvpEvent };
