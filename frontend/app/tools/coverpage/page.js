"use client";

import { useState } from "react";
import Link from "next/link";
import AppShell from "../../../components/AppShell";
import { useAuth } from "../../../lib/AuthContext";

export default function CoverPageToolPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    university: "",
    department: user?.department || "",
    courseCode: "",
    courseTitle: "",
    assignmentTitle: "",
    studentName: user?.name || "",
    studentId: "",
    section: "",
    semester: "",
    instructorName: "",
    instructorDesignation: "",
    date: new Date().toISOString().slice(0, 10),
  });
  const [generating, setGenerating] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function download() {
    setGenerating(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const centerX = pageW / 2;

      // outer border, like a printed cover sheet
      doc.setDrawColor(20, 25, 43);
      doc.setLineWidth(1.2);
      doc.rect(28, 28, pageW - 56, pageH - 56);

      let y = 90;
      doc.setFont("times", "bold");
      doc.setFontSize(20);
      if (form.university) {
        doc.text(form.university, centerX, y, { align: "center" });
        y += 26;
      }
      if (form.department) {
        doc.setFont("times", "normal");
        doc.setFontSize(13);
        doc.text(form.department, centerX, y, { align: "center" });
        y += 40;
      } else {
        y += 20;
      }

      // course line
      doc.setFont("times", "normal");
      doc.setFontSize(13);
      const courseLine = [form.courseCode, form.courseTitle].filter(Boolean).join(" — ");
      if (courseLine) {
        doc.text(courseLine, centerX, y, { align: "center" });
        y += 50;
      }

      // assignment title, the centerpiece
      doc.setFont("times", "bold");
      doc.setFontSize(24);
      const titleLines = doc.splitTextToSize(form.assignmentTitle || "Assignment Title", pageW - 160);
      titleLines.forEach((line) => {
        doc.text(line, centerX, y, { align: "center" });
        y += 30;
      });

      y += 40;
      doc.setLineWidth(0.6);
      doc.line(centerX - 90, y, centerX + 90, y);
      y += 40;

      // submitted by / to, two columns
      const colLeftX = 90;
      const colRightX = pageW / 2 + 30;
      const startY = y;
      doc.setFont("times", "bold");
      doc.setFontSize(13);
      doc.text("Submitted By", colLeftX, y);
      doc.text("Submitted To", colRightX, y);
      y += 20;

      doc.setFont("times", "normal");
      doc.setFontSize(11.5);
      const leftLines = [
        form.studentName && `Name: ${form.studentName}`,
        form.studentId && `ID: ${form.studentId}`,
        form.section && `Section: ${form.section}`,
        form.semester && `Semester: ${form.semester}`,
      ].filter(Boolean);
      const rightLines = [
        form.instructorName && `Name: ${form.instructorName}`,
        form.instructorDesignation && form.instructorDesignation,
        form.department && `Department: ${form.department}`,
      ].filter(Boolean);

      let ly = startY + 20, ry = startY + 20;
      leftLines.forEach((l) => { doc.text(l, colLeftX, ly); ly += 18; });
      rightLines.forEach((l) => { doc.text(l, colRightX, ry); ry += 18; });

      // date, bottom
      doc.setFont("times", "italic");
      doc.setFontSize(11);
      doc.text(`Date of Submission: ${new Date(form.date).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}`, centerX, pageH - 90, { align: "center" });

      doc.save(`${(form.assignmentTitle || "cover-page").replace(/\s+/g, "-").toLowerCase()}.pdf`);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <AppShell>
      <Link href="/tools" className="text-sm text-brass-600 hover:text-brass-700">&larr; All tools</Link>

      <div className="mt-3 mb-6">
        <h1 className="font-serif text-2xl text-ink-800">Cover Page Generator</h1>
        <p className="text-sm text-gray-500 mt-1">Fill this in once, download a clean cover page PDF for any assignment or report.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5 space-y-3">
          <div>
            <label className="text-sm font-medium text-ink-700">University / Institution name</label>
            <input className="input mt-1" value={form.university} onChange={(e) => set("university", e.target.value)} placeholder="e.g. XYZ University" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-700">Department</label>
            <input className="input mt-1" value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="e.g. Department of Computer Science" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-ink-700">Course code</label>
              <input className="input mt-1" value={form.courseCode} onChange={(e) => set("courseCode", e.target.value)} placeholder="e.g. CSE 220" />
            </div>
            <div>
              <label className="text-sm font-medium text-ink-700">Course title</label>
              <input className="input mt-1" value={form.courseTitle} onChange={(e) => set("courseTitle", e.target.value)} placeholder="e.g. Algorithms" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-ink-700">Assignment / report title</label>
            <input className="input mt-1" value={form.assignmentTitle} onChange={(e) => set("assignmentTitle", e.target.value)} placeholder="e.g. Lab Report 3: Sorting Algorithms" />
          </div>

          <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-ink-700">Your name</label>
              <input className="input mt-1" value={form.studentName} onChange={(e) => set("studentName", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-ink-700">Student ID</label>
              <input className="input mt-1" value={form.studentId} onChange={(e) => set("studentId", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-ink-700">Section</label>
              <input className="input mt-1" value={form.section} onChange={(e) => set("section", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-ink-700">Semester</label>
              <input className="input mt-1" value={form.semester} onChange={(e) => set("semester", e.target.value)} placeholder="e.g. Fall 2026" />
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-ink-700">Instructor name</label>
              <input className="input mt-1" value={form.instructorName} onChange={(e) => set("instructorName", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-ink-700">Designation</label>
              <input className="input mt-1" value={form.instructorDesignation} onChange={(e) => set("instructorDesignation", e.target.value)} placeholder="e.g. Lecturer" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-ink-700">Submission date</label>
            <input className="input mt-1" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
          </div>

          <button className="btn-primary w-full mt-2" onClick={download} disabled={generating}>
            {generating ? "Generating…" : "Download PDF"}
          </button>
        </div>

        {/* live preview */}
        <div className="card p-6 flex items-start justify-center bg-white">
          <div className="border-2 border-ink-800 w-full max-w-sm aspect-[210/297] p-6 flex flex-col text-center font-serif">
            {form.university && <div className="text-base font-bold text-ink-800">{form.university}</div>}
            {form.department && <div className="text-xs text-gray-600 mt-1">{form.department}</div>}
            {(form.courseCode || form.courseTitle) && (
              <div className="text-xs text-gray-600 mt-6">{[form.courseCode, form.courseTitle].filter(Boolean).join(" — ")}</div>
            )}
            <div className="flex-1 flex items-center justify-center px-2">
              <div className="text-lg font-bold text-ink-800 leading-snug">{form.assignmentTitle || "Assignment Title"}</div>
            </div>
            <div className="border-t border-gray-300 pt-4 grid grid-cols-2 gap-2 text-left text-[10px] text-gray-700">
              <div>
                <div className="font-bold mb-1">Submitted By</div>
                {form.studentName && <div>Name: {form.studentName}</div>}
                {form.studentId && <div>ID: {form.studentId}</div>}
                {form.section && <div>Section: {form.section}</div>}
                {form.semester && <div>Semester: {form.semester}</div>}
              </div>
              <div>
                <div className="font-bold mb-1">Submitted To</div>
                {form.instructorName && <div>Name: {form.instructorName}</div>}
                {form.instructorDesignation && <div>{form.instructorDesignation}</div>}
                {form.department && <div>{form.department}</div>}
              </div>
            </div>
            <div className="text-[10px] text-gray-500 italic mt-3">
              Date of Submission: {new Date(form.date).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
