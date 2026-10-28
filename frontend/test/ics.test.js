import test from "node:test";
import assert from "node:assert/strict";
import { buildIcs, parseTime, escapeText, fold } from "../lib/ics.js";

test("parseTime handles 12h, 24h and garbage", () => {
  assert.deepEqual(parseTime("6:30 PM"), { h: 18, m: 30 });
  assert.deepEqual(parseTime("12am"), { h: 0, m: 0 });
  assert.deepEqual(parseTime("12 PM"), { h: 12, m: 0 });
  assert.deepEqual(parseTime("18:05"), { h: 18, m: 5 });
  assert.equal(parseTime("evening"), null);
  assert.equal(parseTime("25:00"), null);
});

test("escapeText follows RFC 5545", () => {
  assert.equal(escapeText("a,b;c\\d\ne"), "a\\,b\\;c\\\\d\\ne");
});

test("long lines are folded under 75 chars", () => {
  const folded = fold("DESCRIPTION:" + "x".repeat(200)).split("\r\n");
  assert.ok(folded.length > 1);
  assert.ok(folded.every((l) => l.length <= 75));
  assert.ok(folded.slice(1).every((l) => l.startsWith(" ")));
});

test("event with a time becomes a timed VEVENT", () => {
  const ics = buildIcs({ _id: "abc", title: "Reunion, 2026", description: "Bring friends", date: "2026-12-05T00:00:00.000Z", time: "6:00 PM", location: "Main Hall" }, { now: new Date("2026-01-01T00:00:00Z") });
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /UID:abc@uniconnect/);
  assert.match(ics, /DTSTART:\d{8}T\d{6}Z/);
  assert.match(ics, /DTEND:\d{8}T\d{6}Z/);
  assert.match(ics, /SUMMARY:Reunion\\, 2026/);
  assert.match(ics, /LOCATION:Main Hall/);
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
});

test("event without a usable time becomes all-day", () => {
  const ics = buildIcs({ _id: "x", title: "Meetup", date: "2026-12-05T12:00:00.000Z", time: "TBA" });
  assert.match(ics, /DTSTART;VALUE=DATE:\d{8}/);
  assert.match(ics, /DTEND;VALUE=DATE:\d{8}/);
});
