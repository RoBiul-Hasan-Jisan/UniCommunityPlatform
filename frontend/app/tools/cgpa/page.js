"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "../../../components/AppShell";
import { GRADE_SCALE, gpaFromLetter } from "../../../lib/grading";

let nextId = 1;
function newCourse() {
  return { id: nextId++, name: "", credits: "3", grade: "" };
}

export default function CgpaCalculatorPage() {
  const [courses, setCourses] = useState([newCourse(), newCourse(), newCourse()]);
  const [includePrevious, setIncludePrevious] = useState(false);
  const [prevCgpa, setPrevCgpa] = useState("");
  const [prevCredits, setPrevCredits] = useState("");

  function updateCourse(id, key, value) {
    setCourses((cs) => cs.map((c) => (c.id === id ? { ...c, [key]: value } : c)));
  }
  function addCourse() {
    setCourses((cs) => [...cs, newCourse()]);
  }
  function removeCourse(id) {
    setCourses((cs) => cs.filter((c) => c.id !== id));
  }

  const rows = courses.map((c) => {
    const credits = parseFloat(c.credits) || 0;
    const grade = c.grade ? gpaFromLetter(c.grade) : null;
    const points = grade ? grade.gpa * credits : 0;
    return { ...c, credits, grade, points };
  });

  const semesterCredits = rows.reduce((sum, r) => sum + (r.grade ? r.credits : 0), 0);
  const semesterPoints = rows.reduce((sum, r) => sum + r.points, 0);
  const semesterGpa = semesterCredits > 0 ? semesterPoints / semesterCredits : null;

  const cumulative = useMemo(() => {
    if (!includePrevious) return null;
    const pCgpa = parseFloat(prevCgpa) || 0;
    const pCredits = parseFloat(prevCredits) || 0;
    if (pCredits <= 0 && semesterCredits <= 0) return null;
    const totalPoints = pCgpa * pCredits + semesterPoints;
    const totalCredits = pCredits + semesterCredits;
    return totalCredits > 0 ? totalPoints / totalCredits : null;
  }, [includePrevious, prevCgpa, prevCredits, semesterPoints, semesterCredits]);

  return (
    <AppShell>
      <Link href="/tools" className="text-sm text-brass-600 hover:text-brass-700">&larr; All tools</Link>

      <div className="mt-3 mb-6">
        <h1 className="font-serif text-2xl text-ink-800">CGPA Calculator</h1>
        <p className="text-sm text-gray-500 mt-1">Pick the GPA point you got in each course — everything else calculates automatically.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-5">
          <div className="hidden sm:grid grid-cols-[1fr_90px_100px_80px_32px] gap-2 text-xs font-medium text-gray-500 px-1 mb-2">
            <div>Course name</div>
            <div>Credits</div>
            <div>Grade</div>
            <div>Points</div>
            <div></div>
          </div>
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="grid grid-cols-2 sm:grid-cols-[1fr_90px_100px_80px_32px] gap-2 items-center">
                <input
                  className="input text-sm col-span-2 sm:col-span-1"
                  placeholder="e.g. Data Structures"
                  value={r.name}
                  onChange={(e) => updateCourse(r.id, "name", e.target.value)}
                />
                <input
                  className="input text-sm"
                  type="number"
                  min="0"
                  step="0.5"
                  value={r.credits}
                  onChange={(e) => updateCourse(r.id, "credits", e.target.value)}
                />
                <select
                  className={`input text-sm ${r.grade?.letter === "F" ? "text-crimson-500 font-medium" : ""}`}
                  value={r.grade}
                  onChange={(e) => updateCourse(r.id, "grade", e.target.value)}
                >
                  <option value="">Select</option>
                  {GRADE_SCALE.map((g) => (
                    <option key={g.letter} value={g.letter}>{g.gpa.toFixed(1)} ({g.letter})</option>
                  ))}
                </select>
                <div className="text-sm text-gray-500 text-center">{r.grade ? r.points.toFixed(2) : "—"}</div>
                <button
                  className="text-gray-400 hover:text-crimson-500 text-sm justify-self-center"
                  onClick={() => removeCourse(r.id)}
                  title="Remove course"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button className="btn-secondary text-sm mt-4" onClick={addCourse}>+ Add course</button>

          <div className="mt-6 pt-5 border-t border-gray-100">
            <label className="flex items-center gap-2 text-sm text-ink-700 font-medium">
              <input type="checkbox" checked={includePrevious} onChange={(e) => setIncludePrevious(e.target.checked)} />
              Include previous semesters (calculate cumulative CGPA)
            </label>
            {includePrevious && (
              <div className="grid sm:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-xs text-gray-500">Previous CGPA</label>
                  <input className="input text-sm mt-1" type="number" min="0" max="4" step="0.01" value={prevCgpa} onChange={(e) => setPrevCgpa(e.target.value)} placeholder="e.g. 3.45" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Previous total credits</label>
                  <input className="input text-sm mt-1" type="number" min="0" step="0.5" value={prevCredits} onChange={(e) => setPrevCredits(e.target.value)} placeholder="e.g. 60" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="stat-card">
            <div className="text-xs text-ink-200">This semester</div>
            <div className="font-serif text-4xl text-brass-200 mt-1">{semesterGpa !== null ? semesterGpa.toFixed(2) : "—"}</div>
            <div className="text-xs text-ink-300 mt-1">{semesterCredits} credit hour{semesterCredits === 1 ? "" : "s"}</div>
          </div>

          {includePrevious && (
            <div className="stat-card">
              <div className="text-xs text-ink-200">Cumulative CGPA</div>
              <div className="font-serif text-4xl text-brass-200 mt-1">{cumulative !== null ? cumulative.toFixed(2) : "—"}</div>
              <div className="text-xs text-ink-300 mt-1">
                {(parseFloat(prevCredits) || 0) + semesterCredits} total credit hours
              </div>
            </div>
          )}

          <div className="card p-4">
            <div className="text-xs font-medium text-gray-500 mb-2">Grading scale</div>
            <div className="space-y-1 text-xs">
              {GRADE_SCALE.map((g, i) => {
                const next = GRADE_SCALE[i - 1];
                const range = next ? `${g.min}% – <${next.min}%` : `${g.min}% & above`;
                return (
                  <div key={g.letter} className="flex justify-between text-gray-600">
                    <span>{i === GRADE_SCALE.length - 1 ? `Below 60%` : range}</span>
                    <span className="font-medium text-ink-700">{g.letter} · {g.gpa.toFixed(1)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
