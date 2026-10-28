# UniConnect — University Student & Alumni Community Platform

A full-stack community platform for students and alumni: profiles, connections,
private chat, a community feed, alumni-led workshops, mentorship requests, and
a full admin console — plus a **one-click demo login** so anyone can explore
every role without creating an account.

**Stack:** Next.js 14 (App Router, Tailwind) frontend · Express + MongoDB (Mongoose) backend ·
Firebase Auth for real sign-in (demo mode works without it).

---

## ⚠️ Before you do anything: rotate your credentials

Real secrets (a MongoDB password and a Firebase Admin private key) were shared in
plain text during this build. **Rotate both before deploying anywhere:**

- **MongoDB Atlas** → Database Access → change the password for the affected user,
  then update `MONGODB_URI` in `backend/.env`.
- **Firebase Console** → Project Settings → Service Accounts → generate a new
  private key, and delete/revoke the old one.

The `.env.example` files in this project contain **placeholders only** — never real
secrets — so it's safe to commit those. Your actual `.env` / `.env.local` files are
already gitignored.

---

## Project structure

```
university-community/
├── backend/           Express API + MongoDB models
│   ├── src/
│   │   ├── models/    User, Post, Connection, Message, Workshop, Registration,
│   │   │              Mentorship, Notification, Report, Activity
│   │   ├── routes/    auth, users, posts, connections, messages, workshops,
│   │   │              registrations, mentorship, notifications, reports, admin
│   │   ├── middleware/ auth.js (Firebase ID token OR demo JWT), role guards
│   │   ├── seed.js     Seeds 1 admin + 3 students + 3 alumni with sample data
│   │   └── server.js
│   └── .env.example
└── frontend/          Next.js App Router UI
    ├── app/           login, demo, feed, discover, network, workshops,
    │                  mentorship, messages, notifications, profile, admin/*
    ├── components/     AppShell (role-based nav), PostCard
    ├── lib/             api.js, firebase.js, AuthContext.js
    └── .env.local.example
```

## How auth works

Every request carries `Authorization: Bearer <token>`. The backend accepts **two**
kinds of tokens:

1. **Firebase ID tokens** — real email/password sign-in via Firebase, verified
   server-side with the Firebase Admin SDK. A Mongo profile is auto-created on
   first login (role defaults to `student`; promote via the admin panel).
2. **Demo JWTs** — issued by `POST /api/auth/demo-login` when a visitor picks a
   seeded account on the `/demo` page. No password, no Firebase — just an
   instant, disposable session so people can "feel" every role (Student,
   Alumni, Admin) immediately.

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env       # fill in your ROTATED MongoDB URI + Firebase Admin creds
npm install
npm run seed                # creates demo accounts + sample posts/workshops/etc.
npm run dev                  # http://localhost:4000
```

If you skip the Firebase Admin env vars, real Firebase login just won't work —
demo login still works fine, since it never touches Firebase.

### 2. Frontend

```bash
cd frontend
cp .env.local.example .env.local   # fill in Firebase *client* config (public-safe)
npm install
npm run dev                         # http://localhost:3000
```

Visit `http://localhost:3000` → you'll land on `/login` → click
**"Explore with a Demo Account"** → pick Admin, an Alumni, or a Student and
you're in.

## What's implemented

- **Roles & permissions**: Student / Alumni / Admin, enforced both in the API
  (`requireRole` middleware) and in the UI (nav items, create-workshop gating).
- **Profiles**: role-specific fields (student: batch/semester/projects;
  alumni: company/position/experience), self-editable.
- **Community feed**: categorized posts, comments, reactions, save, report,
  owner/admin delete.
- **Discover & connections**: search/filter members, send/accept/reject
  connection requests.
- **Private chat**: only between accepted connections; polling-based (no
  websocket infra needed to run this).
- **Workshops**: alumni/admin create & manage; anyone registers (with seat
  limits + deadlines); host/admin can view registrant lists.
- **Mentorship**: students request guidance from alumni; alumni accept/reject
  and reply in a thread.
- **Notifications**: connection requests/accepts, messages, reactions,
  comments, workshop & mentorship updates.
- **Admin console**: dashboard with platform stats + recent activity, full
  user CRUD (add/edit/delete/activate/deactivate/search/filter), post &
  workshop moderation, a reports queue, and a global activity log.

## What's intentionally simplified

- Chat uses polling (4s interval) instead of websockets — swap in Socket.IO
  or Pusher if you need true real-time.
- No file/image uploads (the spec explicitly skipped profile photos).
- Demo accounts don't expire tokens beyond the JWT's 7-day window; treat them
  as throwaway sandboxes, not real user accounts.

---

## Upgrade notes

**Security** — env validation at startup (weak/missing secrets stop production boot); demo login is OFF by default in production (`DEMO_MODE_ENABLED`); zod validation on write routes; `express-mongo-sanitize`; ObjectId param checks; regex-escaped searches; per-user rate limits for chat/uploads/search; disabled-account bug in token auth fixed.

**Performance** — database indexes on all hot queries; cursor-paginated chat history; paginated member directory; gzip compression; structured logging (pino).

**Features** — global search (`/search`), image uploads (Cloudinary), email + web-push notifications, event reminders & `.ics` export, hashtags / trending / saved posts, alumni directory filters, verified badge (university email domains), dark mode, English/বাংলা, installable PWA.

**Admin** — report actions (warn / hide / disable), analytics charts, CSV exports, audit log with IP.

**Dev** — `npm test` and `npm run lint` in both apps, Dockerfiles + `docker-compose.yml`, GitHub Actions CI.

All third-party integrations (Cloudinary, SMTP, VAPID push) are optional; see `backend/.env.example`.
Before deploying: **rotate the MongoDB password and Firebase private key**, because the original `.env` files were shared in a zip.
