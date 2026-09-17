"use client";

import Link from "next/link";
import AppShell from "../../components/AppShell";

const TOOLS = [
  {
    href: "/tools/cgpa",
    title: "CGPA Calculator",
    desc: "Enter your course marks and credit hours, get your semester and cumulative CGPA on your university's grading scale.",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="4" y="3.5" width="16" height="17" rx="1.5" />
        <path d="M8 8h8M8 12h3M8 16h3M14 12.5h2M14 16.5h2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/tools/coverpage",
    title: "Cover Page Generator",
    desc: "Fill in your course, title, and student details — get a clean, properly formatted cover page as a PDF.",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
        <path d="M14 3v5h5" strokeLinejoin="round" />
        <path d="M8 13h8M8 16.5h5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/tools/resume",
    title: "Resume Builder",
    desc: "Build a clean, ATS-friendly resume from your education, experience, and skills — download it as a PDF.",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="7.5" r="3" />
        <path d="M5 20c0-3.6 3.1-6.2 7-6.2s7 2.6 7 6.2" strokeLinecap="round" />
        <path d="M4 3.5h3M4 3.5v3M20 3.5h-3M20 3.5v3" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function ToolsHubPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-ink-800">Tools</h1>
        <p className="text-sm text-gray-500 mt-1">A few things every student ends up needing — done in a minute, no sign-up elsewhere.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href} className="card card-interactive p-5 block">
            <span className="w-10 h-10 rounded-full bg-ink-800 text-brass-200 flex items-center justify-center mb-3">
              {t.icon}
            </span>
            <div className="font-semibold text-ink-800">{t.title}</div>
            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{t.desc}</p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
