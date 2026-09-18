/**
 * Cover page PDF engine.
 * Drop this file in your project (suggested path: lib/coverPdf.js) and call
 * `downloadCoverPdf({ template, form, logo })` from the UI.
 *
 * Why this exists: the original code drew every template with hard-coded Y
 * positions, so a long university name or a three-line title silently
 * overlapped the block below it, and short forms left a big hole at the bottom.
 * Here every template is drawn twice — once invisibly to measure, once for
 * real — so the content block is optically centred and nothing can collide.
 */

// ---------------------------------------------------------------- constants

const INK = [18, 25, 43];
const BRASS = [171, 129, 46];
const MUTED = [122, 126, 138];
const HAIRLINE = [214, 216, 222];
const WHITE = [255, 255, 255];

const NAVY = [20, 30, 70];
const ROYAL = [30, 60, 150];
const AMBER = [198, 104, 22];
const FOREST = [20, 120, 70];
const COBALT = [30, 50, 140];

const LH = 1.34; // line-height multiplier for body text
const LH_TIGHT = 1.18; // for large display type

// ---------------------------------------------------------------- painter

/**
 * Wraps jsPDF so drawing calls can be switched off. Measurement passes run
 * with `enabled = false`: text metrics still work (they come from the font
 * tables, not the canvas) but nothing is committed to the page.
 */
function createPainter(doc) {
  const p = {
    enabled: true,
    text: (...a) => p.enabled && doc.text(...a),
    rect: (...a) => p.enabled && doc.rect(...a),
    roundedRect: (...a) => p.enabled && doc.roundedRect(...a),
    line: (...a) => p.enabled && doc.line(...a),
    triangle: (...a) => p.enabled && doc.triangle(...a),
    lines: (...a) => p.enabled && doc.lines(...a),
    addImage: (...a) => p.enabled && doc.addImage(...a),
  };
  return p;
}

// ---------------------------------------------------------------- text

function setType(doc, { font = "helvetica", style = "normal", size = 11, color = INK }) {
  doc.setFont(font, style);
  doc.setFontSize(size);
  doc.setTextColor(color[0], color[1], color[2]);
}

/** Draws one line, optionally letter-spaced, with manual alignment maths. */
function drawLine(c, line, x, y, align, track) {
  if (!track) {
    c.P.text(line, x, y, { align });
    return;
  }
  const w = c.doc.getTextWidth(line) + track * Math.max(0, line.length - 1);
  const sx = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  c.P.text(line, sx, y, { charSpace: track });
}

/**
 * Draws a wrapped text block. `y` is the baseline of the first line.
 * Returns the baseline that the *next* block should start from.
 */
function text(c, str, opts) {
  const s = str == null ? "" : String(str).trim();
  if (!s) return opts.y;
  const { x, y, maxW, align = "left", lh = LH, track = 0, size = 11 } = opts;
  setType(c.doc, opts);
  const lines = c.doc.splitTextToSize(s, maxW);
  const step = size * lh;
  let cy = y;
  for (const ln of lines) {
    drawLine(c, ln, x, cy, align, track);
    cy += step;
  }
  return cy;
}

/** Shrinks a display size until the text fits inside `maxLines`. */
function fitSize(doc, str, { maxW, maxLines = 3, max = 26, min = 14, font, style }) {
  const s = String(str || "");
  for (let size = max; size > min; size -= 0.5) {
    doc.setFont(font, style);
    doc.setFontSize(size);
    if (doc.splitTextToSize(s, maxW).length <= maxLines) return size;
  }
  return min;
}

/** A labelled stack of detail lines (the "Submitted by" columns). */
function detailColumn(c, { x, y, w, label, lines, align = "left", theme }) {
  const rows = (lines || []).filter(Boolean);
  if (!rows.length && !label) return y;
  let cy = y;
  if (label) {
    cy = text(c, label, {
      x, y: cy, maxW: w, align,
      font: theme.labelFont, style: "bold", size: theme.labelSize,
      color: theme.labelColor, track: theme.labelTrack, lh: 1.2,
    });
    cy += theme.labelSize * 0.55;
  }
  for (const row of rows) {
    cy = text(c, row, {
      x, y: cy, maxW: w, align,
      font: theme.bodyFont, style: "normal", size: theme.bodySize,
      color: theme.bodyColor, lh: LH,
    });
  }
  return cy;
}

// ---------------------------------------------------------------- logo

function fitted(natW, natH, maxW, maxH) {
  const r = Math.min(maxW / natW, maxH / natH);
  return { w: natW * r, h: natH * r };
}

function drawLogo(c, x, y, maxW, maxH, align = "left") {
  if (!c.logo) return 0;
  const { w, h } = fitted(c.logo.naturalWidth, c.logo.naturalHeight, maxW, maxH);
  const dx = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  c.P.addImage(c.logo.dataUrl, c.logo.format, dx, y, w, h, undefined, "FAST");
  return h;
}

/**
 * Re-encodes any uploaded image to PNG at a sane resolution.
 * Fixes three real problems: WebP/SVG/GIF uploads that jsPDF refuses, huge
 * phone photos that bloat the PDF, and transparent logos being mislabelled
 * as JPEG.
 */
export function normalizeLogo(file, { maxEdge = 600 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That image could not be opened."));
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve({
          dataUrl: canvas.toDataURL("image/png"),
          format: "PNG",
          naturalWidth: w,
          naturalHeight: h,
        });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------- content

function clean(v) {
  return String(v || "").replace(/\s+/g, " ").trim();
}

function buildContent(form) {
  const f = (k) => clean(form[k]);
  const parsed = new Date(form.date);
  const date = isNaN(parsed)
    ? ""
    : parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  const legacyDept = f("department");
  const headerDept = f("headerDepartment") || legacyDept;

  return {
    uni: f("university") || "University Name",
    dept: headerDept, // alias kept so header code reads the same
    headerDept,
    studentDept: f("studentDepartment") || headerDept,
    facultyDept: f("facultyDepartment") || headerDept,
    courseCode: f("courseCode"),
    courseTitle: f("courseTitle"),
    title: f("assignmentTitle") || "Assignment Title",
    subtitle: f("assignmentType"),
    student: f("studentName"),
    studentId: f("studentId"),
    section: f("section"),
    semester: f("semester"),
    session: f("academicSession"),
    teacher: f("instructorName"),
    teacherRole: f("instructorDesignation"),
    teacher2: f("instructor2Name"),
    teacher2Role: f("instructor2Designation"),
    date,
    get course() {
      return [this.courseCode, this.courseTitle].filter(Boolean).join(" — ");
    },
    get studentLines() {
      return [
        this.student,
        this.studentId && `ID: ${this.studentId}`,
        this.section && `Section: ${this.section}`,
        this.semester && `Semester: ${this.semester}`,
        this.session && `Session: ${this.session}`,
      ].filter(Boolean);
    },
    get teacherLines() {
      const lines = [this.teacher, this.teacherRole, this.facultyDept].filter(Boolean);
      if (this.teacher2) {
        lines.push(`& ${[this.teacher2, this.teacher2Role].filter(Boolean).join(", ")}`);
      }
      return lines;
    },
    get teacher2Lines() {
      return [this.teacher2, this.teacher2Role, this.teacher2 && this.facultyDept].filter(Boolean);
    },
  };
}

// ---------------------------------------------------------------- themes

const SANS = {
  labelFont: "helvetica", labelSize: 9, labelTrack: 0.9, labelColor: MUTED,
  bodyFont: "helvetica", bodySize: 10.5, bodyColor: [45, 48, 58],
};
const SERIF = {
  labelFont: "times", labelSize: 11.5, labelTrack: 0, labelColor: INK,
  bodyFont: "times", bodySize: 11.5, bodyColor: [45, 48, 58],
};

// ---------------------------------------------------------------- templates

/**
 * Each template supplies:
 *   chrome(c)         page furniture drawn at fixed positions (frames, bands, footer)
 *   region(c)         [top, bottom] the vertical band the body may occupy
 *   body(c, y)        draws the content stack from baseline `y`, returns end y
 */
const TEMPLATES = {
  // The one, carefully composed layout — centred, timeless, logo-aware,
  // with a title that shrinks to fit rather than ever overflowing, and a
  // slim brass rule as the one accent color on an otherwise quiet page.
  classic: {
    chrome(c) {
      c.doc.setDrawColor(...INK);
      c.doc.setLineWidth(1.1);
      c.P.rect(30, 30, c.W - 60, c.H - 60);
      c.doc.setLineWidth(0.4);
      c.P.rect(36, 36, c.W - 72, c.H - 72);
      if (c.t.date) {
        text(c, `Date of submission: ${c.t.date}`, {
          x: c.cx, y: c.H - 76, maxW: c.W - 180, align: "center",
          font: "times", style: "italic", size: 10.5, color: MUTED,
        });
      }
    },
    region: (c) => [78, c.H - 108],
    body(c, y) {
      const maxW = c.W - 180;
      if (c.logo) y += drawLogo(c, c.cx, y, 72, 72, "center") + 26;
      y = text(c, c.t.uni, { x: c.cx, y, maxW, align: "center", font: "times", style: "bold", size: 19, lh: LH_TIGHT });
      if (c.t.dept) y = text(c, c.t.dept, { x: c.cx, y: y + 6, maxW, align: "center", font: "times", size: 12.5, color: MUTED });
      if (c.t.course) y = text(c, c.t.course, { x: c.cx, y: y + 22, maxW, align: "center", font: "times", size: 12.5, color: [70, 74, 86] });

      y += 42;
      if (c.t.subtitle) y = text(c, c.t.subtitle, { x: c.cx, y, maxW, align: "center", font: "times", style: "italic", size: 12, color: MUTED }) + 8;
      const size = fitSize(c.doc, c.t.title, { maxW, maxLines: 3, max: 24, min: 16, font: "times", style: "bold" });
      y = text(c, c.t.title, { x: c.cx, y, maxW, align: "center", font: "times", style: "bold", size, lh: LH_TIGHT });

      y += 20;
      c.doc.setDrawColor(...BRASS);
      c.doc.setLineWidth(1.4);
      c.P.line(c.cx - 34, y, c.cx + 34, y);
      y += 44;

      const colW = (c.W - 200) / 2;
      const lx = 100;
      const rx = c.cx + 20;
      const a = detailColumn(c, { x: lx, y, w: colW, label: "Submitted by", lines: c.t.studentLines, theme: SERIF });
      const b = detailColumn(c, { x: rx, y, w: colW, label: "Submitted to", lines: c.t.teacherLines, theme: SERIF });
      return Math.max(a, b);
    },
  },
};

export const TEMPLATE_IDS = Object.keys(TEMPLATES);

// ---------------------------------------------------------------- build

export async function buildCoverPdf({ template = "classic", form = {}, logo = null }) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const P = createPainter(doc);
  const t = buildContent(form);

  const c = {
    doc, P, logo, t,
    W: doc.internal.pageSize.getWidth(),
    H: doc.internal.pageSize.getHeight(),
    get cx() { return this.W / 2; },
  };

  const tpl = TEMPLATES[template] || TEMPLATES.classic;
  const [top, bottom] = tpl.region(c);

  // Pass 1 — measure with drawing switched off.
  P.enabled = false;
  const measuredEnd = tpl.body(c, top);
  P.enabled = true;

  // Pass 2 — draw, optically centred inside the region (55% above / 45% below
  // reads better than dead-centre on a portrait page).
  const slack = Math.max(0, bottom - measuredEnd);
  tpl.chrome(c);
  tpl.body(c, top + slack * 0.45);

  doc.setProperties({
    title: t.title,
    subject: [t.courseCode, t.courseTitle].filter(Boolean).join(" — ") || t.title,
    author: t.student || t.uni,
    creator: t.uni,
  });

  return doc;
}

export function coverFileName(form = {}) {
  const parts = [clean(form.courseCode), clean(form.assignmentTitle) || "cover page"];
  const base = parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 70)
    .replace(/^-|-$/g, "");
  return `${base || "cover-page"}.pdf`;
}

export async function downloadCoverPdf(opts) {
  const doc = await buildCoverPdf(opts);
  doc.save(coverFileName(opts.form));
  return doc;
}

/** Returns a blob URL for an on-screen preview iframe, if you ever want one. */
export async function previewCoverPdfUrl(opts) {
  const doc = await buildCoverPdf(opts);
  return URL.createObjectURL(doc.output("blob"));
}