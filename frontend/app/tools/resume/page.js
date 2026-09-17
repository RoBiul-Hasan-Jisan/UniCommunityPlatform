"use client";

import { useState } from "react";
import Link from "next/link";
import AppShell from "../../../components/AppShell";
import { useAuth } from "../../../lib/AuthContext";

let nextId = 1;
const blankEdu = () => ({ id: nextId++, degree: "", institution: "", year: "", gpa: "" });
const blankExp = () => ({ id: nextId++, title: "", company: "", duration: "", description: "" });
const blankProj = () => ({ id: nextId++, title: "", description: "", link: "" });

export default function ResumeBuilderPage() {
  const { user } = useAuth();
  const [personal, setPersonal] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    location: "",
    link: "",
  });
  const [summary, setSummary] = useState(user?.about || "");
  const [education, setEducation] = useState([
    {
      id: nextId++,
      degree: user?.role === "alumni" ? "Bachelor's Degree" : "Currently pursuing",
      institution: "",
      year: user?.role === "alumni" ? (user?.graduationYear || "") : (user?.batch || ""),
      gpa: "",
    },
  ]);
  const [experience, setExperience] = useState(
    user?.role === "alumni" && user?.currentPosition
      ? [{ id: nextId++, title: user.currentPosition, company: user.currentCompany || "", duration: "", description: "" }]
      : [blankExp()]
  );
  const [skills, setSkills] = useState((user?.skills || []).join(", "));
  const [projects, setProjects] = useState([blankProj()]);
  const [generating, setGenerating] = useState(false);

  function updateList(setter, id, key, value) {
    setter((list) => list.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  }

  async function download() {
    setGenerating(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 50;
      const contentW = pageW - margin * 2;
      let y = margin;

      function ensureSpace(needed) {
        if (y + needed > pageH - margin) {
          doc.addPage();
          y = margin;
        }
      }
      function sectionHeading(text) {
        ensureSpace(28);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(20, 25, 43);
        doc.text(text.toUpperCase(), margin, y);
        y += 4;
        doc.setDrawColor(171, 129, 46);
        doc.setLineWidth(1.2);
        doc.line(margin, y, pageW - margin, y);
        y += 16;
      }
      function paragraph(text, size = 10.5) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(size);
        doc.setTextColor(50, 50, 50);
        const lines = doc.splitTextToSize(text, contentW);
        lines.forEach((line) => {
          ensureSpace(14);
          doc.text(line, margin, y);
          y += 14;
        });
      }
      function bulletList(text) {
        const items = text.split("\n").map((s) => s.trim()).filter(Boolean);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);
        doc.setTextColor(50, 50, 50);
        items.forEach((item) => {
          const lines = doc.splitTextToSize(`•  ${item}`, contentW - 10);
          lines.forEach((line, i) => {
            ensureSpace(14);
            doc.text(line, margin + (i === 0 ? 0 : 12), y);
            y += 14;
          });
        });
      }

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(20, 25, 43);
      doc.text(personal.name || "Your Name", margin, y);
      y += 20;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(90, 90, 90);
      const contactLine = [personal.email, personal.phone, personal.location, personal.link].filter(Boolean).join("   ·   ");
      if (contactLine) {
        doc.text(contactLine, margin, y);
        y += 22;
      } else {
        y += 12;
      }

      if (summary.trim()) {
        sectionHeading("Summary");
        paragraph(summary);
        y += 8;
      }

      const validEducation = education.filter((e) => e.degree || e.institution);
      if (validEducation.length) {
        sectionHeading("Education");
        validEducation.forEach((e) => {
          ensureSpace(16);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor(20, 25, 43);
          doc.text(e.degree || "Degree", margin, y);
          if (e.year) doc.text(e.year, pageW - margin, y, { align: "right" });
          y += 14;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(90, 90, 90);
          const line = [e.institution, e.gpa ? `GPA: ${e.gpa}` : ""].filter(Boolean).join("   ·   ");
          if (line) { doc.text(line, margin, y); y += 16; } else { y += 6; }
        });
        y += 4;
      }

      const validExperience = experience.filter((e) => e.title || e.company);
      if (validExperience.length) {
        sectionHeading("Experience");
        validExperience.forEach((e) => {
          ensureSpace(16);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor(20, 25, 43);
          doc.text(e.title || "Role", margin, y);
          if (e.duration) doc.text(e.duration, pageW - margin, y, { align: "right" });
          y += 14;
          if (e.company) {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(10);
            doc.setTextColor(90, 90, 90);
            doc.text(e.company, margin, y);
            y += 15;
          }
          if (e.description.trim()) bulletList(e.description);
          y += 8;
        });
      }

      if (skills.trim()) {
        sectionHeading("Skills");
        paragraph(skills.split(",").map((s) => s.trim()).filter(Boolean).join("   ·   "));
        y += 8;
      }

      const validProjects = projects.filter((p) => p.title);
      if (validProjects.length) {
        sectionHeading("Projects");
        validProjects.forEach((p) => {
          ensureSpace(16);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor(20, 25, 43);
          doc.text(p.title, margin, y);
          y += 14;
          if (p.description.trim()) paragraph(p.description, 10);
          if (p.link) {
            doc.setFont("helvetica", "normal");
            doc.setTextColor(140, 47, 57);
            doc.setFontSize(9.5);
            ensureSpace(13);
            doc.text(p.link, margin, y);
            y += 14;
          }
          y += 6;
        });
      }

      doc.save(`${(personal.name || "resume").replace(/\s+/g, "-").toLowerCase()}-resume.pdf`);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <AppShell>
      <Link href="/tools" className="text-sm text-brass-600 hover:text-brass-700">&larr; All tools</Link>

      <div className="mt-3 mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-ink-800">Resume Builder</h1>
          <p className="text-sm text-gray-500 mt-1">A clean, ATS-friendly resume — filled in from your profile where possible, editable everywhere.</p>
        </div>
        <button className="btn-primary shrink-0" onClick={download} disabled={generating}>
          {generating ? "Generating…" : "Download PDF"}
        </button>
      </div>

      <div className="space-y-5 max-w-3xl">
        <div className="card p-5">
          <div className="section-label mb-3">Personal details</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input className="input" placeholder="Full name" value={personal.name} onChange={(e) => setPersonal((p) => ({ ...p, name: e.target.value }))} />
            <input className="input" placeholder="Email" value={personal.email} onChange={(e) => setPersonal((p) => ({ ...p, email: e.target.value }))} />
            <input className="input" placeholder="Phone" value={personal.phone} onChange={(e) => setPersonal((p) => ({ ...p, phone: e.target.value }))} />
            <input className="input" placeholder="Location (city, country)" value={personal.location} onChange={(e) => setPersonal((p) => ({ ...p, location: e.target.value }))} />
            <input className="input sm:col-span-2" placeholder="LinkedIn / portfolio link" value={personal.link} onChange={(e) => setPersonal((p) => ({ ...p, link: e.target.value }))} />
          </div>
        </div>

        <div className="card p-5">
          <div className="section-label mb-3">Summary</div>
          <textarea className="input" rows={3} placeholder="A 2–3 sentence summary of who you are and what you're looking for." value={summary} onChange={(e) => setSummary(e.target.value)} />
        </div>

        <div className="card p-5">
          <div className="section-label mb-3">Education</div>
          <div className="space-y-3">
            {education.map((e) => (
              <div key={e.id} className="grid sm:grid-cols-[2fr_2fr_1fr_1fr_auto] gap-2 items-center">
                <input className="input text-sm" placeholder="Degree" value={e.degree} onChange={(ev) => updateList(setEducation, e.id, "degree", ev.target.value)} />
                <input className="input text-sm" placeholder="Institution" value={e.institution} onChange={(ev) => updateList(setEducation, e.id, "institution", ev.target.value)} />
                <input className="input text-sm" placeholder="Year" value={e.year} onChange={(ev) => updateList(setEducation, e.id, "year", ev.target.value)} />
                <input className="input text-sm" placeholder="GPA" value={e.gpa} onChange={(ev) => updateList(setEducation, e.id, "gpa", ev.target.value)} />
                <button className="text-gray-400 hover:text-crimson-500" onClick={() => setEducation((l) => l.filter((x) => x.id !== e.id))}>✕</button>
              </div>
            ))}
          </div>
          <button className="btn-secondary text-sm mt-3" onClick={() => setEducation((l) => [...l, blankEdu()])}>+ Add education</button>
        </div>

        <div className="card p-5">
          <div className="section-label mb-3">Experience</div>
          <div className="space-y-4">
            {experience.map((e) => (
              <div key={e.id} className="border border-gray-100 rounded-lg p-3 space-y-2">
                <div className="grid sm:grid-cols-3 gap-2">
                  <input className="input text-sm" placeholder="Job title" value={e.title} onChange={(ev) => updateList(setExperience, e.id, "title", ev.target.value)} />
                  <input className="input text-sm" placeholder="Company" value={e.company} onChange={(ev) => updateList(setExperience, e.id, "company", ev.target.value)} />
                  <input className="input text-sm" placeholder="Duration (e.g. 2024–Present)" value={e.duration} onChange={(ev) => updateList(setExperience, e.id, "duration", ev.target.value)} />
                </div>
                <textarea className="input text-sm" rows={3} placeholder={"One achievement per line —\nBuilt X that improved Y by Z%"} value={e.description} onChange={(ev) => updateList(setExperience, e.id, "description", ev.target.value)} />
                <button className="text-xs text-gray-400 hover:text-crimson-500" onClick={() => setExperience((l) => l.filter((x) => x.id !== e.id))}>Remove this entry</button>
              </div>
            ))}
          </div>
          <button className="btn-secondary text-sm mt-3" onClick={() => setExperience((l) => [...l, blankExp()])}>+ Add experience</button>
        </div>

        <div className="card p-5">
          <div className="section-label mb-3">Skills</div>
          <input className="input" placeholder="Comma-separated, e.g. React, Python, SQL, Public Speaking" value={skills} onChange={(e) => setSkills(e.target.value)} />
        </div>

        <div className="card p-5">
          <div className="section-label mb-3">Projects</div>
          <div className="space-y-4">
            {projects.map((p) => (
              <div key={p.id} className="border border-gray-100 rounded-lg p-3 space-y-2">
                <div className="grid sm:grid-cols-2 gap-2">
                  <input className="input text-sm" placeholder="Project title" value={p.title} onChange={(ev) => updateList(setProjects, p.id, "title", ev.target.value)} />
                  <input className="input text-sm" placeholder="Link (optional)" value={p.link} onChange={(ev) => updateList(setProjects, p.id, "link", ev.target.value)} />
                </div>
                <textarea className="input text-sm" rows={2} placeholder="What it does, what you used to build it" value={p.description} onChange={(ev) => updateList(setProjects, p.id, "description", ev.target.value)} />
                <button className="text-xs text-gray-400 hover:text-crimson-500" onClick={() => setProjects((l) => l.filter((x) => x.id !== p.id))}>Remove this entry</button>
              </div>
            ))}
          </div>
          <button className="btn-secondary text-sm mt-3" onClick={() => setProjects((l) => [...l, blankProj()])}>+ Add project</button>
        </div>

        <button className="btn-primary w-full" onClick={download} disabled={generating}>
          {generating ? "Generating…" : "Download PDF"}
        </button>
      </div>
    </AppShell>
  );
}
