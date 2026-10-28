"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "../../components/AppShell";
import PostCard from "../../components/PostCard";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { getSocket } from "../../lib/socket";
import OnboardingChecklist from "../../components/OnboardingChecklist";
import ImageAttach from "../../components/ImageAttach";
import { useT } from "../../lib/i18n";

const CATEGORIES = [
  "Discussion", "Question", "Achievement", "Career", "Research",
  "Internship", "Job Opportunity", "Project", "Announcement", "General",
];

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useT();
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Discussion");
  const [filter, setFilter] = useState("");
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newCount, setNewCount] = useState(0); // posts that arrived live while... nothing to hide behind, but kept for a subtle "Live" pulse
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tag, setTag] = useState("");          // #hashtag filter
  const [search, setSearch] = useState("");    // ?q= text filter (from global search)
  const [view, setView] = useState("all");     // "all" | "saved"
  const [images, setImages] = useState([]);    // uploaded image URLs for the post being written
  const [trending, setTrending] = useState([]);

  // Read ?tag= / ?q= once on load (avoids useSearchParams' Suspense requirement).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tag")) setTag(params.get("tag"));
    if (params.get("q")) setSearch(params.get("q"));
  }, []);

  function buildQuery(pageNo) {
    const p = new URLSearchParams({ page: String(pageNo) });
    if (filter) p.set("category", filter);
    if (tag) p.set("tag", tag);
    if (search) p.set("q", search);
    return p.toString();
  }

  async function load() {
    setLoading(true);
    try {
      if (view === "saved") {
        const { posts } = await api("/posts/saved");
        setPosts(posts);
        setHasMore(false);
        setPage(1);
      } else {
        const { posts, hasMore } = await api(`/posts?${buildQuery(1)}`);
        setPosts(posts);
        setPage(1);
        setHasMore(hasMore);
      }
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { posts: more, hasMore: hm } = await api(`/posts?${buildQuery(nextPage)}`);
      setPosts((ps) => [...ps, ...more.filter((m) => !ps.some((p) => p._id === m._id))]);
      setPage(nextPage);
      setHasMore(hm);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    if (authLoading || !user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, tag, search, view, authLoading, user]);

  useEffect(() => {
    if (authLoading || !user) return;
    api("/posts/tags/trending").then((d) => setTrending(d.tags)).catch(() => {});
  }, [authLoading, user]);

  // Real-time feed: every logged-in tab sits in the shared "feed" room, so
  // new posts, reactions, comments, and deletions from ANYONE appear here
  // instantly, no refresh needed.
  useEffect(() => {
    if (authLoading || !user) return;
    const socket = getSocket();

    function onNewPost(post) {
      if (view === "saved" || search) return; // those views don't take live inserts
      if (filter && post.category !== filter) return;
      if (tag && !post.hashtags?.includes(tag)) return;
      setPosts((ps) => (ps.some((p) => p._id === post._id) ? ps : [post, ...ps]));
      setNewCount((n) => n + 1);
      setTimeout(() => setNewCount((n) => Math.max(0, n - 1)), 1500);
    }
    function onUpdated({ postId, content, category }) {
      setPosts((ps) => ps.map((p) => (p._id === postId ? { ...p, content, category } : p)));
    }
    function onDeleted({ postId }) {
      setPosts((ps) => ps.filter((p) => p._id !== postId));
    }
    function onReaction({ postId, reactions }) {
      setPosts((ps) => ps.map((p) => (p._id === postId ? { ...p, reactions } : p)));
    }

    socket.on("post:new", onNewPost);
    socket.on("post:updated", onUpdated);
    socket.on("post:deleted", onDeleted);
    socket.on("post:reaction", onReaction);
    return () => {
      socket.off("post:new", onNewPost);
      socket.off("post:updated", onUpdated);
      socket.off("post:deleted", onDeleted);
      socket.off("post:reaction", onReaction);
    };
  }, [authLoading, user, filter, tag, search, view]);

  function updateReactions(postId, reactions) {
    setPosts((ps) => ps.map((p) => (p._id === postId ? { ...p, reactions } : p)));
  }
  function removePost(postId) {
    setPosts((ps) => ps.filter((p) => p._id !== postId));
  }

  async function submitPost(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    try {
      const { post } = await api("/posts", { method: "POST", body: { content, category, images } });
      setContent("");
      setImages([]);
      // Show it immediately for the poster — the live "post:new" broadcast
      // will also arrive a moment later but is deduped by _id above.
      if ((!filter || post.category === filter) && !tag && view === "all" && !search) {
        setPosts((ps) => (ps.some((p) => p._id === post._id) ? ps : [post, ...ps]));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setPosting(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-ink-800">{t("feed.title")}</h1>
          <p className="text-sm text-gray-500 mt-1">What's happening across your university community.</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className={`w-1.5 h-1.5 rounded-full ${newCount > 0 ? "bg-brass-500 animate-pulse" : "bg-gray-300"}`} />
          Live
        </span>
      </div>

      <OnboardingChecklist />

      {user?.role === "alumni" && (
        <div className="card p-4 mb-6 flex items-center justify-between gap-3 bg-ink-800 text-paper border-none">
          <div className="text-sm">Got something to teach? Host a workshop for current students.</div>
          <Link href="/workshops/create" className="btn-primary text-xs shrink-0">+ Create Workshop</Link>
        </div>
      )}
      {user?.role === "student" && (
        <div className="card p-4 mb-6 flex items-center justify-between gap-3 border-brass-300">
          <div className="text-sm text-ink-700">Looking for direction? Ask an alumnus for mentorship.</div>
          <Link href="/mentorship" className="btn-secondary text-xs shrink-0">Find a mentor</Link>
        </div>
      )}

      {error && <div className="card p-4 text-sm text-crimson-500 mb-4">{error}</div>}

      <form onSubmit={submitPost} className="card-feature p-5 mb-8">
        <div className="text-sm font-medium text-ink-700 mb-2">{t("feed.share")}</div>
        <textarea
          className="input"
          rows={3}
          placeholder="What's happening in your university community? Use #hashtags to reach the right people."
          maxLength={5000}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {images.map((src) => (
              <div key={src} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="To be attached" className="w-20 h-20 object-cover rounded-md border border-gray-200" />
                <button type="button" aria-label="Remove image" onClick={() => setImages((im) => im.filter((x) => x !== src))}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-ink-800 text-paper text-xs leading-none">×</button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-2 mt-3 flex-wrap">
          <div className="flex items-center gap-2">
          <select className="input w-48" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {images.length < 4 && <ImageAttach onUploaded={(url) => setImages((im) => (im.length < 4 ? [...im, url] : im))} />}
          </div>
          <button className="btn-primary" disabled={posting} type="submit">
            {posting ? "Posting…" : t("feed.post")}
          </button>
        </div>
      </form>

      <div className="flex items-center gap-2 mb-3">
        <button className={`badge border ${view === "all" ? "bg-ink-800 text-paper border-ink-800" : "bg-transparent text-gray-600 border-gray-300"}`} onClick={() => setView("all")}>{t("feed.all")}</button>
        <button className={`badge border ${view === "saved" ? "bg-ink-800 text-paper border-ink-800" : "bg-transparent text-gray-600 border-gray-300"}`} onClick={() => setView("saved")}>★ {t("feed.saved")}</button>
        {(tag || search) && (
          <button className="badge border border-brass-300 text-brass-600" onClick={() => { setTag(""); setSearch(""); window.history.replaceState(null, "", "/feed"); }}>
            {tag ? `#${tag}` : `“${search}”`} ×
          </button>
        )}
      </div>

      {trending.length > 0 && view === "all" && !tag && (
        <div className="flex flex-wrap items-center gap-1.5 mb-4 text-xs text-gray-500">
          <span className="section-label mr-1">{t("feed.trending")}</span>
          {trending.map((x) => (
            <button key={x.tag} className="text-brass-600 hover:underline" onClick={() => { setTag(x.tag); setView("all"); }}>#{x.tag} <span className="text-gray-400">{x.count}</span></button>
          ))}
        </div>
      )}

      <div className={`flex gap-2 mb-5 overflow-x-auto pb-1 ${view === "saved" ? "hidden" : ""}`}>
        <button className={`badge border ${filter === "" ? "bg-ink-800 text-paper border-ink-800" : "bg-transparent text-gray-600 border-gray-300"}`} onClick={() => setFilter("")}>
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={`badge border whitespace-nowrap ${filter === c ? "bg-ink-800 text-paper border-ink-800" : "bg-transparent text-gray-600 border-gray-300"}`}
            onClick={() => setFilter(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {loading && <div className="text-gray-400 text-sm">Loading posts…</div>}
      <div className="space-y-4">
        {posts.map((p) => (
          <PostCard
            key={p._id}
            post={p}
            onReact={updateReactions}
            onDeleted={removePost}
            onTag={(t2) => { setTag(t2); setView("all"); }}
            onSaveChange={(id, saved) => { if (view === "saved" && !saved) removePost(id); }}
          />
        ))}
        {!loading && posts.length === 0 && (
          <div className="card p-8 text-center text-gray-400 text-sm">{view === "saved" ? "You haven't saved any posts yet." : tag || search ? "No posts match this filter." : "Nothing posted yet — be the first to share something."}</div>
        )}
      </div>
      {hasMore && !loading && (
        <div className="text-center mt-5">
          <button className="btn-secondary text-sm" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? t("common.loading") : t("common.loadMore")}
          </button>
        </div>
      )}
    </AppShell>
  );
}
