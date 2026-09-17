"use client";

import Link from "next/link";
import AppShell from "../../components/AppShell";
import { ElevatedCard, IconBadge } from "../../components/ToolsUI";

const TOOLS = [
  {
    href: "/tools/cgpa",
    title: "CGPA Calculator",
    desc: "Pick the GPA point you earned in each course — your semester and cumulative CGPA calculate instantly.",
    tag: "Calculator",
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
    desc: "Pick a layout, drop in your university logo, fill in the details — download a print-ready PDF.",
    tag: "3 layouts · logo support",
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
    desc: "Build a clean, ATS-friendly resume from your education, experience, and skills — download as a PDF.",
    tag: "Auto-filled from profile",
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
      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 text-[0.7rem] font-semibold tracking-wide text-brass-600 bg-brass-50 px-2.5 py-1 rounded-full mb-3">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 2 7l10 5 10-5-10-5Z" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
          STUDENT TOOLKIT
        </div>
        <h1 className="font-serif text-[1.9rem] tracking-[-0.01em] text-ink-800">Tools</h1>
        <p className="text-[0.925rem] text-gray-500 mt-1.5 max-w-lg">A few things every student ends up needing — done in a minute, no sign-up elsewhere required.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-5">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href} className="group block no-underline">
            <ElevatedCard className="p-6 h-full transition-all duration-200 group-hover:shadow-[0_1px_1px_rgba(18,25,43,0.03),0_22px_44px_-16px_rgba(18,25,43,0.24)] group-hover:-translate-y-1">
              <IconBadge>{t.icon}</IconBadge>
              <div className="font-serif text-lg text-ink-800 mt-4">{t.title}</div>
              <p className="text-[0.85rem] text-gray-500 mt-2 leading-relaxed">{t.desc}</p>
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
                <span className="text-[0.7rem] font-medium text-gray-400">{t.tag}</span>
                <svg className="w-4 h-4 text-brass-500 transition-transform duration-150 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </ElevatedCard>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
