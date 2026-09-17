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
      return [this.teacher, this.teacherRole, this.facultyDept].filter(Boolean);
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
  // -------------------------------------------------------------- classic
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

      y += 26;
      c.doc.setDrawColor(...HAIRLINE);
      c.doc.setLineWidth(0.6);
      c.P.line(c.cx - 70, y, c.cx + 70, y);
      y += 44;

      const colW = (c.W - 200) / 2;
      const lx = 100;
      const rx = c.cx + 20;
      const a = detailColumn(c, { x: lx, y, w: colW, label: "Submitted by", lines: c.t.studentLines, theme: SERIF });
      const b = detailColumn(c, { x: rx, y, w: colW, label: "Submitted to", lines: c.t.teacherLines, theme: SERIF });
      return Math.max(a, b);
    },
  },

  // --------------------------------------------------------------- modern
  modern: {
    chrome(c) {
      c.doc.setFillColor(...INK);
      c.P.rect(0, 0, c.W, 168, "F");
      c.doc.setFillColor(...BRASS);
      c.P.rect(0, 168, c.W, 5, "F");

      const x = c.logo ? 132 : 56;
      if (c.logo) drawLogo(c, 56, 46, 60, 60, "left");
      let y = text(c, c.t.uni, { x, y: 68, maxW: c.W - x - 56, font: "helvetica", style: "bold", size: 17, color: WHITE, lh: LH_TIGHT });
      if (c.t.dept) text(c, c.t.dept, { x, y: y + 5, maxW: c.W - x - 56, font: "helvetica", size: 10.5, color: [196, 186, 158] });
      if (c.t.course) {
        text(c, c.t.course, { x: 56, y: 146, maxW: c.W - 112, font: "helvetica", size: 10, color: [168, 172, 186], track: 0.4 });
      }
      if (c.t.date) {
        text(c, `Date of submission: ${c.t.date}`, { x: 56, y: c.H - 58, maxW: c.W - 112, font: "helvetica", size: 10, color: MUTED });
      }
    },
    region: (c) => [240, c.H - 90],
    body(c, y) {
      const maxW = c.W - 112;
      if (c.t.subtitle) y = text(c, c.t.subtitle, { x: 56, y, maxW, font: "helvetica", style: "bold", size: 10.5, color: BRASS, track: 0.8 }) + 8;
      const size = fitSize(c.doc, c.t.title, { maxW, maxLines: 3, max: 27, min: 18, font: "helvetica", style: "bold" });
      y = text(c, c.t.title, { x: 56, y, maxW, align: "left", font: "helvetica", style: "bold", size, lh: LH_TIGHT, color: INK });

      y += 34;
      const colW = (maxW - 56) / 2;
      const boxTop = y - 24;
      const a = detailColumn(c, { x: 80, y, w: colW, label: "Submitted by", lines: c.t.studentLines, theme: SANS });
      const b = detailColumn(c, { x: c.cx + 8, y, w: colW, label: "Submitted to", lines: c.t.teacherLines, theme: SANS });
      const end = Math.max(a, b);

      // Panel is drawn after measuring so it always hugs the content.
      if (c.P.enabled) {
        c.doc.setFillColor(246, 244, 238);
        c.doc.roundedRect(56, boxTop, maxW, end - boxTop + 18, 10, 10, "F");
        // repaint the columns on top of the panel
        detailColumn(c, { x: 80, y, w: colW, label: "Submitted by", lines: c.t.studentLines, theme: SANS });
        detailColumn(c, { x: c.cx + 8, y, w: colW, label: "Submitted to", lines: c.t.teacherLines, theme: SANS });
      }
      return end + 18;
    },
  },

  // -------------------------------------------------------------- minimal
  minimal: {
    chrome() {},
    region: (c) => [120, c.H - 96],
    body(c, y) {
      const maxW = c.W - 190;
      if (c.logo) y += drawLogo(c, c.cx, y, 54, 54, "center") + 26;
      y = text(c, c.t.uni, { x: c.cx, y, maxW, align: "center", font: "helvetica", size: 11.5, track: 1.1, color: INK });
      if (c.t.dept) y = text(c, c.t.dept, { x: c.cx, y: y + 4, maxW, align: "center", font: "helvetica", size: 10, color: MUTED });

      y += 54;
      if (c.t.subtitle) y = text(c, c.t.subtitle, { x: c.cx, y, maxW, align: "center", font: "helvetica", size: 10.5, color: MUTED, track: 0.8 }) + 10;
      const size = fitSize(c.doc, c.t.title, { maxW, maxLines: 3, max: 28, min: 18, font: "helvetica", style: "normal" });
      y = text(c, c.t.title, { x: c.cx, y, maxW, align: "center", font: "helvetica", size, lh: LH_TIGHT, color: INK });
      if (c.t.course) y = text(c, c.t.course, { x: c.cx, y: y + 10, maxW, align: "center", font: "helvetica", size: 10.5, color: MUTED });

      y += 34;
      c.doc.setDrawColor(...HAIRLINE);
      c.doc.setLineWidth(0.6);
      c.P.line(c.cx - 26, y, c.cx + 26, y);
      y += 44;

      const rows = [
        ["Name", c.t.student], ["Student ID", c.t.studentId], ["Department", c.t.studentDept],
        ["Section", c.t.section], ["Semester", c.t.semester], ["Session", c.t.session],
        ["Instructor", c.t.teacher], ["Designation", c.t.teacherRole], ["Date", c.t.date],
      ].filter(([, v]) => v);

      const half = 112;
      for (const [label, value] of rows) {
        text(c, label, { x: c.cx - half, y, maxW: half, font: "helvetica", size: 10, color: MUTED });
        const after = text(c, value, { x: c.cx + half, y, maxW: half * 1.4, align: "right", font: "helvetica", style: "bold", size: 10.5, color: INK });
        y = after + 8;
      }
      return y;
    },
  },

  // -------------------------------------------------------------- elegant
  elegant: {
    chrome(c) {
      c.doc.setDrawColor(...BRASS);
      c.doc.setLineWidth(1.3);
      c.P.rect(26, 26, c.W - 52, c.H - 52);
      c.doc.setLineWidth(0.5);
      c.P.rect(34, 34, c.W - 68, c.H - 68);

      const dy = 60;
      c.doc.setFillColor(...BRASS);
      c.P.triangle(c.cx - 5, dy, c.cx, dy - 5, c.cx + 5, dy, "F");
      c.P.triangle(c.cx - 5, dy, c.cx, dy + 5, c.cx + 5, dy, "F");

      if (c.t.date) {
        text(c, `Date of submission: ${c.t.date}`, {
          x: c.cx, y: c.H - 66, maxW: c.W - 180, align: "center",
          font: "times", style: "italic", size: 10.5, color: MUTED,
        });
      }
    },
    region: (c) => [104, c.H - 100],
    body(c, y) {
      const maxW = c.W - 190;
      if (c.logo) y += drawLogo(c, c.cx, y, 64, 64, "center") + 24;
      y = text(c, c.t.uni, { x: c.cx, y, maxW, align: "center", font: "times", style: "bolditalic", size: 20, lh: LH_TIGHT });
      if (c.t.dept) y = text(c, c.t.dept, { x: c.cx, y: y + 5, maxW, align: "center", font: "times", style: "italic", size: 11.5, color: [126, 112, 82] });

      y += 24;
      c.doc.setDrawColor(...BRASS);
      c.doc.setLineWidth(0.7);
      c.P.line(c.cx - 62, y, c.cx + 62, y);
      c.P.line(c.cx - 62, y + 3.2, c.cx + 62, y + 3.2);
      y += 42;

      if (c.t.subtitle) y = text(c, c.t.subtitle, { x: c.cx, y, maxW, align: "center", font: "times", style: "italic", size: 11.5, color: BRASS }) + 8;
      const size = fitSize(c.doc, c.t.title, { maxW, maxLines: 3, max: 23, min: 16, font: "times", style: "bold" });
      y = text(c, c.t.title, { x: c.cx, y, maxW, align: "center", font: "times", style: "bold", size, lh: LH_TIGHT });
      if (c.t.course) y = text(c, c.t.course, { x: c.cx, y: y + 10, maxW, align: "center", font: "times", style: "italic", size: 11.5, color: MUTED });

      y += 46;
      const colW = (c.W - 210) / 2;
      const theme = { ...SERIF, labelColor: BRASS, labelSize: 11.5 };
      const a = detailColumn(c, { x: 104, y, w: colW, label: "Submitted by", lines: c.t.studentLines, theme });
      const b = detailColumn(c, { x: c.cx + 24, y, w: colW, label: "Submitted to", lines: c.t.teacherLines, theme });
      return Math.max(a, b);
    },
  },

  // ----------------------------------------------------------------- bold
  bold: {
    chrome(c) {
      c.doc.setFillColor(...INK);
      c.P.lines([[c.W, 0], [0, 108], [-c.W, 56]], 0, 0, [1, 1], "F", true);
      c.doc.setFillColor(...BRASS);
      c.P.lines([[c.W, 0], [0, 8], [-c.W, 8]], 0, 108, [1, 1], "F", true);

      const x = c.logo ? 124 : 56;
      if (c.logo) drawLogo(c, 56, 34, 54, 54, "left");
      const y = text(c, c.t.uni, { x, y: 58, maxW: c.W - x - 56, font: "helvetica", style: "bold", size: 17, color: WHITE, lh: LH_TIGHT });
      if (c.t.dept) text(c, c.t.dept, { x, y: y + 4, maxW: c.W - x - 56, font: "helvetica", size: 10.5, color: [208, 198, 168] });

      if (c.t.date) {
        text(c, `Date of submission: ${c.t.date}`, { x: 56, y: c.H - 58, maxW: c.W - 112, font: "helvetica", size: 10, color: MUTED });
      }
    },
    region: (c) => [236, c.H - 92],
    body(c, y) {
      const maxW = c.W - 112;
      if (c.t.subtitle) y = text(c, c.t.subtitle, { x: 56, y, maxW, font: "helvetica", style: "bold", size: 11, color: BRASS, track: 0.8 }) + 8;
      const size = fitSize(c.doc, c.t.title, { maxW, maxLines: 3, max: 30, min: 19, font: "helvetica", style: "bold" });
      y = text(c, c.t.title, { x: 56, y, maxW, align: "left", font: "helvetica", style: "bold", size, lh: LH_TIGHT });
      if (c.t.course) y = text(c, c.t.course, { x: 56, y: y + 8, maxW, font: "helvetica", size: 11.5, color: MUTED });

      y += 44;
      const colW = (maxW - 24) / 2;
      const cols = [
        { x: 56, label: "Submitted by", lines: c.t.studentLines },
        { x: 56 + colW + 24, label: "Submitted to", lines: c.t.teacherLines },
      ];
      let end = y;
      for (const col of cols) {
        const e = detailColumn(c, { x: col.x + 16, y, w: colW - 16, label: col.label, lines: col.lines, theme: SANS });
        c.doc.setFillColor(...BRASS);
        c.P.rect(col.x, y - 9, 3.5, e - y + 4, "F");
        end = Math.max(end, e);
      }
      return end;
    },
  },

  // ------------------------------------------------------------- academic
  academic: {
    chrome(c) {
      c.doc.setDrawColor(...INK);
      c.doc.setLineWidth(2.6);
      c.P.line(56, 56, c.W - 56, 56);
      c.doc.setLineWidth(0.8);
      c.P.line(56, 62, c.W - 56, 62);
      c.doc.setLineWidth(0.8);
      c.P.line(56, c.H - 62, c.W - 56, c.H - 62);
      c.doc.setLineWidth(2.6);
      c.P.line(56, c.H - 56, c.W - 56, c.H - 56);
      if (c.t.date) {
        text(c, c.t.date, { x: c.cx, y: c.H - 78, maxW: c.W - 160, align: "center", font: "times", style: "italic", size: 10.5, color: MUTED });
      }
    },
    region: (c) => [110, c.H - 104],
    body(c, y) {
      const maxW = c.W - 180;
      if (c.logo) y += drawLogo(c, c.cx, y, 58, 58, "center") + 22;
      y = text(c, c.t.uni, { x: c.cx, y, maxW, align: "center", font: "times", style: "bold", size: 15, track: 0.6, lh: LH_TIGHT });
      if (c.t.dept) y = text(c, c.t.dept, { x: c.cx, y: y + 5, maxW, align: "center", font: "times", size: 11, color: MUTED });

      y += 34;
      const intro = c.t.subtitle
        ? `A ${c.t.subtitle.toLowerCase()} submitted in partial fulfilment of the requirements for`
        : "A report submitted in partial fulfilment of the requirements for";
      y = text(c, intro, { x: c.cx, y, maxW, align: "center", font: "times", style: "italic", size: 11, color: MUTED });
      if (c.t.course) y = text(c, c.t.course, { x: c.cx, y: y + 6, maxW, align: "center", font: "times", style: "bold", size: 12 });

      y += 40;
      const size = fitSize(c.doc, c.t.title, { maxW, maxLines: 3, max: 22, min: 15, font: "times", style: "bold" });
      y = text(c, c.t.title, { x: c.cx, y, maxW, align: "center", font: "times", style: "bold", size, lh: LH_TIGHT });

      y += 48;
      y = text(c, "Submitted by", { x: c.cx, y, maxW, align: "center", font: "times", size: 11, color: MUTED });
      y = text(c, c.t.student || "Student Name", { x: c.cx, y: y + 6, maxW, align: "center", font: "times", style: "bold", size: 13 });
      const idLine = [c.t.studentId && `ID: ${c.t.studentId}`, c.t.section && `Section: ${c.t.section}`, c.t.session || c.t.semester].filter(Boolean).join("   ·   ");
      if (idLine) y = text(c, idLine, { x: c.cx, y: y + 3, maxW, align: "center", font: "times", size: 10.5, color: MUTED });

      y += 30;
      y = text(c, "Supervised by", { x: c.cx, y, maxW, align: "center", font: "times", size: 11, color: MUTED });
      y = text(c, c.t.teacher || "Instructor Name", { x: c.cx, y: y + 6, maxW, align: "center", font: "times", style: "bold", size: 13 });
      if (c.t.teacherRole) y = text(c, c.t.teacherRole, { x: c.cx, y: y + 3, maxW, align: "center", font: "times", size: 10.5, color: MUTED });
      return y;
    },
  },

  // --------------------------------------------------------------- banner
  banner: {
    chrome(c) {
      if (!c.t.date) return;
      c.doc.setFillColor(...NAVY);
      c.P.roundedRect(c.cx - 118, c.H - 94, 236, 32, 16, 16, "F");
      text(c, `Submitted on ${c.t.date}`, { x: c.cx, y: c.H - 73, maxW: 212, align: "center", font: "helvetica", style: "bold", size: 10.5, color: WHITE });
    },
    region: (c) => [72, c.H - 116],
    body(c, y) {
      const maxW = c.W - 150;
      if (c.logo) y += drawLogo(c, c.cx, y, 56, 56, "center") + 18;
      y = text(c, c.t.uni, { x: c.cx, y, maxW, align: "center", font: "times", style: "bold", size: 18, track: 0.4, color: NAVY, lh: LH_TIGHT });
      if (c.t.dept) y = text(c, c.t.dept, { x: c.cx, y: y + 4, maxW, align: "center", font: "times", style: "italic", size: 10.5, color: [124, 42, 62] });

      // Pill banner sized to the title rather than a fixed 260pt box.
      y += 24;
      if (c.t.subtitle) y = text(c, c.t.subtitle, { x: c.cx, y, maxW, align: "center", font: "helvetica", size: 10.5, color: MUTED, track: 0.6 }) + 6;
      setType(c.doc, { font: "helvetica", style: "bold", size: 13 });
      const pillW = Math.min(maxW, Math.max(180, c.doc.getTextWidth(c.t.title) + 56));
      c.doc.setFillColor(...NAVY);
      c.P.roundedRect(c.cx - pillW / 2, y, pillW, 34, 17, 17, "F");
      text(c, c.t.title, { x: c.cx, y: y + 22, maxW: pillW - 36, align: "center", font: "helvetica", style: "bold", size: 13, color: WHITE });
      y += 34;

      const course = [c.t.courseCode && `Course code: ${c.t.courseCode}`, c.t.courseTitle].filter(Boolean).join("   ");
      if (course) y = text(c, course, { x: c.cx, y: y + 26, maxW, align: "center", font: "helvetica", size: 10.5, color: [56, 60, 70] });

      y += 30;
      const boxW = c.W - 140;
      const theme = { ...SANS, labelColor: NAVY, labelSize: 11.5, labelTrack: 0 };

      const boxes = [
        {
          label: "Submitted by",
          lines: [
            c.t.student && `Student name: ${c.t.student}`,
            c.t.studentId && `Student ID: ${c.t.studentId}`,
            c.t.section && `Section: ${c.t.section}`,
            c.t.session && `Session: ${c.t.session}`,
            c.t.studentDept,
          ].filter(Boolean),
        },
        {
          label: "Submitted to",
          lines: [c.t.teacher && `Faculty name: ${c.t.teacher}`, c.t.teacherRole, c.t.facultyDept].filter(Boolean),
        },
      ];
      for (const box of boxes) {
        const top = y;
        let cy = text(c, box.label, { x: c.cx, y: top + 22, maxW: boxW - 40, align: "center", font: "helvetica", style: "bold", size: 12, color: NAVY });
        cy += 6;
        for (const row of box.lines) {
          cy = text(c, row, { x: 92, y: cy, maxW: boxW - 44, font: "helvetica", size: 10.5, color: theme.bodyColor });
        }
        const boxH = cy - top + 8;
        c.doc.setDrawColor(...NAVY);
        c.doc.setLineWidth(0.9);
        c.P.roundedRect(70, top, boxW, boxH, 10, 10);
        y = top + boxH + 22;
      }
      return y;
    },
  },

  // ---------------------------------------------------------- dualFaculty
  dualFaculty: {
    chrome(c) {
      if (c.t.date) {
        text(c, `Date of submission: ${c.t.date}`, { x: 70, y: c.H - 68, maxW: c.W - 140, font: "helvetica", style: "bold", size: 10.5, color: ROYAL });
      }
    },
    region: (c) => [92, c.H - 96],
    body(c, y) {
      const maxW = c.W - 140;
      if (c.logo) y += drawLogo(c, c.cx, y, 54, 54, "center") + 18;
      y = text(c, c.t.uni, { x: c.cx, y, maxW, align: "center", font: "helvetica", style: "bold", size: 16, color: ROYAL, lh: LH_TIGHT });
      if (c.t.dept) y = text(c, c.t.dept, { x: c.cx, y: y + 6, maxW, align: "center", font: "helvetica", style: "bold", size: 13, color: ROYAL, lh: LH_TIGHT });

      y += 30;
      y = text(c, c.t.subtitle || "Assignment", { x: c.cx, y, maxW, align: "center", font: "helvetica", style: "bold", size: 15, color: AMBER });
      y = text(c, c.t.title, { x: c.cx, y: y + 8, maxW, align: "center", font: "helvetica", style: "bold", size: 12, color: INK, lh: 1.25 });

      y += 30;
      if (c.t.courseTitle) y = text(c, `Course title:  ${c.t.courseTitle}`, { x: 70, y, maxW, font: "helvetica", style: "bold", size: 11.5, color: ROYAL });
      if (c.t.courseCode) y = text(c, `Course code:  ${c.t.courseCode}`, { x: 70, y: y + 3, maxW, font: "helvetica", style: "bold", size: 11.5, color: ROYAL });

      y += 28;
      y = text(c, "Submitted to", { x: 70, y, maxW, font: "helvetica", style: "bold", size: 11.5, color: ROYAL });
      y += 8;
      const colW = (maxW - 40) / 2;
      const a = detailColumn(c, { x: 90, y, w: colW, lines: c.t.teacherLines, theme: SANS });
      const b = c.t.teacher2 ? detailColumn(c, { x: c.cx + 10, y, w: colW, lines: c.t.teacher2Lines, theme: SANS }) : y;
      y = Math.max(a, b) + 26;

      y = text(c, "Submitted by", { x: 70, y, maxW, font: "helvetica", style: "bold", size: 11.5, color: ROYAL });
      y += 8;
      const studentLines = [
        c.t.student,
        c.t.studentId && `Reg. no.  ${c.t.studentId}`,
        c.t.section && `Section: ${c.t.section}`,
        c.t.session && `Session: ${c.t.session}`,
        c.t.studentDept,
      ].filter(Boolean);
      return detailColumn(c, { x: 90, y, w: maxW - 20, lines: studentLines, theme: SANS });
    },
  },

  // ---------------------------------------------------------- sealDivider
  sealDivider: {
    chrome(c) {
      if (c.t.date) {
        text(c, `Date of submission: ${c.t.date}`, { x: c.cx, y: c.H - 68, maxW: c.W - 140, align: "center", font: "helvetica", style: "italic", size: 10, color: MUTED });
      }
    },
    region: (c) => [64, c.H - 96],
    body(c, y) {
      const maxW = c.W - 130;
      y = text(c, c.t.uni, { x: c.cx, y, maxW, align: "center", font: "helvetica", style: "bold", size: 15, track: 0.5, color: FOREST, lh: LH_TIGHT });
      if (c.logo) y += drawLogo(c, c.cx, y + 14, 70, 70, "center") + 32;
      else y += 16;
      if (c.t.dept) y = text(c, c.t.dept, { x: c.cx, y, maxW, align: "center", font: "helvetica", style: "bold", size: 12.5, track: 0.5, color: ROYAL });

      y += 20;
      c.doc.setDrawColor(...HAIRLINE);
      c.doc.setLineWidth(0.7);
      c.P.line(60, y, c.W - 60, y);
      y += 28;

      y = text(c, c.t.subtitle || "Assignment on", { x: c.cx, y, maxW, align: "center", font: "helvetica", style: "bold", size: 11, color: FOREST });
      y = text(c, c.t.title, { x: c.cx, y: y + 8, maxW, align: "center", font: "helvetica", style: "bold", size: 12.5, color: INK, lh: 1.25 });
      const course = [c.t.courseTitle && `Course name: ${c.t.courseTitle}`, c.t.courseCode && `Course no: ${c.t.courseCode}`].filter(Boolean).join(",   ");
      if (course) y = text(c, course, { x: c.cx, y: y + 6, maxW, align: "center", font: "helvetica", size: 10.5, color: [70, 74, 86] });

      y += 22;
      c.doc.setDrawColor(...HAIRLINE);
      c.P.line(60, y, c.W - 60, y);
      y += 34;

      const colW = (c.W - 160) / 2;
      const theme = { ...SANS, labelColor: FOREST, labelSize: 11, labelTrack: 0.5, bodyColor: [70, 74, 86], bodySize: 9.5 };
      const left = c.cx - colW / 2 - 14;
      const right = c.cx + colW / 2 + 14;
      const a = detailColumn(c, { x: left, y, w: colW, align: "center", label: "Submitted to", lines: [c.t.teacher || "Instructor Name", c.t.teacherRole, c.t.facultyDept].filter(Boolean), theme });
      const b = detailColumn(c, { x: right, y, w: colW, align: "center", label: "Submitted by", lines: [c.t.student || "Student Name", c.t.studentId && `Student ID: ${c.t.studentId}`, c.t.session, c.t.studentDept].filter(Boolean), theme });
      const end = Math.max(a, b);

      c.doc.setDrawColor(...FOREST);
      c.doc.setLineWidth(1.2);
      c.P.line(c.cx, y - 12, c.cx, end - 4);
      return end;
    },
  },

  // --------------------------------------------------------- tripleBorder
  tripleBorder: {
    chrome(c) {
      c.doc.setDrawColor(...COBALT);
      c.doc.setLineWidth(1.8);
      c.P.rect(22, 22, c.W - 44, c.H - 44);
      c.doc.setLineWidth(0.5);
      c.P.rect(28, 28, c.W - 56, c.H - 56);
      c.doc.setLineWidth(1.8);
      c.P.rect(32, 32, c.W - 64, c.H - 64);
    },
    region: (c) => [96, c.H - 96],
    body(c, y) {
      const maxW = c.W - 190;
      if (c.logo) y += drawLogo(c, c.cx, y, 56, 56, "center") + 20;
      y = text(c, c.t.uni, { x: c.cx, y, maxW, align: "center", font: "times", style: "bold", size: 18, track: 0.5, lh: LH_TIGHT });
      if (c.t.dept) y = text(c, `Department of ${c.t.dept}`, { x: c.cx, y: y + 4, maxW, align: "center", font: "times", size: 10.5, color: MUTED, track: 0.4 });

      y += 34;
      if (c.t.subtitle) y = text(c, c.t.subtitle, { x: c.cx, y, maxW, align: "center", font: "helvetica", size: 9.5, color: MUTED, track: 0.6 }) + 6;
      const size = fitSize(c.doc, c.t.title, { maxW, maxLines: 3, max: 19, min: 14, font: "times", style: "bold" });
      y = text(c, c.t.title, { x: c.cx, y, maxW, align: "center", font: "times", style: "bold", size, lh: LH_TIGHT });

      if (c.t.course) {
        y = text(c, [c.t.courseCode, c.t.courseTitle].filter(Boolean).join(" : "), { x: c.cx, y: y + 18, maxW, align: "center", font: "times", style: "bold", size: 11.5 });
      }

      if (c.t.section || c.t.semester) {
        y += 22;
        const cells = [
          ["Section / batch", c.t.section],
          ["Academic session", c.t.session || c.t.semester],
        ].filter(([, v]) => v);
        const gap = cells.length === 2 ? 90 : 0;
        cells.forEach(([label, value], i) => {
          const x = cells.length === 2 ? c.cx + (i === 0 ? -gap : gap) : c.cx;
          text(c, label, { x, y, maxW: 150, align: "center", font: "helvetica", size: 8.5, color: MUTED, track: 0.4 });
          text(c, value, { x, y: y + 14, maxW: 150, align: "center", font: "times", style: "bold", size: 10.5 });
        });
        y += 20;
      }

      y += 26;
      c.doc.setDrawColor(...HAIRLINE);
      c.doc.setLineWidth(0.5);
      c.P.line(70, y, c.W - 70, y);
      y += 28;

      const colW = (c.W - 200) / 2;
      const theme = { ...SANS, labelColor: COBALT, labelSize: 9, bodyFont: "times", bodySize: 10 };
      const a = detailColumn(c, { x: 90, y, w: colW, label: "Submitted by", lines: [c.t.student || "Student Name", c.t.studentId && `ID: ${c.t.studentId}`, c.t.studentDept && `Dept: ${c.t.studentDept}`].filter(Boolean), theme });
      const b = detailColumn(c, { x: c.cx + 24, y, w: colW, label: "Submitted to", lines: [c.t.teacher || "Instructor Name", c.t.teacherRole, c.t.facultyDept].filter(Boolean), theme });
      y = Math.max(a, b) + 20;

      c.doc.setDrawColor(...HAIRLINE);
      c.P.line(70, y, c.W - 70, y);
      y += 34;

      if (c.t.date) {
        text(c, "Date of submission", { x: c.cx, y, maxW, align: "center", font: "helvetica", size: 8.5, color: MUTED, track: 0.4 });
        y = text(c, c.t.date, { x: c.cx, y: y + 15, maxW, align: "center", font: "times", style: "bold", size: 11.5 });
      }
      return y;
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