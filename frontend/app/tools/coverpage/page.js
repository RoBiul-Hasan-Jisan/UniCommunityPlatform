"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AppShell from "../../../components/AppShell";
import { useAuth } from "../../../lib/AuthContext";
import { ElevatedCard, ToolInput, GradientButton, IconBadge } from "../../../components/ToolsUI";
import { downloadCoverPdfFromLayout, normalizeLogo, DEFAULT_LAYOUT } from "../../../lib/coverPdf";
import CoverPageCanvas from "../../../components/CoverPageCanvas";
import CoverPagePropertyPanel from "../../../components/CoverPagePropertyPanel";

const LAYOUT_KEY = "coverpage.layout";


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
  const [logo, setLogo] = useState(null);
  const [showCoSupervisor, setShowCoSupervisor] = useState(false);
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
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [selected, setSelected] = useState(null);

  // Load the saved draft, profiles, and layout once, on the client only.
  useEffect(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        const parsed = JSON.parse(draft);
        setForm((f) => ({ ...f, ...parsed }));
        if (parsed.instructor2Name) setShowCoSupervisor(true);
      }
      const saved = localStorage.getItem(PROFILES_KEY);
      if (saved) setProfiles(JSON.parse(saved));
      const savedLayout = localStorage.getItem(LAYOUT_KEY);
      if (savedLayout) {
        const parsedLayout = JSON.parse(savedLayout);
        setLayout((l) => {
          const merged = { ...l };
          for (const key of Object.keys(DEFAULT_LAYOUT)) merged[key] = { ...DEFAULT_LAYOUT[key], ...(parsedLayout[key] || {}) };
          return merged;
        });
      }
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

  // Keep the dragged layout in sync too.
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
    } catch {}
  }, [layout, loaded]);

  function moveElement(id, patch) {
    setLayout((l) => ({ ...l, [id]: { ...l[id], ...patch } }));
  }
  function updateElement(id, patch) {
    setLayout((l) => ({ ...l, [id]: { ...l[id], ...patch } }));
  }
  function resetOne(id) {
    setLayout((l) => ({ ...l, [id]: { ...DEFAULT_LAYOUT[id] } }));
  }
  function resetAllLayout() {
    setLayout({ ...DEFAULT_LAYOUT });
    setSelected(null);
  }

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
      await downloadCoverPdfFromLayout({ form, logo, layout });
    } catch (err) {
      console.error(err);
      alert("Could not generate the PDF. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

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
          <p className="text-[0.875rem] text-gray-500 mt-0.5">Fill in your details on the left — the preview and the download update together.</p>
        </div>
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
                className="flex-1 min-w-0 text-sm rounded-lg border border-gray-200 px-3 py-2 text-ink-700 bg-white focus:border-brass-400 focus:outline-none"
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

            {showCoSupervisor ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="2nd instructor name">
                  <ToolInput className="mt-1.5" value={form.instructor2Name} onChange={(e) => set("instructor2Name", e.target.value)} placeholder="Optional — co-supervisor" />
                </Field>
                <Field label="2nd instructor designation">
                  <ToolInput className="mt-1.5" value={form.instructor2Designation} onChange={(e) => set("instructor2Designation", e.target.value)} />
                </Field>
              </div>
            ) : (
              <button type="button" className="text-sm font-medium text-brass-600 hover:text-brass-700" onClick={() => setShowCoSupervisor(true)}>
                + Add a co-supervisor
              </button>
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

        {/* Live, draggable preview — drag any element to reposition it,
            click it to edit its font in the panel below. This is a real
            editor: the PDF is drawn from these exact same x/y/font values,
            so there is never a mismatch between what you arrange here and
            what downloads. */}
        <div className="space-y-4 sticky top-24">
          <ElevatedCard className="p-6 flex items-start justify-center bg-white overflow-x-auto">
            <CoverPageCanvas form={form} logo={logo} layout={layout} onMove={moveElement} selected={selected} onSelect={setSelected} />
          </ElevatedCard>
          <ElevatedCard className="p-5">
            <CoverPagePropertyPanel selected={selected} layout={layout} onUpdate={updateElement} onResetOne={resetOne} onResetAll={resetAllLayout} />
          </ElevatedCard>
        </div>
      </div>
    </AppShell>
  );
}