"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "../../components/AppShell";
import Avatar from "../../components/Avatar";
import VerifiedBadge from "../../components/VerifiedBadge";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { useT } from "../../lib/i18n";

function Section({ title, count, children }) {
  if (!count) return null;
  return (
    <section className="mb-7">
      <h2 className="section-label mb-2">{title} <span className="text-gray-400 normal-case font-normal">({count})</span></h2>
      <div className="card divide-y">{children}</div>
    </section>
  );
}

const Row = ({ href, children }) => (
  <Link href={href} className="block p-3 hover:bg-paper-dim transition-colors text-sm">{children}</Link>
);

export default function SearchPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useT();
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Read ?q= on first load (avoids useSearchParams' Suspense requirement).
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("q") || "";
    setQ(initial);
    setSubmitted(initial);
  }, []);

  useEffect(() => {
    if (authLoading || !user || submitted.trim().length < 2) { setResults(null); return; }
    let active = true;
    setLoading(true);
    api(`/search?q=${encodeURIComponent(submitted.trim())}`)
      .then((d) => { if (active) { setResults(d); setError(""); } })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [submitted, authLoading, user]);

  function onSubmit(e) {
    e.preventDefault();
    setSubmitted(q);
    window.history.replaceState(null, "", `/search?q=${encodeURIComponent(q)}`);
  }

  const total = results ? ["users", "posts", "jobs", "events", "projects", "workshops"].reduce((n, k) => n + results[k].length, 0) : 0;

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-ink-800">{t("search.title")}</h1>
        <p className="text-sm text-gray-500 mt-1">People, posts, jobs, events, projects and workshops — all in one place.</p>
      </div>

      <form onSubmit={onSubmit} className="flex gap-2 mb-6" role="search">
        <input className="input" autoFocus placeholder={t("search.placeholder")} value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-primary" type="submit">{t("search.title")}</button>
      </form>

      {error && <div className="card p-4 text-sm text-crimson-500 mb-4">{error}</div>}
      {loading && <div className="text-gray-400 text-sm">{t("common.loading")}</div>}
      {!loading && submitted.trim().length > 0 && submitted.trim().length < 2 && <div className="text-gray-400 text-sm">Type at least 2 characters.</div>}
      {!loading && results && total === 0 && <div className="card p-8 text-center text-gray-400 text-sm">No results for “{results.q}”.</div>}

      {results && (
        <>
          <Section title="People" count={results.users.length}>
            {results.users.map((u) => (
              <Link key={u._id} href={`/profile/${u._id}`} className="flex items-center gap-3 p-3 hover:bg-paper-dim transition-colors">
                <Avatar name={u.name} avatarUrl={u.avatarUrl} className="w-9 h-9 text-xs" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-ink-800 truncate">{u.name} <VerifiedBadge show={u.verified} /></div>
                  <div className="text-xs text-gray-500 capitalize truncate">
                    {u.role}{u.department ? ` · ${u.department}` : ""}{u.currentPosition ? ` · ${u.currentPosition} at ${u.currentCompany}` : ""}
                  </div>
                </div>
              </Link>
            ))}
          </Section>

          <Section title="Posts" count={results.posts.length}>
            {results.posts.map((p) => (
              <Row key={p._id} href={`/feed?q=${encodeURIComponent(results.q)}`}>
                <div className="text-xs text-gray-400">{p.author?.name} · {p.category}</div>
                <div className="text-gray-700 mt-0.5">{p.content}</div>
              </Row>
            ))}
          </Section>

          <Section title="Jobs" count={results.jobs.length}>
            {results.jobs.map((j) => (
              <Row key={j._id} href={`/jobs/${j._id}`}>
                <div className="font-medium text-ink-800">{j.title}</div>
                <div className="text-xs text-gray-500">{j.company}{j.location ? ` · ${j.location}` : ""} · {j.type}</div>
              </Row>
            ))}
          </Section>

          <Section title="Events" count={results.events.length}>
            {results.events.map((e) => (
              <Row key={e._id} href={`/events/${e._id}`}>
                <div className="font-medium text-ink-800">{e.title}</div>
                <div className="text-xs text-gray-500">{new Date(e.date).toLocaleDateString()} · {e.mode}{e.location ? ` · ${e.location}` : ""}</div>
              </Row>
            ))}
          </Section>

          <Section title="Projects" count={results.projects.length}>
            {results.projects.map((p) => (
              <Row key={p._id} href={`/projects/${p._id}`}>
                <div className="font-medium text-ink-800">{p.title}</div>
                <div className="text-xs text-gray-500 line-clamp-1">{p.description}</div>
              </Row>
            ))}
          </Section>

          <Section title="Workshops" count={results.workshops.length}>
            {results.workshops.map((w) => (
              <Row key={w._id} href={`/workshops/${w._id}`}>
                <div className="font-medium text-ink-800">{w.title}</div>
                <div className="text-xs text-gray-500">{w.category} · {new Date(w.date).toLocaleDateString()} · <span className="capitalize">{w.status}</span></div>
              </Row>
            ))}
          </Section>
        </>
      )}
    </AppShell>
  );
}
