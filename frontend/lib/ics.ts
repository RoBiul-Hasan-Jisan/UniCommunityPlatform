// Builds an iCalendar (.ics) file for an event so people can add it to
// Google / Apple / Outlook calendars. Pure functions — easy to unit test.

function pad(n) { return String(n).padStart(2, "0"); }

// "6:30 PM", "18:30", "6pm" -> { h, m } | null
export function parseTime(str = "") {
  const m = String(str).trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ap = m[3]?.toLowerCase();
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return { h, m: min };
}

function utcStamp(d) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}
function dateOnly(d) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

// RFC 5545 text escaping
export function escapeText(s = "") {
  return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

// Lines must be folded at 75 octets; continuation lines start with a space.
export function fold(line) {
  const out = [];
  let rest = line;
  while (rest.length > 74) { out.push(rest.slice(0, 74)); rest = " " + rest.slice(74); }
  out.push(rest);
  return out.join("\r\n");
}

export function buildIcs(event, { durationMinutes = 120, now = new Date() } = {}) {
  const start = new Date(event.date);
  const t = parseTime(event.time);
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//UniConnect//Events//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT"];
  lines.push(`UID:${event._id}@uniconnect`);
  lines.push(`DTSTAMP:${utcStamp(now)}`);

  if (t) {
    // Treat date + time as the viewer's local time.
    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate(), t.h, t.m);
    const e = new Date(s.getTime() + durationMinutes * 60000);
    lines.push(`DTSTART:${utcStamp(s)}`, `DTEND:${utcStamp(e)}`);
  } else {
    // No usable time -> all-day event.
    const next = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    lines.push(`DTSTART;VALUE=DATE:${dateOnly(start)}`, `DTEND;VALUE=DATE:${dateOnly(next)}`);
  }

  lines.push(`SUMMARY:${escapeText(event.title)}`);
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function downloadIcs(event) {
  const blob = new Blob([buildIcs(event)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(event.title || "event").replace(/[^\w]+/g, "-").toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
