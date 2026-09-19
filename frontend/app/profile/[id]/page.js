"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "../../../components/AppShell";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/AuthContext";
import { usePresence } from "../../../lib/usePresence";

function ListEditor({ label, items, onChange }) {
  const [draft, setDraft] = useState("");
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex flex-wrap gap-1 mt-1 mb-2">
        {items?.map((item, i) => (
          <span key={i} className="badge bg-gray-100 text-gray-600">
            {item}
            <button className="ml-1 text-gray-400" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input className="input text-sm" placeholder={`Add ${label.toLowerCase()}...`} value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              e.preventDefault();
              onChange([...(items || []), draft.trim()]);
              setDraft("");
            }
          }}
        />
        <button type="button" className="btn-secondary text-sm" onClick={() => { if (draft.trim()) { onChange([...(items || []), draft.trim()]); setDraft(""); } }}>Add</button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { id } = useParams();
  const { user, setUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [impact, setImpact] = useState(null);
  const online = usePresence([id]);

  const isOwn = user && String(user._id) === String(id);

  async function load() {
    try {
      const { user: p } = await api(`/users/${id}`);
      setProfile(p);
      setForm(p);
    } catch (e) {
      setLoadError(e.message);
    }
  }

  useEffect(() => {
    if (authLoading || !user) return;
    load();
    api(`/users/${id}/impact`).then(setImpact).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, authLoading, user]);

  async function endorseSkill(skill) {
    try {
      const { endorsements } = await api(`/users/${id}/endorse`, { method: "POST", body: { skill } });
      setProfile((p) => ({ ...p, endorsements }));
    } catch (e) {
      alert(e.message);
    }
  }

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const { user: updated } = await api("/users/me", { method: "PUT", body: form });
      setProfile(updated);
      setUser(updated);
      setEditing(false);
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function connect() {
    try {
      await api("/connections/request", { method: "POST", body: { recipientId: id } });
      alert("Connection request sent!");
    } catch (e) {
      alert(e.message);
    }
  }

  async function message() {
    try {
      const { conversation } = await api("/messages/start", { method: "POST", body: { userId: id } });
      router.push(`/messages/${conversation._id}`);
    } catch (e) {
      alert(e.message);
    }
  }

  if (loadError && !profile) {
    return (
      <AppShell>
        <div className="card p-6 text-sm text-crimson-500 max-w-2xl">Couldn't load this profile: {loadError}</div>
      </AppShell>
    );
  }

  if (!profile || !form) return <AppShell><div className="text-gray-400 text-sm">Loading…</div></AppShell>;

  const isStudent = profile.role === "student";

  return (
    <AppShell>
      <div className="card-feature p-7 max-w-2xl">
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <span className="avatar w-14 h-14 text-lg shrink-0">
              {(profile.name || "?").trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
            </span>
            <div className="min-w-0">
              <h1 className="font-serif text-2xl text-ink-800 truncate">{profile.name}</h1>
              <div className="text-sm text-gray-500 capitalize mt-0.5 flex items-center gap-1.5">
                {profile.role} · {profile.department}
                {!isOwn && (
                  <span className={`flex items-center gap-1 text-xs normal-case ${online.has(id) ? "text-green-600" : "text-gray-400"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${online.has(id) ? "bg-green-500" : "bg-gray-300"}`} />
                    {online.has(id) ? "Online now" : "Offline"}
                  </span>
                )}
              </div>
              {profile.email && <div className="text-xs text-gray-400 mt-1">{profile.email}</div>}
              {impact && impact.tier !== "Getting started" && (
                <span className="badge border border-brass-300 text-brass-600 mt-2 inline-flex items-center gap-1">
                  ★ {impact.tier}
                </span>
              )}
            </div>
          </div>
          {isOwn ? (
            <button className="btn-secondary text-sm" onClick={() => setEditing((e) => !e)}>
              {editing ? "Cancel" : "Edit Profile"}
            </button>
          ) : profile.role === "admin" ? (
            <span className="text-xs text-gray-400">Admin accounts aren't connectable</span>
          ) : (
            <div className="flex gap-2">
              <button className="btn-secondary text-sm" onClick={connect}>Connect</button>
              <button className="btn-primary text-sm" onClick={message}>Message</button>
            </div>
          )}
        </div>

        {!editing ? (
          <div className="mt-5 space-y-4 text-sm">
            <div>
              <div className="text-gray-500 font-medium mb-1">About</div>
              <p className="text-gray-700">{profile.about || "—"}</p>
            </div>

            {impact && (impact.workshopsHosted > 0 || impact.mentorshipAnswered > 0 || impact.jobsShared > 0 || impact.postsCount > 0) && (
              <div className="bg-paper-dim rounded-lg p-3 grid grid-cols-4 gap-2 text-center">
                <div><div className="font-serif text-lg text-ink-800">{impact.workshopsHosted}</div><div className="text-[10px] text-gray-500">Workshops hosted</div></div>
                <div><div className="font-serif text-lg text-ink-800">{impact.mentorshipAnswered}</div><div className="text-[10px] text-gray-500">Mentored</div></div>
                <div><div className="font-serif text-lg text-ink-800">{impact.jobsShared}</div><div className="text-[10px] text-gray-500">Jobs shared</div></div>
                <div><div className="font-serif text-lg text-ink-800">{impact.connectionsCount}</div><div className="text-[10px] text-gray-500">Connections</div></div>
              </div>
            )}

            {isStudent ? (
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-gray-500">Student ID:</span> {profile.studentId || "—"}</div>
                <div><span className="text-gray-500">Batch:</span> {profile.batch || "—"}</div>
                <div><span className="text-gray-500">Semester:</span> {profile.semester || "—"}</div>
              </div>
            ) : profile.role === "alumni" ? (
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-gray-500">Graduation Year:</span> {profile.graduationYear || "—"}</div>
                <div><span className="text-gray-500">Current Company:</span> {profile.currentCompany || "—"}</div>
                <div><span className="text-gray-500">Current Position:</span> {profile.currentPosition || "—"}</div>
                <div><span className="text-gray-500">Industry:</span> {profile.industry || "—"}</div>
              </div>
            ) : null}

            <SkillsWithEndorsements skills={profile.skills} endorsements={profile.endorsements} isOwn={isOwn} currentUserId={user?._id} onEndorse={endorseSkill} />
            {isStudent ? (
              <>
                <TagList label="Interests" items={profile.interests} />
                <TagList label="Projects" items={profile.projects} />
              </>
            ) : profile.role === "alumni" ? (
              <TagList label="Experience" items={profile.experience} />
            ) : null}
            <TagList label="Achievements" items={profile.achievements} />
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Name</label>
              <input className="input mt-1" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Department</label>
              <input className="input mt-1" value={form.department || ""} onChange={(e) => set("department", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">About</label>
              <textarea className="input mt-1" rows={3} value={form.about || ""} onChange={(e) => set("about", e.target.value)} />
            </div>

            {isStudent ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Student ID</label>
                  <input className="input mt-1" value={form.studentId || ""} onChange={(e) => set("studentId", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Batch</label>
                  <input className="input mt-1" value={form.batch || ""} onChange={(e) => set("batch", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Semester</label>
                  <input className="input mt-1" value={form.semester || ""} onChange={(e) => set("semester", e.target.value)} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Graduation Year</label>
                  <input className="input mt-1" value={form.graduationYear || ""} onChange={(e) => set("graduationYear", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Current Company</label>
                  <input className="input mt-1" value={form.currentCompany || ""} onChange={(e) => set("currentCompany", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Current Position</label>
                  <input className="input mt-1" value={form.currentPosition || ""} onChange={(e) => set("currentPosition", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Industry</label>
                  <input className="input mt-1" value={form.industry || ""} onChange={(e) => set("industry", e.target.value)} />
                </div>
              </div>
            )}

            <ListEditor label="Skills" items={form.skills} onChange={(v) => set("skills", v)} />
            {isStudent ? (
              <>
                <ListEditor label="Interests" items={form.interests} onChange={(v) => set("interests", v)} />
                <ListEditor label="Projects" items={form.projects} onChange={(v) => set("projects", v)} />
              </>
            ) : (
              <ListEditor label="Experience" items={form.experience} onChange={(v) => set("experience", v)} />
            )}
            <ListEditor label="Achievements" items={form.achievements} onChange={(v) => set("achievements", v)} />

            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function SkillsWithEndorsements({ skills, endorsements, isOwn, currentUserId, onEndorse }) {
  if (!skills || skills.length === 0) return null;
  return (
    <div>
      <div className="text-gray-500 font-medium mb-1.5">Skills</div>
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill) => {
          const skillEndorsements = (endorsements || []).filter((e) => e.skill === skill);
          const iEndorsed = skillEndorsements.some((e) => String(e.endorsedBy?._id || e.endorsedBy) === String(currentUserId));
          const names = skillEndorsements.map((e) => e.endorsedBy?.name).filter(Boolean).join(", ");
          return (
            <button
              key={skill}
              type="button"
              disabled={isOwn}
              onClick={() => onEndorse(skill)}
              title={names}
              className={`badge border flex items-center gap-1 transition-colors ${
                iEndorsed ? "bg-brass-50 border-brass-300 text-brass-700" : "bg-gray-100 border-transparent text-gray-600"
              } ${isOwn ? "cursor-default" : "hover:border-brass-300 cursor-pointer"}`}
            >
              {skill}
              {skillEndorsements.length > 0 && <span className="text-[10px] font-semibold">{skillEndorsements.length}</span>}
            </button>
          );
        })}
      </div>
      {!isOwn && <p className="text-[11px] text-gray-400 mt-1.5">Click a skill to endorse it.</p>}
    </div>
  );
}

function TagList({ label, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <div className="text-gray-500 font-medium mb-1">{label}</div>
      <div className="flex flex-wrap gap-1">
        {items.map((item, i) => (
          <span key={i} className="badge bg-gray-100 text-gray-600">{item}</span>
        ))}
      </div>
    </div>
  );
}
