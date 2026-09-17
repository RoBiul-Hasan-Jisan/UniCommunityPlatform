"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AppShell from "../../../components/AppShell";
import { useAuth } from "../../../lib/AuthContext";
import { ElevatedCard, ToolInput, GradientButton, IconBadge } from "../../../components/ToolsUI";
import { downloadCoverPdf, normalizeLogo } from "../../../lib/coverPdf";

const TEMPLATES = [
  { id: "classic", label: "Classic", desc: "Bordered, centered, traditional" },
  { id: "modern", label: "Modern", desc: "Navy header band with logo" },
  { id: "minimal", label: "Minimal", desc: "Clean, generous whitespace" },
  { id: "elegant", label: "Elegant", desc: "Ornamental double border" },
  { id: "bold", label: "Bold", desc: "Angled color banner, resume-style" },
  { id: "academic", label: "Academic", desc: "Thesis-style rules, stacked credits" },
  { id: "banner", label: "Banner Boxes", desc: "Pill banner + boxed sections" },
  { id: "dualFaculty", label: "Dual Faculty", desc: "Two supervisors side by side" },
  { id: "sealDivider", label: "Seal & Divider", desc: "Centered seal, split footer" },
  { id: "tripleBorder", label: "Triple Border", desc: "Framed, mini info grid" },
];

const COURSE_CODES = ["CSE 110", "EEE 201", "MAT 120", "ENG 101", "BUS 101"];
const DESIGNATIONS = ["Lecturer", "Senior Lecturer", "Assistant Professor", "Associate Professor", "Professor"];
const ASSIGNMENT_TYPES = ["Lab Report", "Term Assignment", "Project Report", "Case Study"];

const DRAFT_KEY = "coverpage.draft";
const PROFILES_KEY = "coverpage.profiles";
// Only the parts of the form that describe the student, not the assignment.
const PROFILE_FIELDS = [
  "university", "headerDepartment", "studentName", "studentId",
  "studentDepartment", "academicSession", "section", "facultyDepartment",
];

const EMPTY_FORM = {
  university: "",
  headerDepartment: "",
  assignmentTitle: "",
  assignmentType: "",
  courseCode: "",
  courseTitle: "",
  section: "",
  semester: "",
  date: new Date().toISOString().slice(0, 10),
  studentName: "",
  studentId: "",
  studentDepartment: "",
  academicSession: "",
  instructorName: "",
  instructorDesignation: "",
  facultyDepartment: "",
  instructor2Name: "",
  instructor2Designation: "",
};

function isoPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function SectionHead({ children, note }) {
  return (
    <div className="flex items-baseline justify-between pt-1">
      <h2 className="font-serif text-[1.05rem] text-ink-800">{children}</h2>
      {note && <span className="text-[0.7rem] text-gray-400">{note}</span>}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-sm font-medium text-ink-700">{label}</label>
      {children}
    </div>
  );
}

function Chips({ options, onPick }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onPick(o)}
          className="text-[0.7rem] px-2 py-1 rounded-full border border-gray-200 text-gray-500 hover:border-brass-400 hover:text-brass-600 transition-colors"
        >
          + {o}
        </button>
      ))}
    </div>
  );
}

export default function CoverPageToolPage() {
  const { user } = useAuth();
  const fileRef = useRef(null);
  const [template, setTemplate] = useState("classic");
  const [logo, setLogo] = useState(null);
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    headerDepartment: user?.department || "",
    studentDepartment: user?.department || "",
    studentName: user?.name || "",
  });
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState("");
  const [generating, setGenerating] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load the saved draft and profiles once, on the client only.
  useEffect(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) setForm((f) => ({ ...f, ...JSON.parse(draft) }));
      const saved = localStorage.getItem(PROFILES_KEY);
      if (saved) setProfiles(JSON.parse(saved));
    } catch {
      // corrupt storage shouldn't break the page
    }
    setLoaded(true);
  }, []);

  // Keep the draft in sync so a refresh doesn't lose typing.
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch {}
  }, [form, loaded]);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function persistProfiles(next) {
    setProfiles(next);
    try {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(next));
    } catch {
      alert("Your browser is blocking local storage, so profiles can't be saved.");
    }
  }

  function saveProfile() {
    const suggested = form.studentName || "My profile";
    const name = window.prompt("Name this profile", suggested);
    if (!name) return;
    const data = {};
    PROFILE_FIELDS.forEach((k) => (data[k] = form[k]));
    const next = [...profiles.filter((p) => p.name !== name), { name, data }];
    persistProfiles(next);
    setActiveProfile(name);
  }

  function applyProfile(name) {
    setActiveProfile(name);
    const profile = profiles.find((p) => p.name === name);
    if (profile) setForm((f) => ({ ...f, ...profile.data }));
  }

  function deleteProfile() {
    if (!activeProfile) return;
    persistProfiles(profiles.filter((p) => p.name !== activeProfile));
    setActiveProfile("");
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return alert("Please choose an image file.");
    if (file.size > 5 * 1024 * 1024) return alert("Please choose an image under 5MB.");
    try {
      setLogo(await normalizeLogo(file));
    } catch {
      alert("That image could not be read. Try a PNG or JPG.");
    }
  }

  async function download() {
    setGenerating(true);
    try {
      await downloadCoverPdf({ template, form, logo });
    } catch (err) {
      console.error(err);
      alert("Could not generate the PDF. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  const parsedDate = new Date(form.date);
  const formattedDate = isNaN(parsedDate)
    ? ""
    : parsedDate.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  // Same fallback chain the PDF engine uses, so the preview matches.
  const headerDept = form.headerDepartment;
  const studentDept = form.studentDepartment || headerDept;
  const facultyDept = form.facultyDepartment || headerDept;
  const courseLine = [form.courseCode, form.courseTitle].filter(Boolean).join(" — ");

  return (
    <AppShell>
      <Link href="/tools" className="text-sm text-brass-600 hover:text-brass-700">&larr; All tools</Link>

      <div className="mt-4 mb-7 flex items-center gap-4">
        <IconBadge>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
            <path d="M14 3v5h5" strokeLinejoin="round" />
          </svg>
        </IconBadge>
        <div>
          <h1 className="font-serif text-[1.6rem] tracking-[-0.01em] text-ink-800">Cover Page Generator</h1>
          <p className="text-[0.875rem] text-gray-500 mt-0.5">Pick a layout, fill in the details, download a print-ready PDF.</p>
        </div>
      </div>

      {/* Template picker */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6 max-w-4xl">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTemplate(t.id)}
            className={`text-left rounded-xl border p-3 transition-all duration-150 ${
              template === t.id ? "border-brass-400 bg-brass-50/60 shadow-[0_2px_10px_rgba(171,129,46,0.15)]" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className={`h-12 rounded-md mb-2 border ${template === t.id ? "border-brass-300" : "border-gray-200"} flex items-center justify-center bg-white overflow-hidden`}>
              {t.id === "classic" && <div className="w-8 h-8 border border-gray-400 rounded-sm" />}
              {t.id === "modern" && <div className="w-full h-full flex flex-col"><div className="h-1/2 bg-ink-800" /><div className="h-1/2 bg-white" /></div>}
              {t.id === "minimal" && <div className="w-6 h-px bg-gray-300" />}
              {t.id === "elegant" && (
                <div className="w-8 h-8 border border-brass-400 flex items-center justify-center">
                  <div className="w-5 h-5 border border-brass-300" />
                </div>
              )}
              {t.id === "bold" && (
                <div className="w-full h-full relative overflow-hidden">
                  <div className="absolute inset-x-0 top-0 h-2/3 bg-ink-800" style={{ clipPath: "polygon(0 0, 100% 0, 100% 60%, 0 100%)" }} />
                  <div className="absolute inset-x-0 bg-brass-400" style={{ top: "58%", height: "10%", clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 40%)" }} />
                </div>
              )}
              {t.id === "academic" && (
                <div className="w-8 flex flex-col gap-1">
                  <div className="h-[3px] bg-ink-800" />
                  <div className="h-px bg-gray-400" />
                </div>
              )}
              {t.id === "banner" && (
                <div className="w-8 flex flex-col items-center gap-1">
                  <div className="w-7 h-2 rounded-full bg-[#141e46]" />
                  <div className="w-8 h-4 rounded border border-[#141e46]" />
                </div>
              )}
              {t.id === "dualFaculty" && (
                <div className="w-8 flex items-center justify-between">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                </div>
              )}
              {t.id === "sealDivider" && (
                <div className="w-8 h-8 flex items-center justify-center relative">
                  <div className="w-4 h-4 rounded-full border-2 border-emerald-600" />
                  <div className="absolute inset-y-1 left-1/2 w-px bg-emerald-600" />
                </div>
              )}
              {t.id === "tripleBorder" && (
                <div className="w-8 h-8 border-2 border-blue-700 p-0.5">
                  <div className="w-full h-full border border-blue-300" />
                </div>
              )}
            </div>
            <div className="text-xs font-semibold text-ink-800">{t.label}</div>
            <div className="text-[0.68rem] text-gray-400 mt-0.5">{t.desc}</div>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ElevatedCard className="p-6 space-y-3.5">
          {/* ---------------- Assignment & course details ---------------- */}
          <SectionHead>Assignment &amp; course details</SectionHead>

          <div>
            <label className="text-sm font-medium text-ink-700">University logo (optional)</label>
            <div className="flex items-center gap-3 mt-1.5">
              {logo ? (
                <div className="relative">
                  <img src={logo.dataUrl} alt="Logo" className="w-14 h-14 object-contain rounded-lg border border-gray-200 bg-white p-1" />
                  <button onClick={() => setLogo(null)} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-crimson-500 text-white text-xs flex items-center justify-center">✕</button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()} className="w-14 h-14 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 hover:border-brass-400 hover:text-brass-500 transition-colors flex items-center justify-center text-xl">
                  +
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <button onClick={() => fileRef.current?.click()} className="text-sm text-brass-600 hover:text-brass-700 font-medium">
                {logo ? "Change logo" : "Upload logo"}
              </button>
            </div>
          </div>

          <Field label="University / institution name">
            <ToolInput className="mt-1.5" value={form.university} onChange={(e) => set("university", e.target.value)} placeholder="e.g. XYZ University" />
          </Field>

          <Field label="Header department">
            <ToolInput className="mt-1.5" value={form.headerDepartment} onChange={(e) => set("headerDepartment", e.target.value)} placeholder="e.g. Department of Computer Science" />
          </Field>

          <Field label="Report title">
            <ToolInput className="mt-1.5" value={form.assignmentTitle} onChange={(e) => set("assignmentTitle", e.target.value)} placeholder="e.g. Sorting Algorithms" />
          </Field>

          <Field label="Assignment type / subtitle">
            <ToolInput className="mt-1.5" value={form.assignmentType} onChange={(e) => set("assignmentType", e.target.value)} placeholder="e.g. Lab Report 3" />
            <Chips options={ASSIGNMENT_TYPES} onPick={(v) => set("assignmentType", v)} />
          </Field>

          <Field label="Course code">
            <ToolInput className="mt-1.5" value={form.courseCode} onChange={(e) => set("courseCode", e.target.value)} placeholder="e.g. CSE 220" />
            <Chips options={COURSE_CODES} onPick={(v) => set("courseCode", v)} />
          </Field>

          <Field label="Course title">
            <ToolInput className="mt-1.5" value={form.courseTitle} onChange={(e) => set("courseTitle", e.target.value)} placeholder="e.g. Algorithms" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Section / batch">
              <ToolInput className="mt-1.5" value={form.section} onChange={(e) => set("section", e.target.value)} placeholder="e.g. 02" />
            </Field>
            <Field label="Semester / term">
              <ToolInput className="mt-1.5" value={form.semester} onChange={(e) => set("semester", e.target.value)} placeholder="e.g. Fall 2026" />
            </Field>
          </div>

          <Field label="Submission date">
            <ToolInput className="mt-1.5" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <button type="button" onClick={() => set("date", isoPlus(0))} className="text-[0.7rem] px-2 py-1 rounded-full border border-gray-200 text-gray-500 hover:border-brass-400 hover:text-brass-600 transition-colors">+ Today</button>
              <button type="button" onClick={() => set("date", isoPlus(1))} className="text-[0.7rem] px-2 py-1 rounded-full border border-gray-200 text-gray-500 hover:border-brass-400 hover:text-brass-600 transition-colors">+ Tomorrow</button>
            </div>
          </Field>

          {/* ---------------- Submitted by ---------------- */}
          <div className="pt-4 border-t border-gray-100 space-y-3.5">
            <SectionHead note="Saved in this browser">Submitted by (student info)</SectionHead>

            <div className="flex items-center gap-2">
              <select
                value={activeProfile}
                onChange={(e) => applyProfile(e.target.value)}
                className="flex-1 text-sm rounded-lg border border-gray-200 px-3 py-2 text-ink-700 bg-white focus:border-brass-400 focus:outline-none"
              >
                <option value="">Select a saved profile…</option>
                {profiles.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
              <button type="button" onClick={saveProfile} className="text-sm text-brass-600 hover:text-brass-700 font-medium whitespace-nowrap">Save profile</button>
              {activeProfile && (
                <button type="button" onClick={deleteProfile} className="text-sm text-gray-400 hover:text-crimson-500">Delete</button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Student full name">
                <ToolInput className="mt-1.5" value={form.studentName} onChange={(e) => set("studentName", e.target.value)} />
              </Field>
              <Field label="Student ID / roll no">
                <ToolInput className="mt-1.5" value={form.studentId} onChange={(e) => set("studentId", e.target.value)} />
              </Field>
              <Field label="Student department">
                <ToolInput className="mt-1.5" value={form.studentDepartment} onChange={(e) => set("studentDepartment", e.target.value)} placeholder="Same as header if blank" />
              </Field>
              <Field label="Academic session / year">
                <ToolInput className="mt-1.5" value={form.academicSession} onChange={(e) => set("academicSession", e.target.value)} placeholder="e.g. 2024–25" />
              </Field>
            </div>
          </div>

          {/* ---------------- Submitted to ---------------- */}
          <div className="pt-4 border-t border-gray-100 space-y-3.5">
            <SectionHead>Submitted to (instructor info)</SectionHead>

            <Field label="Teacher / instructor name">
              <ToolInput className="mt-1.5" value={form.instructorName} onChange={(e) => set("instructorName", e.target.value)} />
            </Field>

            <Field label="Designation / title">
              <ToolInput className="mt-1.5" value={form.instructorDesignation} onChange={(e) => set("instructorDesignation", e.target.value)} />
              <Chips options={DESIGNATIONS} onPick={(v) => set("instructorDesignation", v)} />
            </Field>

            <Field label="Faculty / department">
              <ToolInput className="mt-1.5" value={form.facultyDepartment} onChange={(e) => set("facultyDepartment", e.target.value)} placeholder="Same as header if blank" />
            </Field>

            {template === "dualFaculty" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="2nd instructor name">
                  <ToolInput className="mt-1.5" value={form.instructor2Name} onChange={(e) => set("instructor2Name", e.target.value)} placeholder="Optional — co-supervisor" />
                </Field>
                <Field label="2nd instructor designation">
                  <ToolInput className="mt-1.5" value={form.instructor2Designation} onChange={(e) => set("instructor2Designation", e.target.value)} />
                </Field>
              </div>
            )}
          </div>

          <GradientButton className="w-full mt-2" onClick={download} disabled={generating}>
            {generating ? "Generating…" : "Download PDF"}
          </GradientButton>
          <button
            type="button"
            onClick={() => setForm({ ...EMPTY_FORM })}
            className="w-full text-xs text-gray-400 hover:text-gray-600"
          >
            Clear the form
          </button>
        </ElevatedCard>

        {/* Live preview */}
        <ElevatedCard className="p-6 flex items-start justify-center bg-white sticky top-24 h-fit">
          <div className="w-full max-w-sm aspect-[210/297] overflow-hidden rounded-lg border border-gray-200 shadow-inner bg-white">
            {template === "classic" && (
              <div className="w-full h-full p-1.5">
                <div className="w-full h-full border-2 border-ink-800 p-5 flex flex-col text-center font-serif">
                  {logo && <img src={logo.dataUrl} alt="" className="w-10 h-10 object-contain mx-auto mb-2" />}
                  {form.university && <div className="text-sm font-bold text-ink-800">{form.university}</div>}
                  {headerDept && <div className="text-[10px] text-gray-600 mt-1">{headerDept}</div>}
                  {courseLine && <div className="text-[10px] text-gray-600 mt-4">{courseLine}</div>}
                  <div className="flex-1 flex items-center justify-center px-2">
                    <div>
                      {form.assignmentType && <div className="text-[9px] italic text-gray-500 mb-1">{form.assignmentType}</div>}
                      <div className="text-base font-bold text-ink-800 leading-snug">{form.assignmentTitle || "Assignment Title"}</div>
                    </div>
                  </div>
                  <div className="border-t border-gray-300 pt-3 grid grid-cols-2 gap-2 text-left text-[9px] text-gray-700">
                    <div>
                      <div className="font-bold mb-1">Submitted by</div>
                      {form.studentName && <div>Name: {form.studentName}</div>}
                      {form.studentId && <div>ID: {form.studentId}</div>}
                      {form.section && <div>Section: {form.section}</div>}
                      {form.academicSession && <div>Session: {form.academicSession}</div>}
                    </div>
                    <div>
                      <div className="font-bold mb-1">Submitted to</div>
                      {form.instructorName && <div>Name: {form.instructorName}</div>}
                      {form.instructorDesignation && <div>{form.instructorDesignation}</div>}
                      {facultyDept && <div>{facultyDept}</div>}
                    </div>
                  </div>
                  <div className="text-[9px] text-gray-500 italic mt-2">Date: {formattedDate}</div>
                </div>
              </div>
            )}

            {template === "modern" && (
              <div className="w-full h-full flex flex-col">
                <div className="bg-ink-800 text-white p-4 relative border-b-4 border-brass-500">
                  <div className="flex items-center gap-2">
                    {logo && <img src={logo.dataUrl} alt="" className="w-8 h-8 object-contain bg-white rounded p-0.5" />}
                    <div>
                      <div className="text-xs font-bold">{form.university || "University Name"}</div>
                      {headerDept && <div className="text-[9px] text-brass-200">{headerDept}</div>}
                    </div>
                  </div>
                  {courseLine && <div className="text-[9px] text-gray-300 mt-2">{courseLine}</div>}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  {form.assignmentType && <div className="text-[9px] font-bold text-brass-600 mb-1">{form.assignmentType}</div>}
                  <div className="text-lg font-bold text-ink-800 leading-snug">{form.assignmentTitle || "Assignment Title"}</div>
                  <div className="bg-paper-dim rounded-lg p-3 mt-6 grid grid-cols-2 gap-2 text-[9px] text-gray-700">
                    <div>
                      <div className="font-bold text-gray-400 mb-1">Submitted by</div>
                      {form.studentName && <div>{form.studentName}</div>}
                      {form.studentId && <div>ID: {form.studentId}</div>}
                      {form.academicSession && <div>Session: {form.academicSession}</div>}
                    </div>
                    <div>
                      <div className="font-bold text-gray-400 mb-1">Submitted to</div>
                      {form.instructorName && <div>{form.instructorName}</div>}
                      {form.instructorDesignation && <div>{form.instructorDesignation}</div>}
                      {facultyDept && <div>{facultyDept}</div>}
                    </div>
                  </div>
                  <div className="text-[9px] text-gray-400 mt-auto">Date: {formattedDate}</div>
                </div>
              </div>
            )}

            {template === "minimal" && (
              <div className="w-full h-full p-6 flex flex-col items-center text-center">
                {logo && <img src={logo.dataUrl} alt="" className="w-9 h-9 object-contain mb-3" />}
                {form.university && <div className="text-[10px] font-medium text-ink-800 uppercase tracking-wide">{form.university}</div>}
                {headerDept && <div className="text-[9px] text-gray-400 mt-1">{headerDept}</div>}
                <div className="flex-1 flex items-center">
                  <div>
                    {form.assignmentType && <div className="text-[9px] text-gray-400 mb-1">{form.assignmentType}</div>}
                    <div className="text-lg text-ink-800 leading-snug">{form.assignmentTitle || "Assignment Title"}</div>
                    {courseLine && <div className="text-[9px] text-gray-400 mt-2">{courseLine}</div>}
                  </div>
                </div>
                <div className="w-8 h-px bg-gray-300 mb-4" />
                <div className="w-full space-y-1.5 text-[9px]">
                  {[["Name", form.studentName], ["Student ID", form.studentId], ["Department", studentDept], ["Session", form.academicSession], ["Instructor", form.instructorName], ["Date", formattedDate]]
                    .filter(([, v]) => v)
                    .map(([label, value]) => (
                      <div key={label} className="flex justify-between">
                        <span className="text-gray-400">{label}</span>
                        <span className="text-ink-800 font-medium">{value}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {template === "elegant" && (
              <div className="w-full h-full p-2">
                <div className="w-full h-full border-2 border-brass-400 p-1.5">
                  <div className="w-full h-full border border-brass-200 p-5 flex flex-col items-center text-center font-serif">
                    <div className="w-2.5 h-2.5 rotate-45 bg-brass-400 mb-3" />
                    {logo && <img src={logo.dataUrl} alt="" className="w-9 h-9 object-contain mb-2" />}
                    {form.university && <div className="text-sm font-bold italic text-ink-800">{form.university}</div>}
                    {headerDept && <div className="text-[9px] text-brass-700/70 italic mt-1">{headerDept}</div>}
                    <div className="w-16 h-px bg-brass-400 my-4" />
                    <div className="flex-1 flex items-center justify-center px-2">
                      <div>
                        {form.assignmentType && <div className="text-[9px] italic text-brass-700 mb-1">{form.assignmentType}</div>}
                        <div className="text-base font-bold text-ink-800 leading-snug">{form.assignmentTitle || "Assignment Title"}</div>
                        {courseLine && <div className="text-[9px] text-gray-500 italic mt-2">{courseLine}</div>}
                      </div>
                    </div>
                    <div className="w-full grid grid-cols-2 gap-2 text-left text-[9px] text-gray-700">
                      <div>
                        <div className="font-bold text-brass-700 mb-1">Submitted by</div>
                        {form.studentName && <div>Name: {form.studentName}</div>}
                        {form.studentId && <div>ID: {form.studentId}</div>}
                      </div>
                      <div>
                        <div className="font-bold text-brass-700 mb-1">Submitted to</div>
                        {form.instructorName && <div>Name: {form.instructorName}</div>}
                        {form.instructorDesignation && <div>{form.instructorDesignation}</div>}
                      </div>
                    </div>
                    <div className="text-[9px] text-gray-500 italic mt-3">Date: {formattedDate}</div>
                  </div>
                </div>
              </div>
            )}

            {template === "bold" && (
              <div className="w-full h-full flex flex-col">
                <div className="relative">
                  <div className="bg-ink-800 text-white p-4" style={{ clipPath: "polygon(0 0, 100% 0, 100% 65%, 0 100%)", paddingBottom: "2.2rem" }}>
                    <div className="flex items-center gap-2">
                      {logo && <img src={logo.dataUrl} alt="" className="w-8 h-8 object-contain bg-white rounded p-0.5" />}
                      <div>
                        <div className="text-xs font-bold">{form.university || "University Name"}</div>
                        {headerDept && <div className="text-[9px] text-brass-200">{headerDept}</div>}
                      </div>
                    </div>
                  </div>
                  <div className="absolute left-0 right-0 bottom-0 h-1 bg-brass-400" style={{ transform: "translateY(2px)" }} />
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  {form.assignmentType && <div className="text-[9px] font-bold text-brass-600 mb-1">{form.assignmentType}</div>}
                  <div className="text-lg font-bold text-ink-800 leading-snug">{form.assignmentTitle || "Assignment Title"}</div>
                  {courseLine && <div className="text-[9px] text-gray-400 mt-1">{courseLine}</div>}
                  <div className="grid grid-cols-2 gap-3 mt-6 text-[9px] text-gray-700">
                    <div className="border-l-2 border-brass-400 pl-2">
                      <div className="font-bold text-gray-400 mb-1">Submitted by</div>
                      {form.studentName && <div>{form.studentName}</div>}
                      {form.studentId && <div>ID: {form.studentId}</div>}
                    </div>
                    <div className="border-l-2 border-brass-400 pl-2">
                      <div className="font-bold text-gray-400 mb-1">Submitted to</div>
                      {form.instructorName && <div>{form.instructorName}</div>}
                      {form.instructorDesignation && <div>{form.instructorDesignation}</div>}
                    </div>
                  </div>
                  <div className="text-[9px] text-gray-400 mt-auto">Date: {formattedDate}</div>
                </div>
              </div>
            )}

            {template === "academic" && (
              <div className="w-full h-full p-6 flex flex-col items-center text-center font-serif">
                <div className="w-full h-[3px] bg-ink-800 mb-0.5" />
                <div className="w-full h-px bg-gray-400 mb-6" />
                {logo && <img src={logo.dataUrl} alt="" className="w-9 h-9 object-contain mb-2" />}
                {form.university && <div className="text-[10px] font-bold text-ink-800 uppercase tracking-wide">{form.university}</div>}
                {headerDept && <div className="text-[9px] text-gray-500 mt-1 mb-4">{headerDept}</div>}
                <div className="text-[8px] italic text-gray-500 mt-2">
                  A {(form.assignmentType || "report").toLowerCase()} submitted in partial fulfilment of the requirements for
                </div>
                {courseLine && <div className="text-[9px] font-bold text-ink-800 mt-1">{courseLine}</div>}
                <div className="flex-1 flex items-center px-2">
                  <div className="text-base font-bold text-ink-800 leading-snug">{form.assignmentTitle || "Assignment Title"}</div>
                </div>
                <div className="text-[8px] text-gray-500">Submitted by</div>
                <div className="text-[10px] font-bold text-ink-800 mt-0.5">{form.studentName || "Student Name"}</div>
                {(form.studentId || form.section) && (
                  <div className="text-[8px] text-gray-500 mt-0.5">{[form.studentId && `ID: ${form.studentId}`, form.section && `Section: ${form.section}`].filter(Boolean).join("  ·  ")}</div>
                )}
                <div className="text-[8px] text-gray-500 mt-3">Supervised by</div>
                <div className="text-[10px] font-bold text-ink-800 mt-0.5">{form.instructorName || "Instructor Name"}</div>
                {form.instructorDesignation && <div className="text-[8px] text-gray-500 mt-0.5">{form.instructorDesignation}</div>}
                <div className="text-[8px] text-gray-400 italic mt-4">{formattedDate}</div>
                <div className="w-full h-px bg-gray-400 mt-4 mb-0.5" />
                <div className="w-full h-[3px] bg-ink-800" />
              </div>
            )}

            {template === "banner" && (
              <div className="w-full h-full p-5 flex flex-col items-center text-center">
                {logo && <img src={logo.dataUrl} alt="" className="w-9 h-9 object-contain mb-2" />}
                {form.university && <div className="text-[11px] font-bold text-[#141e46] uppercase">{form.university}</div>}
                {headerDept && <div className="text-[8px] italic text-rose-800/70 mt-1">{headerDept}</div>}
                {form.assignmentType && <div className="text-[8px] text-gray-500 mt-2">{form.assignmentType}</div>}
                <div className="mt-1.5 px-4 py-1.5 rounded-full bg-[#141e46] text-white text-[10px] font-bold">
                  {form.assignmentTitle || "Assignment"}
                </div>
                {courseLine && <div className="text-[9px] text-gray-600 mt-3">{courseLine}</div>}
                <div className="w-full mt-5 rounded-lg border border-[#141e46] p-3 text-left text-[8.5px] text-gray-700">
                  <div className="text-center font-bold text-[9px] text-[#141e46] mb-1.5">Submitted by</div>
                  {form.studentName && <div>Student name: {form.studentName}</div>}
                  {form.studentId && <div>Student ID: {form.studentId}</div>}
                  {form.section && <div>Section: {form.section}</div>}
                  {studentDept && <div>{studentDept}</div>}
                </div>
                <div className="w-full mt-3 rounded-lg border border-[#141e46] p-3 text-left text-[8.5px] text-gray-700">
                  <div className="text-center font-bold text-[9px] text-[#141e46] mb-1.5">Submitted to</div>
                  {form.instructorName && <div>Faculty name: {form.instructorName}</div>}
                  {form.instructorDesignation && <div>{form.instructorDesignation}</div>}
                  {facultyDept && <div>{facultyDept}</div>}
                </div>
                <div className="mt-auto px-4 py-1.5 rounded-full bg-[#141e46] text-white text-[9px] font-bold">
                  Submitted on {formattedDate}
                </div>
              </div>
            )}

            {template === "dualFaculty" && (
              <div className="w-full h-full p-5 flex flex-col items-center text-center">
                {logo && <img src={logo.dataUrl} alt="" className="w-9 h-9 object-contain mb-2" />}
                {form.university && <div className="text-[11px] font-bold text-blue-700 leading-tight">{form.university}</div>}
                {headerDept && <div className="text-[10px] font-bold text-blue-700 mt-1 leading-tight">{headerDept}</div>}
                <div className="text-[11px] font-bold text-orange-600 mt-4">{form.assignmentType || "Assignment"}</div>
                <div className="text-[9px] font-bold text-ink-800 mt-1">{form.assignmentTitle}</div>
                <div className="w-full mt-4 text-left text-[8.5px] text-blue-700 font-semibold space-y-0.5">
                  {form.courseTitle && <div>Course title:  <span className="text-gray-700 font-normal">{form.courseTitle}</span></div>}
                  {form.courseCode && <div>Course code:  <span className="text-gray-700 font-normal">{form.courseCode}</span></div>}
                </div>
                <div className="w-full mt-4 text-left">
                  <div className="text-[9px] font-bold text-blue-700">Submitted to</div>
                  <div className="grid grid-cols-2 gap-2 mt-1.5 text-[8px] text-gray-700">
                    <div>
                      {form.instructorName && <div>{form.instructorName}</div>}
                      {form.instructorDesignation && <div>{form.instructorDesignation}</div>}
                      {facultyDept && <div>{facultyDept}</div>}
                    </div>
                    <div>
                      {form.instructor2Name && <div>{form.instructor2Name}</div>}
                      {form.instructor2Designation && <div>{form.instructor2Designation}</div>}
                      {form.instructor2Name && facultyDept && <div>{facultyDept}</div>}
                    </div>
                  </div>
                </div>
                <div className="w-full mt-4 text-left">
                  <div className="text-[9px] font-bold text-blue-700">Submitted by</div>
                  <div className="text-[8px] text-gray-700 mt-1.5 space-y-0.5">
                    {form.studentName && <div>{form.studentName}</div>}
                    {form.studentId && <div>Reg. no.  {form.studentId}</div>}
                    {form.academicSession && <div>Session: {form.academicSession}</div>}
                    {studentDept && <div>{studentDept}</div>}
                  </div>
                </div>
                <div className="mt-auto w-full text-left text-[8px] font-semibold text-blue-700">Date of submission: {formattedDate}</div>
              </div>
            )}

            {template === "sealDivider" && (
              <div className="w-full h-full p-5 flex flex-col items-center text-center">
                {form.university && <div className="text-[11px] font-bold text-emerald-700 uppercase leading-tight">{form.university}</div>}
                {logo && <img src={logo.dataUrl} alt="" className="w-11 h-11 object-contain my-2" />}
                {headerDept && <div className="text-[9px] font-bold text-blue-700 uppercase">{headerDept}</div>}
                <div className="w-full h-px bg-gray-200 my-3" />
                <div className="text-[9px] font-bold text-emerald-700">{form.assignmentType || "Assignment on"}</div>
                <div className="mt-1.5 text-[8.5px] font-bold text-ink-800 leading-snug">{form.assignmentTitle || "Topic"}</div>
                {courseLine && <div className="text-[8px] text-gray-600 mt-1">{courseLine}</div>}
                <div className="w-full h-px bg-gray-200 my-3" />
                <div className="w-full flex">
                  <div className="flex-1 border-r-2 border-emerald-600 pr-2">
                    <div className="text-[8.5px] font-bold text-emerald-700">Submitted to</div>
                    <div className="text-[8px] font-bold text-ink-800 mt-1">{form.instructorName || "Instructor Name"}</div>
                    <div className="text-[7px] text-gray-500 mt-0.5">{[form.instructorDesignation, facultyDept].filter(Boolean).join(", ")}</div>
                  </div>
                  <div className="flex-1 pl-2">
                    <div className="text-[8.5px] font-bold text-emerald-700">Submitted by</div>
                    <div className="text-[8px] font-bold text-ink-800 mt-1">{form.studentName || "Student Name"}</div>
                    <div className="text-[7px] text-gray-500 mt-0.5">{[form.studentId && `ID: ${form.studentId}`, studentDept].filter(Boolean).join(", ")}</div>
                  </div>
                </div>
                <div className="mt-auto text-[8px] italic text-gray-500">Date of submission: {formattedDate}</div>
              </div>
            )}

            {template === "tripleBorder" && (
              <div className="w-full h-full p-2">
                <div className="w-full h-full border-2 border-blue-800 p-1">
                  <div className="w-full h-full border border-blue-300 p-1">
                    <div className="w-full h-full border-2 border-blue-800 p-4 flex flex-col items-center text-center font-serif">
                      {logo && <img src={logo.dataUrl} alt="" className="w-8 h-8 object-contain mb-2" />}
                      {form.university && <div className="text-[10px] font-bold text-ink-800 uppercase">{form.university}</div>}
                      {headerDept && <div className="text-[7px] text-gray-500 mt-0.5">{headerDept}</div>}
                      {form.assignmentType && <div className="text-[6.5px] text-gray-400 mt-3">{form.assignmentType}</div>}
                      <div className="text-[10px] font-bold text-ink-800 mt-1 leading-snug px-1">{form.assignmentTitle || "Assignment Title"}</div>
                      {courseLine && <div className="text-[8px] font-bold text-ink-800 mt-3">{[form.courseCode, form.courseTitle].filter(Boolean).join(" : ")}</div>}
                      {(form.section || form.academicSession || form.semester) && (
                        <div className="w-full flex justify-around mt-3">
                          <div>
                            <div className="text-[6px] text-gray-400">Section / batch</div>
                            <div className="text-[7.5px] font-bold text-ink-800">{form.section || "—"}</div>
                          </div>
                          <div>
                            <div className="text-[6px] text-gray-400">Academic session</div>
                            <div className="text-[7.5px] font-bold text-ink-800">{form.academicSession || form.semester || "—"}</div>
                          </div>
                        </div>
                      )}
                      <div className="w-full h-px bg-gray-200 my-3" />
                      <div className="w-full flex justify-between text-left text-[7.5px]">
                        <div>
                          <div className="font-bold text-blue-800">Submitted by</div>
                          <div className="font-bold text-ink-800 mt-0.5">{form.studentName || "Student Name"}</div>
                          {form.studentId && <div className="text-gray-500">ID: {form.studentId}</div>}
                        </div>
                        <div>
                          <div className="font-bold text-blue-800">Submitted to</div>
                          <div className="font-bold text-ink-800 mt-0.5">{form.instructorName || "Instructor Name"}</div>
                          {form.instructorDesignation && <div className="text-gray-500">{form.instructorDesignation}</div>}
                        </div>
                      </div>
                      <div className="w-full h-px bg-gray-200 my-3" />
                      <div className="text-[6px] text-gray-400">Date of submission</div>
                      <div className="text-[7.5px] font-bold text-ink-800">{formattedDate}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ElevatedCard>
      </div>
    </AppShell>
  );
}