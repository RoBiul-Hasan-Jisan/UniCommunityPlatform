"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../lib/AuthContext";

function dismissKey(userId) {
  return `onboarding.dismissed.${userId}`;
}

export default function OnboardingChecklist() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(true); // default hidden until we know otherwise, avoids a flash

  useEffect(() => {
    if (!user) return;
    setDismissed(localStorage.getItem(dismissKey(user._id)) === "1");
  }, [user]);

  if (!user || dismissed) return null;

  const hasAbout = !!user.about?.trim();
  const hasSkills = (user.skills?.length || 0) > 0;
  const profileComplete = hasAbout && hasSkills;

  // Only worth showing while there's still something meaningful left to do.
  if (profileComplete) return null;

  function dismiss() {
    localStorage.setItem(dismissKey(user._id), "1");
    setDismissed(true);
  }

  return (
    <div className="card-feature p-5 mb-6 relative">
      <button onClick={dismiss} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-sm" title="Dismiss">✕</button>
      <div className="font-serif text-lg text-ink-800">Welcome — let's get you set up</div>
      <p className="text-sm text-gray-500 mt-1 mb-4">A couple of quick things make this place actually useful.</p>
      <div className="space-y-2.5">
        <ChecklistItem done={hasAbout} href={`/profile/${user._id}`} label="Add a short bio to your profile" />
        <ChecklistItem done={hasSkills} href={`/profile/${user._id}`} label="List a few of your skills" />
        <ChecklistItem done={false} href="/discover" label="Find and connect with a few people" optional />
        <ChecklistItem done={false} href={user.role === "student" ? "/workshops" : "/mentorship"} label={user.role === "student" ? "Browse an upcoming workshop" : "Check for mentorship requests"} optional />
      </div>
    </div>
  );
}

function ChecklistItem({ done, href, label, optional }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 text-sm no-underline group">
      <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${done ? "bg-brass-500 border-brass-500" : "border-gray-300"}`}>
        {done && <span className="text-white text-[9px]">✓</span>}
      </span>
      <span className={`${done ? "text-gray-400 line-through" : "text-ink-700 group-hover:text-brass-600"} transition-colors`}>
        {label}{optional && !done && <span className="text-gray-400 font-normal"> (optional)</span>}
      </span>
    </Link>
  );
}
