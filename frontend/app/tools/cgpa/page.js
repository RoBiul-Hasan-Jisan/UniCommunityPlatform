"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "../../../components/AppShell";
import { GRADE_SCALE, gpaFromLetter } from "../../../lib/grading";
import {
  ElevatedCard,
  ToolInput,
  ToolSelect,
  SectionTitle,
  IconBadge,
} from "../../../components/ToolsUI";

let nextId = 1;

function newCourse() {
  return {
    id: nextId++,
    name: "",
    credits: "3",
    grade: "",
  };
}

export default function CgpaCalculatorPage() {
  const [courses, setCourses] = useState([
    newCourse(),
    newCourse(),
    newCourse(),
  ]);

  const [includePrevious, setIncludePrevious] = useState(false);
  const [prevCgpa, setPrevCgpa] = useState("");
  const [prevCredits, setPrevCredits] = useState("");
  const [showScale, setShowScale] = useState(false);

  function updateCourse(id, key, value) {
    setCourses((current) =>
      current.map((course) =>
        course.id === id ? { ...course, [key]: value } : course
      )
    );
  }

  function addCourse() {
    setCourses((current) => [...current, newCourse()]);
  }

  function removeCourse(id) {
    if (courses.length <= 1) return;
    setCourses((current) => current.filter((course) => course.id !== id));
  }

  const rows = courses.map((course) => {
    const credits = parseFloat(course.credits) || 0;
    const grade = course.grade ? gpaFromLetter(course.grade) : null;
    const points = grade ? grade.gpa * credits : 0;

    return { ...course, credits, grade, points };
  });

  const completedCourses = rows.filter((row) => row.grade);

  const semesterCredits = rows.reduce(
    (sum, row) => sum + (row.grade ? row.credits : 0),
    0
  );

  const semesterPoints = rows.reduce((sum, row) => sum + row.points, 0);

  const semesterGpa =
    semesterCredits > 0 ? semesterPoints / semesterCredits : null;

  const cumulative = useMemo(() => {
    if (!includePrevious) return null;

    const pCgpa = parseFloat(prevCgpa) || 0;
    const pCredits = parseFloat(prevCredits) || 0;

    if (pCredits <= 0 && semesterCredits <= 0) return null;

    const totalPoints = pCgpa * pCredits + semesterPoints;
    const totalCredits = pCredits + semesterCredits;

    return totalCredits > 0 ? totalPoints / totalCredits : null;
  }, [includePrevious, prevCgpa, prevCredits, semesterPoints, semesterCredits]);

  const totalPrevCredits = parseFloat(prevCredits) || 0;

  return (
    <AppShell>
      {/* Back */}
      <Link
        href="/tools"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-brass-600 transition-colors"
      >
        <span>←</span>
        All tools
      </Link>

      {/* Header - compact on mobile */}
      <header className="mt-4 sm:mt-6 mb-4 sm:mb-8">
        <div className="flex items-start gap-3 sm:gap-4">
          <IconBadge>
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <rect x="4" y="3.5" width="16" height="17" rx="1.5" />
              <path
                d="M8 8h8M8 12h3M8 16h3M14 12.5h2M14 16.5h2"
                strokeLinecap="round"
              />
            </svg>
          </IconBadge>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-[1.4rem] sm:text-[2rem] tracking-tight text-ink-800">
                CGPA Calculator
              </h1>

              <span className="rounded-full bg-brass-50 px-2 py-0.5 text-[0.6rem] sm:text-[0.65rem] font-semibold uppercase tracking-wide text-brass-700">
                4.0 Scale
              </span>
            </div>

            <p className="mt-1 max-w-xl text-[0.78rem] sm:text-sm leading-5 text-gray-500 hidden sm:block">
              Add your courses, credits, and grades to calculate your
              semester GPA and cumulative CGPA.
            </p>
          </div>
        </div>
      </header>

      {/* Sticky compact result bar - always visible, minimal height, no separate summary card needed */}
      <div className="sticky top-0 z-10 -mx-4 mb-4 px-4 py-2.5 sm:static sm:mx-0 sm:mb-6 sm:px-0 sm:py-0 bg-[#fbfaf8]/95 backdrop-blur sm:bg-transparent sm:backdrop-blur-0">
        <div
          className={`rounded-2xl bg-gradient-to-br from-ink-800 via-ink-800 to-ink-700 px-4 py-3 sm:p-6 text-white shadow-[0_12px_28px_-14px_rgba(18,25,43,0.5)] grid ${
            includePrevious ? "grid-cols-2 divide-x divide-white/10" : "grid-cols-1"
          }`}
        >
          {/* Semester GPA */}
          <div className={includePrevious ? "pr-3 sm:pr-6" : ""}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[0.58rem] sm:text-[0.65rem] font-semibold uppercase tracking-widest text-ink-300 truncate">
                  Semester GPA
                </div>
                <div className="mt-0.5 sm:mt-2 font-serif text-[1.9rem] sm:text-[3.5rem] leading-none tracking-tight text-brass-200">
                  {semesterGpa !== null ? semesterGpa.toFixed(2) : "—"}
                </div>
              </div>

              <div className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                <svg
                  className="h-6 w-6 text-brass-200"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M4 19V5M4 19h16" strokeLinecap="round" />
                  <path
                    d="M7 15l3-4 3 2 5-7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            <div className="mt-1.5 sm:mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.68rem] sm:text-xs text-ink-300">
              <span>
                {semesterCredits} cr{semesterCredits === 1 ? "" : "s"}
              </span>
              <span className="h-1 w-1 rounded-full bg-ink-500" />
              <span>{completedCourses.length}/{courses.length} graded</span>
            </div>
          </div>

          {/* Cumulative CGPA - inline, no separate card, only if enabled */}
          {includePrevious && (
            <div className="pl-3 sm:pl-6">
              <div className="text-[0.58rem] sm:text-[0.65rem] font-semibold uppercase tracking-widest text-brass-200/80 truncate">
                Cumulative CGPA
              </div>
              <div className="mt-0.5 sm:mt-2 font-serif text-[1.9rem] sm:text-[3.5rem] leading-none tracking-tight text-white">
                {cumulative !== null ? cumulative.toFixed(2) : "—"}
              </div>
              <p className="mt-1.5 sm:mt-4 text-[0.68rem] sm:text-xs text-ink-300">
                {totalPrevCredits + semesterCredits} total credits
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main content - single column, tightened spacing */}
      <div className="space-y-4 sm:space-y-5">
        {/* Courses */}
        <ElevatedCard className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-6 sm:py-4">
            <h2 className="font-semibold text-ink-800 text-sm sm:text-base">
              Your courses
            </h2>

            <button
              type="button"
              onClick={addCourse}
              className="flex items-center gap-1 rounded-full bg-brass-50 px-3 py-1.5 text-xs font-semibold text-brass-700 transition-colors hover:bg-brass-100 active:bg-brass-200"
            >
              <span className="text-sm leading-none">+</span>
              Add
            </button>
          </div>

          {/* Compact column headers - desktop only */}
          <div className="hidden sm:grid grid-cols-[1fr_100px_150px_100px_40px] gap-2 px-6 pt-3 text-[0.65rem] font-medium uppercase tracking-wide text-gray-400">
            <span>Course name</span>
            <span>Credits</span>
            <span>Grade</span>
            <span className="text-right pr-2">Points</span>
            <span />
          </div>

          <div className="divide-y divide-gray-100">
            {rows.map((row, index) => (
              <div key={row.id} className="px-3 py-3 sm:px-6 sm:py-2.5">
                {/* Mobile: stacked compact row | Desktop: single grid row */}
                <div className="grid grid-cols-[1fr_auto] items-center gap-2 sm:hidden">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[0.6rem] font-semibold text-gray-400">
                      {index + 1}
                    </span>
                    <ToolInput
                      className="w-full"
                      placeholder={`Course ${index + 1}`}
                      value={row.name}
                      onChange={(e) =>
                        updateCourse(row.id, "name", e.target.value)
                      }
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeCourse(row.id)}
                    disabled={courses.length === 1}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-crimson-50 hover:text-crimson-500 disabled:cursor-not-allowed disabled:opacity-30"
                    title="Remove course"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>

                <div className="mt-2 grid grid-cols-[70px_1fr_66px] items-center gap-2 sm:hidden">
                  <ToolInput
                    type="number"
                    min="0"
                    step="0.5"
                    value={row.credits}
                    onChange={(e) =>
                      updateCourse(row.id, "credits", e.target.value)
                    }
                  />

                  <ToolSelect
                    className={`w-full ${
                      row.grade?.letter === "F"
                        ? "text-crimson-500 font-medium"
                        : row.grade
                        ? "text-ink-800 font-semibold"
                        : "text-gray-400"
                    }`}
                    value={row.grade?.letter || ""}
                    onChange={(e) =>
                      updateCourse(row.id, "grade", e.target.value)
                    }
                  >
                    <option value="" disabled>
                      Grade
                    </option>
                    {GRADE_SCALE.map((g) => (
                      <option key={g.letter} value={g.letter}>
                        {g.letter} — {g.gpa.toFixed(1)}
                      </option>
                    ))}
                  </ToolSelect>

                  <div className="flex h-10 items-center justify-center rounded-lg border border-gray-100 bg-gray-50 text-sm font-semibold text-ink-700">
                    {row.grade ? row.points.toFixed(2) : "—"}
                  </div>
                </div>

                {/* Desktop: single tight row */}
                <div className="hidden sm:grid grid-cols-[1fr_100px_150px_100px_40px] items-center gap-2">
                  <ToolInput
                    className="w-full"
                    placeholder={`Course ${index + 1}`}
                    value={row.name}
                    onChange={(e) =>
                      updateCourse(row.id, "name", e.target.value)
                    }
                  />

                  <ToolInput
                    type="number"
                    min="0"
                    step="0.5"
                    value={row.credits}
                    onChange={(e) =>
                      updateCourse(row.id, "credits", e.target.value)
                    }
                  />

                  <ToolSelect
                    className={`w-full ${
                      row.grade?.letter === "F"
                        ? "text-crimson-500 font-medium"
                        : row.grade
                        ? "text-ink-800 font-semibold"
                        : "text-gray-400"
                    }`}
                    value={row.grade?.letter || ""}
                    onChange={(e) =>
                      updateCourse(row.id, "grade", e.target.value)
                    }
                  >
                    <option value="" disabled>
                      Select grade
                    </option>
                    {GRADE_SCALE.map((g) => (
                      <option key={g.letter} value={g.letter}>
                        {g.letter} — {g.gpa.toFixed(1)} GPA
                      </option>
                    ))}
                  </ToolSelect>

                  <div className="text-right pr-2 text-sm font-semibold text-ink-700">
                    {row.grade ? row.points.toFixed(2) : "—"}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeCourse(row.id)}
                    disabled={courses.length === 1}
                    className="flex h-7 w-7 items-center justify-center justify-self-center rounded-full text-gray-300 transition-colors hover:bg-crimson-50 hover:text-crimson-500 disabled:cursor-not-allowed disabled:opacity-30"
                    title="Remove course"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="px-3 py-3 sm:hidden">
            <button
              type="button"
              onClick={addCourse}
              className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brass-300 px-4 py-2.5 text-sm font-medium text-brass-700 transition-colors active:bg-brass-100"
            >
              <span className="text-lg leading-none">+</span>
              Add another course
            </button>
          </div>
        </ElevatedCard>

        {/* Previous semesters - collapsible, compact when closed */}
        <ElevatedCard className="p-3.5 sm:p-5">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              className="h-4 w-4 shrink-0 accent-brass-500"
              checked={includePrevious}
              onChange={(e) => setIncludePrevious(e.target.checked)}
            />

            <div className="min-w-0">
              <span className="text-sm font-semibold text-ink-800">
                Include previous semesters
              </span>
              <p className="text-[0.72rem] leading-4 text-gray-400 sm:hidden">
                Factor in your existing CGPA
              </p>
            </div>
          </label>

          {includePrevious && (
            <div className="mt-3.5 grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1 block text-[0.68rem] font-medium text-gray-500">
                  Previous CGPA
                </label>
                <ToolInput
                  className="w-full"
                  type="number"
                  min="0"
                  max="4"
                  step="0.01"
                  value={prevCgpa}
                  onChange={(e) => setPrevCgpa(e.target.value)}
                  placeholder="3.45"
                />
              </div>

              <div>
                <label className="mb-1 block text-[0.68rem] font-medium text-gray-500">
                  Previous credits
                </label>
                <ToolInput
                  className="w-full"
                  type="number"
                  min="0"
                  step="0.5"
                  value={prevCredits}
                  onChange={(e) => setPrevCredits(e.target.value)}
                  placeholder="60"
                />
              </div>
            </div>
          )}
        </ElevatedCard>

        {/* Grading scale - collapsed by default to save scroll, toggled on demand */}
        <ElevatedCard className="overflow-hidden p-0">
          <button
            type="button"
            onClick={() => setShowScale((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3.5 sm:px-5 sm:py-4"
          >
            <SectionTitle>Grading scale</SectionTitle>

            <div className="flex items-center gap-2">
              <span className="text-[0.6rem] font-medium uppercase tracking-wide text-gray-400">
                4.0 Scale
              </span>
              <svg
                className={`h-4 w-4 text-gray-400 transition-transform ${
                  showScale ? "rotate-180" : ""
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </button>

          {showScale && (
            <div className="mx-4 mb-4 sm:mx-5 sm:mb-5 overflow-hidden rounded-xl border border-gray-100">
              {GRADE_SCALE.map((g, index) => {
                const next = GRADE_SCALE[index - 1];
                const range = next
                  ? `${g.min}% – <${next.min}%`
                  : `${g.min}% & above`;

                return (
                  <div
                    key={g.letter}
                    className={`flex items-center justify-between px-3 py-2 text-xs ${
                      index !== GRADE_SCALE.length - 1
                        ? "border-b border-gray-100"
                        : ""
                    }`}
                  >
                    <span className="text-gray-500">
                      {index === GRADE_SCALE.length - 1
                        ? "Below 60%"
                        : range}
                    </span>

                    <span className="font-semibold text-ink-700">
                      {g.letter}
                      <span className="mx-1 text-gray-300">·</span>
                      {g.gpa.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </ElevatedCard>
      </div>
    </AppShell>
  );
}