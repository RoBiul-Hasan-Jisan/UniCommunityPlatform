// University grading scale, percentage → letter grade → GPA point.
// Note: the source table has a gap between "60%–<65% = D" and "<59% = F"
// (59–60% is undefined). Treated as a typo and closed so every percentage
// from 0–100 maps to a grade with no gap: anything under 60% is F.
export const GRADE_SCALE = [
  { min: 93, letter: "A", gpa: 4.0 },
  { min: 89, letter: "A−", gpa: 3.7 },
  { min: 86, letter: "B+", gpa: 3.3 },
  { min: 82, letter: "B", gpa: 3.0 },
  { min: 79, letter: "B−", gpa: 2.7 },
  { min: 75, letter: "C+", gpa: 2.3 },
  { min: 72, letter: "C", gpa: 2.0 },
  { min: 69, letter: "C−", gpa: 1.7 },
  { min: 65, letter: "D+", gpa: 1.3 },
  { min: 60, letter: "D", gpa: 1.0 },
  { min: 0, letter: "F", gpa: 0.0 },
];

export function gradeFromPercentage(pct) {
  const n = Number(pct);
  if (Number.isNaN(n)) return null;
  const clamped = Math.max(0, Math.min(100, n));
  return GRADE_SCALE.find((s) => clamped >= s.min) || GRADE_SCALE[GRADE_SCALE.length - 1];
}
