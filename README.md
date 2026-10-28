# UniConnect — University Student & Alumni Community Platform

UniConnect is a full-stack community platform that connects **students** and **alumni** of a university. Members build profiles, network, chat in real time, share posts, join workshops and events, find jobs and referrals, ask alumni for mentorship, book office hours, and showcase projects. Administrators get a full moderation and analytics console.

A one-click **demo mode** lets anyone explore every role (Student, Alumni, Admin) without creating an account.

> **Stack:** Next.js 14 (App Router, Tailwind CSS) · Express 4 · MongoDB (Mongoose) · Socket.IO · Firebase Authentication · optional Redis, Cloudinary, SMTP and Web Push.

---

## Table of contents

1. [Security notice — read first](#1-security-notice--read-first)
2. [Feature overview](#2-feature-overview)
3. [Architecture](#3-architecture)
4. [Project structure](#4-project-structure)
5. [Quick start (local)](#5-quick-start-local)
6. [Run with Docker](#6-run-with-docker)
7. [Configuration reference](#7-configuration-reference)
8. [Setting up the external services](#8-setting-up-the-external-services)
9. [Roles and permissions](#9-roles-and-permissions)
10. [Authentication in detail](#10-authentication-in-detail)
11. [Feature guide](#11-feature-guide)
12. [API reference](#12-api-reference)
13. [Real-time events (Socket.IO)](#13-real-time-events-socketio)
14. [Data models](#14-data-models)
15. [Security measures](#15-security-measures)
16. [Rate limits](#16-rate-limits)
17. [Testing, linting and CI](#17-testing-linting-and-ci)
18. [Deployment guide](#18-deployment-guide)
19. [Scaling](#19-scaling)
20. [Troubleshooting](#20-troubleshooting)
21. [Known limitations and roadmap](#21-known-limitations-and-roadmap)

---

## 1. Security notice — read first

Real secrets (a MongoDB password and a Firebase Admin private key) were shared in plain text while this project was being built. **Rotate both before deploying anywhere:**

- **MongoDB Atlas** → *Database Access* → edit the user → set a new password → update `MONGODB_URI` in `backend/.env`.
- **Firebase Console** → *Project settings* → *Service accounts* → *Generate new private key*, then delete the old key.

Rules to keep the project safe:

- `.env` and `.env.local` are git-ignored. **Never commit them or share them in a zip.** Only the `*.example` files (placeholders) belong in version control.
- **Demo mode is a login bypass.** It is *on* by default in development and *off* by default in production. Leave it off for a real launch (see [Demo mode](#demo-mode)).
- Generate a strong `DEMO_JWT_SECRET` (the server refuses to start in production with a weak one):
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```

---

## 2. Feature overview

| Area | What you get |
|---|---|
| **Profiles** | Role-specific fields (student: batch, semester, interests, projects · alumni: company, position, industry, experience), skills with endorsements, avatar upload, city/country, **verified badge**, impact score & tier |
| **Community feed** | Categorised posts, **hashtags & trending tags**, **photo attachments** (up to 4), reactions, threaded comments, **saved posts**, report, live updates, text filter |
| **Discover** | Search members by name/department/skill/company; **filters** for department, graduation year, industry, company, location, verified-only; paginated |
| **Global search** | One box searching people, posts, jobs, events, projects and workshops |
| **Network** | Send/accept/reject connection requests; remove connections |
| **Chat** | Real-time 1-to-1 chat between connected members: typing indicator, read receipts ("Seen"), online presence, **photo sharing**, **paginated history** |
| **Workshops** | Alumni/admin create workshops (seat limit, deadline, online/offline); anyone registers; hosts see registrant lists |
| **Events** | Reunions/meetups with RSVP and capacity, **add-to-calendar (.ics)**, **automatic 24-hour reminders** |
| **Jobs** | Job board with filters, save jobs, **referral requests** to alumni at the company |
| **Mentorship** | Students request guidance from alumni; alumni accept/reject and reply in a thread |
| **Office hours** | Alumni publish bookable slots; students book/cancel |
| **Projects** | Project showcase with tech stack, links and stars |
| **Tools** | CGPA calculator, résumé builder (PDF), cover-page generator (PDF/DOCX) |
| **Notifications** | In-app (live), **email**, and **web push** (all optional); per-user email opt-out |
| **Admin console** | Dashboard stats, **analytics charts**, user CRUD, content moderation, **report actions** (warn / hide / disable), **CSV exports**, **audit log** with IP |
| **Platform** | **Dark mode**, **English / বাংলা**, installable **PWA** with offline page, responsive layout |
| **Dev experience** | Unit + API tests, ESLint/Prettier, Dockerfiles, docker-compose, GitHub Actions CI |

---

## 3. Architecture

```
                       ┌────────────────────────────────────────────┐
   Browser / PWA       │  Next.js 14 frontend  (port 3000)           │
   ───────────────►    │  App Router · Tailwind · Socket.IO client   │
        │              └───────────────┬────────────────────────────┘
        │  Firebase Auth (sign-in)     │ REST  /api/*   +   WebSocket
        ▼                              ▼
 ┌──────────────┐        ┌──────────────────────────────────────────┐
 │ Firebase Auth│◄───────┤  Express API + Socket.IO  (port 4000)     │
 │ (ID tokens)  │ verify │  helmet · cors · rate limits · zod        │
 └──────────────┘        │  routes → models → MongoDB                 │
                         └──┬────────┬──────────┬──────────┬─────────┘
                            │        │          │          │
                     ┌──────▼──┐ ┌───▼────┐ ┌───▼─────┐ ┌──▼──────────┐
                     │ MongoDB │ │ Redis  │ │Cloudinary│ │ SMTP / Web  │
                     │ (data)  │ │(opt.)  │ │ (opt.)   │ │ Push (opt.) │
                     └─────────┘ └────────┘ └──────────┘ └─────────────┘
```

- **REST** handles all data; **Socket.IO** pushes live updates (feed, chat, notifications, presence).
- **Every request and every socket handshake** carries the same bearer token and goes through the same `authenticateToken()` function, so REST and WebSocket access can never drift apart.
- **Optional services degrade gracefully.** Without Redis the app uses in-memory sockets; without Cloudinary the "Photo" buttons are hidden; without SMTP no emails are sent; without VAPID keys the push toggle is hidden. Nothing crashes.
- `backend/src/app.js` builds the Express app (no side effects, so tests import it directly); `server.js` connects the database, starts Socket.IO, the reminder job, and listens.

---

## 4. Project structure

```
university-community/
├── README.md
├── docker-compose.yml            api + web + mongo + redis
├── .github/workflows/ci.yml      lint + test (+ build) on every push / PR
├── backend/
│   ├── Dockerfile
│   ├── .env.example              every backend variable, documented
│   ├── .eslintrc.json  .prettierrc.json
│   ├── test/                     node:test + supertest (no database needed)
│   └── src/
│       ├── server.js             startup, graceful shutdown
│       ├── app.js                Express app (middleware + route mounting + error handler)
│       ├── socket.js             Socket.IO auth, rooms, presence, typing, Redis adapter
│       ├── seed.js               demo data (1 admin, 3 students, 3 alumni + content)
│       ├── config/               db.js · firebase.js · env.js (validation, demo flag)
│       ├── middleware/           auth.js · rateLimiters.js · validate.js
│       ├── validators/           zod schemas for request bodies
│       ├── models/               Mongoose models (+ indexes)
│       ├── routes/               one file per API area
│       ├── utils/                notify · mailer · push · cloud · moderation · logger · activityLogger
│       └── jobs/                 eventReminders.js
└── frontend/
    ├── Dockerfile
    ├── .env.local.example
    ├── next.config.js            standalone output + security headers
    ├── tailwind.config.js        brand palette (ink / paper / brass / crimson)
    ├── public/                   logo, PWA icons, sw.js, offline.html
    ├── test/                     ics + i18n unit tests
    ├── lib/                      api.js · AuthContext.js · socket.js · i18n.js · translations.js · ics.js · firebase.js · usePresence.js · grading.js · coverPdf.js
    ├── components/               AppShell · PostCard · Avatar · ImageAttach · MiniChart · ThemeToggle · PushToggle · VerifiedBadge · PwaSetup …
    └── app/                      pages (see below)
```

**Frontend pages** (`frontend/app/`):

| Route | Purpose |
|---|---|
| `/login`, `/demo` | Sign in / sign up, demo account picker |
| `/feed` | Community feed |
| `/discover`, `/network`, `/profile/[id]` | People, connections, profiles |
| `/search` | Global search |
| `/messages`, `/messages/[id]` | Conversations and chat |
| `/workshops` (+ `create`, `[id]`, `[id]/edit`) | Workshops |
| `/events` (+ `create`, `[id]`) | Events |
| `/jobs` (+ `create`, `[id]`, `[id]/edit`) | Job board and referrals |
| `/mentorship`, `/office-hours`, `/projects` (+ `create`, `[id]`) | Mentoring and showcase |
| `/tools`, `/tools/cgpa`, `/tools/resume`, `/tools/coverpage` | Student tools |
| `/notifications` | Notification centre + push toggle |
| `/admin`, `/admin/users`, `/admin/users/[id]`, `/admin/posts`, `/admin/workshops`, `/admin/jobs`, `/admin/events`, `/admin/projects`, `/admin/office-hours`, `/admin/reports`, `/admin/activity` | Admin console |

---

## 5. Quick start (local)

### Prerequisites

- **Node.js 20 or newer** (22 recommended) and npm
- A **MongoDB** database — a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster, or a local `mongod`
- *(Optional)* a Firebase project if you want real email/password accounts. Demo mode works without it.

### 1) Backend

```bash
cd backend
cp .env.example .env        # then edit .env — at minimum MONGODB_URI and DEMO_JWT_SECRET
npm install
npm run seed                # creates demo accounts + sample content
npm run dev                 # API + WebSocket on http://localhost:4000
```

Check it is alive: open <http://localhost:4000/api/health> → `{"ok":true,...}`.

### 2) Frontend

```bash
cd frontend
cp .env.local.example .env.local   # Firebase *client* keys + NEXT_PUBLIC_API_BASE_URL
npm install
npm run dev                         # http://localhost:3000
```

### 3) Log in

Open <http://localhost:3000> → **Explore with a demo account** → pick Admin, an Alumni, or a Student. No password or Firebase needed.

### Demo mode

| Setting | Behaviour |
|---|---|
| `NODE_ENV=development` (default) | Demo login **on** |
| `NODE_ENV=production` | Demo login **off** unless you set `DEMO_MODE_ENABLED=true` |
| `DEMO_MODE_ENABLED=false` | Forces it off: `/api/auth/demo-accounts` and `/demo-login` return 404, existing demo tokens stop working, and the login page hides the demo button |

Seeded accounts (all `@demo.university.edu`): `admin`, `rahim`, `sadia`, `tanvir` (students), `karim`, `nadia`, `john` (alumni), plus extra generated members. They are marked `isDemo` and never receive emails.

### Useful scripts

| Where | Command | What it does |
|---|---|---|
| backend | `npm run dev` | API with auto-reload (nodemon) |
| backend | `npm start` | Production start |
| backend | `npm run seed` | Wipe & re-seed demo data ⚠ development only |
| backend | `npm test` | Unit + API tests |
| backend | `npm run lint` / `npm run format` | ESLint / Prettier |
| frontend | `npm run dev` | Next.js dev server |
| frontend | `npm run build` / `npm start` | Production build / serve |
| frontend | `npm run lint` / `npm test` | ESLint / unit tests |

---

## 6. Run with Docker

```bash
cp backend/.env.example backend/.env       # fill in values (Firebase optional)
docker compose up --build
```

- Web: <http://localhost:3000> · API: <http://localhost:4000/api/health>
- The compose file starts **mongo**, **redis**, **api** and **web**, and overrides `MONGODB_URI` / `REDIS_URL` to point at the containers.
- `NEXT_PUBLIC_*` values are baked into the frontend image **at build time**. To change the API URL, rebuild: `NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api docker compose build web`.
- Seed demo data: `docker compose exec api node src/seed.js`.

---

## 7. Configuration reference

### Backend — `backend/.env`

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | no | `4000` | HTTP/WebSocket port |
| `NODE_ENV` | no | `development` | `production` enables strict checks |
| `CLIENT_ORIGIN` | **prod** | `http://localhost:3000` | Exact frontend origin allowed by CORS and Socket.IO |
| `MONGODB_URI` | **yes** | – | MongoDB connection string |
| `MONGODB_DB` | no | `university_community` | Database name |
| `DEMO_JWT_SECRET` | **yes** | – | Signs demo sessions. ≥ 32 random chars (enforced in production) |
| `DEMO_MODE_ENABLED` | no | on in dev, **off in prod** | Passwordless demo login |
| `SEED_DEMO_PASSWORD` | no | `Demo@12345` | Hash stored on demo accounts by the seed script |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | for real login | – | Firebase Admin credentials (private key with `\n` escaped) |
| `UNIVERSITY_EMAIL_DOMAINS` | no | – | Comma list (`uni.edu,students.uni.edu`); matching signups get the verified badge |
| `BLOCKED_WORDS` | no | – | Comma list rejected in posts/comments/chat |
| `LOG_LEVEL` | no | `info` (`debug` in dev) | `debug` · `info` · `warn` · `error` |
| `RUN_JOBS` | no | `true` | Set `false` on all but one instance to avoid duplicate reminders |
| `REDIS_URL` | no | – | Enables the Socket.IO Redis adapter (multi-instance) |
| `CLOUDINARY_URL` **or** `CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET` | no | – | Enables image uploads |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `MAIL_FROM` | no | – | Enables email notifications |
| `VAPID_PUBLIC_KEY` `VAPID_PRIVATE_KEY` `VAPID_SUBJECT` | no | – | Enables web push |

At startup the server validates this configuration. **Errors stop the boot** (missing `MONGODB_URI`/`DEMO_JWT_SECRET`; in production also weak secret or missing `CLIENT_ORIGIN`); **warnings** are logged (incomplete Firebase config, demo mode on in production).

### Frontend — `frontend/.env.local`

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | API root including `/api`, e.g. `http://localhost:4000/api`. The WebSocket URL is derived from it automatically |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `…_AUTH_DOMAIN`, `…_PROJECT_ID`, `…_STORAGE_BUCKET`, `…_MESSAGING_SENDER_ID`, `…_APP_ID`, `…_MEASUREMENT_ID` | Firebase **web** config (public by design). Optional if you only use demo mode |

---

## 8. Setting up the external services

### MongoDB Atlas (required)
1. Create a free cluster → *Database Access*: add a user → *Network Access*: allow your IP (or `0.0.0.0/0` for hosting platforms).
2. *Connect → Drivers* → copy the URI into `MONGODB_URI`.
3. Indexes are created automatically by Mongoose on first start (allow a minute on large data).

### Firebase Authentication (for real accounts)
1. Create a project → *Authentication → Sign-in method* → enable **Email/Password**.
2. *Project settings → General → Your apps* → add a **Web app** → copy the config into `frontend/.env.local`.
3. *Project settings → Service accounts → Generate new private key* → put `project_id`, `client_email`, `private_key` into the three `FIREBASE_*` backend variables (keep the `\n` escapes inside quotes).
4. *Authentication → Settings → Authorized domains*: add your production frontend domain.

### Cloudinary (image uploads)
Create a free account → *Dashboard* → copy the **API environment variable** into `CLOUDINARY_URL`. Uploads are limited to JPG/PNG/WebP/GIF, 5 MB, and resized to at most 1600 px.

### Email (SMTP)
Any provider works (Brevo, Resend SMTP, Amazon SES, Gmail app password…). Set the five `SMTP_*`/`MAIL_FROM` values. Emails are sent only for: connection requests/acceptances, mentorship and referral updates, office-hour bookings/cancellations, workshop updates, event reminders, report outcomes and admin notices — **not** for chat messages, reactions or comments. Users can opt out in *Profile → Edit*.

### Web push
```bash
npx web-push generate-vapid-keys
```
Put the keys in `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` and set `VAPID_SUBJECT=mailto:you@yourdomain.com`. Push needs **HTTPS** and a **production build** (the service worker is only registered in production). Users enable it from the *Notifications* page.

### Redis (optional)
Only needed when running more than one API instance. Set `REDIS_URL`; if Redis is unreachable the server logs it and falls back to in-memory sockets.

---

## 9. Roles and permissions

| Capability | Student | Alumni | Admin |
|---|:--:|:--:|:--:|
| Edit own profile, post, comment, react, save | ✅ | ✅ | ✅ |
| Discover members, send connection requests | ✅ | ✅ | ❌ (admins aren't in the networking graph) |
| Chat | with accepted connections | with accepted connections | ❌ |
| Register for workshops, RSVP to events | ✅ | ✅ | ✅ |
| Create workshops / office-hour slots | ❌ | ✅ | ✅ |
| Create events, jobs, projects | ✅ | ✅ | ✅ |
| Request mentorship | ✅ | ❌ | ❌ |
| Answer mentorship requests | ❌ | ✅ (own) | view |
| Request / grant job referrals | request | grant (own postings) | – |
| Edit/delete own content | ✅ | ✅ | ✅ |
| Hide/delete **anyone's** content, manage users, reports, exports | ❌ | ❌ | ✅ |

Safeguards: the last admin cannot be deleted, demoted or disabled; admins cannot disable or delete themselves; registration can never create an admin (the `role` field only accepts `student` or `alumni`).

---

## 10. Authentication in detail

Every API request sends `Authorization: Bearer <token>`. Two token types are accepted:

1. **Firebase ID token** — real email/password sign-in. Verified server-side with the Firebase Admin SDK. `POST /api/auth/register` creates the Mongo profile (role chosen at signup: student or alumni); an unregistered Firebase user is auto-provisioned as a **student** on first request. Tokens expire hourly; the frontend refreshes them in the background and retries once on a 401.
2. **Demo JWT** — issued by `POST /api/auth/demo-login` for seeded accounts, valid 7 days, signed with `DEMO_JWT_SECRET`. Rejected whenever demo mode is off or the account is disabled.

The same check authenticates **Socket.IO** connections (`auth.token` in the handshake). Disabled accounts (`status: "disabled"`) are rejected on both channels.

---

## 11. Feature guide

**Feed & posts** — Posts have a category, up to 5000 characters, up to 4 images and auto-extracted `#hashtags`. Click a hashtag to filter; "Trending tags" shows the most used in the last 30 days. *Save* bookmarks a post (view with the ★ Saved tab). The feed updates live for everyone. Posts go through a moderation filter (blocked words, link floods, character spam, all-caps shouting).

**Chat** — Start a conversation from a connection. Messages are delivered over WebSockets, history loads 30 at a time ("Load earlier messages"), opening a thread marks it read, and the sender sees "Seen". Image attachments require Cloudinary.

**Directory (Discover)** — Full-text search plus filters; results are paginated (24 per page). Admin accounts and disabled users never appear.

**Verified badge** — Granted automatically when the signup email's domain matches `UNIVERSITY_EMAIL_DOMAINS`, or manually by an admin on *Admin → Users → edit*.

**Events** — RSVP with capacity limits; hosts and attendees receive a reminder notification (and email/push if enabled) within 24 hours of the start. *Add to calendar* downloads an `.ics` file (all-day if the time field isn't a parseable time such as `6:30 PM` or `18:30`).

**Jobs & referrals** — Posters can offer internal referrals; seekers send a request with a message; the poster accepts or declines and the requester is notified.

**Admin → Reports** — Each report can be *Resolved* with an action: none, **warn** the author (in-app notice + optional note), **hide** the content (comments are deleted; posts/jobs/events/projects are flagged hidden; workshops are cancelled), or **disable** the author's account. The reporter is told the outcome. Everything is written to the audit log with the admin's IP.

**Admin → Analytics & exports** — Line charts of signups, posts, connections and registrations for 7/30/90 days. CSV exports (users, registrations, audit log) are formula-injection-safe and open correctly in Excel (UTF-8 BOM).

**Dark mode & language** — Toggles in the sidebar; choices are remembered per browser. Dark mode follows the OS preference on first visit. Bangla currently covers navigation, search and feed headings; other text falls back to English (add strings in `frontend/lib/translations.js`).

**PWA** — Installable from the browser menu. Pages are always fetched fresh; an offline page appears when there's no connection. API data is never cached.

---

## 12. API reference

Base URL: `/api`. All routes except `/health` and `/auth/config` require `Authorization: Bearer <token>`. Errors are JSON: `{ "error": "message" }` (validation errors also include `details`). Lists use `page` / `limit` unless noted. IDs in paths must be valid 24-hex ObjectIds (otherwise `400`).

### System & auth
| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness check (public) |
| GET | `/auth/config` | `{ demoEnabled }` (public) |
| GET | `/auth/demo-accounts` | List demo users (demo mode only) |
| POST | `/auth/demo-login` | `{ userId }` → demo token (demo mode only) |
| POST | `/auth/register` | `{ idToken, role?, department?, name? }` create profile after Firebase signup |
| GET | `/auth/me` | Current user |

### Users
| Method | Path | Description |
|---|---|---|
| GET | `/users` | Search/filter members. Query: `q, role, department, batch, skill, company, graduationYear, industry, location, verified=true, page, limit` → `{ users, page, total, hasMore }` |
| GET | `/users/facets` | Values for filter dropdowns |
| GET | `/users/:id` | Public profile (email only for yourself) |
| PUT | `/users/me` | Update own profile (whitelisted fields, validated) |
| POST | `/users/:id/endorse` | Toggle endorsement of a listed skill `{ skill }` |
| GET | `/users/:id/impact` | Contribution score and tier |

### Posts
| Method | Path | Description |
|---|---|---|
| GET | `/posts` | Feed. Query: `category, author, tag, q, page, limit` → `{ posts, page, hasMore, total }` |
| GET | `/posts/saved` | My saved posts |
| GET | `/posts/tags/trending` | Top hashtags (30 days) |
| POST | `/posts` | `{ content, category?, images? }` |
| PUT / DELETE | `/posts/:id` | Owner or admin |
| POST | `/posts/:id/react` | Toggle reaction `{ type: like\|celebrate\|support }` |
| POST | `/posts/:id/save` | Toggle bookmark |
| GET / POST | `/posts/:id/comments` | List / add `{ text, parentComment? }` |

### Connections & messages
| Method | Path | Description |
|---|---|---|
| GET | `/connections` | `{ accepted, incomingPending, outgoingPending }` |
| POST | `/connections/request` | `{ recipientId }` |
| POST | `/connections/:id/accept` · `/reject` | Respond to a request |
| DELETE | `/connections/:id` | Remove |
| GET | `/messages` | My conversations |
| POST | `/messages/start` | `{ userId }` open/get a conversation (must be connected) |
| GET | `/messages/:conversationId` | Newest `limit` (default 30) messages; `?before=<messageId>` for older → `{ messages, hasMore }`. Opening without `before` marks as read |
| POST | `/messages/:conversationId` | `{ text?, attachmentUrl? }` (one required) |
| POST | `/messages/:conversationId/read` | Mark read |

### Workshops, events, office hours, projects
| Method | Path | Description |
|---|---|---|
| GET / POST | `/workshops` | List / create (alumni, admin) |
| GET / PUT / DELETE | `/workshops/:id` | Detail / edit / delete (host or admin) |
| GET | `/workshops/:id/registrations` | Registrants (host/admin) |
| GET | `/registrations/mine` | My registrations |
| POST | `/registrations` · `/registrations/:id/cancel` | Register / cancel |
| GET / POST | `/events` | Upcoming events (`category`, `q`) / create |
| GET / PUT / DELETE | `/events/:id` | Detail / edit / delete |
| POST | `/events/:id/rsvp` | Toggle RSVP (capacity enforced) |
| GET | `/office-hours` · `/office-hours/mine` | Open slots / mine |
| POST | `/office-hours` | Create slot (alumni, admin) |
| POST | `/office-hours/:id/book` · `/cancel` | Book / cancel |
| DELETE | `/office-hours/:id` | Delete |
| GET / POST | `/projects` | List / create |
| GET / PUT / DELETE | `/projects/:id` | Detail / edit / delete |
| POST | `/projects/:id/star` | Toggle star |

### Jobs & mentorship
| Method | Path | Description |
|---|---|---|
| GET / POST | `/jobs` | List (filters + text search) / create |
| GET | `/jobs/mine/saved` | Saved jobs |
| GET / PUT / DELETE | `/jobs/:id` | Detail / edit / delete |
| POST | `/jobs/:id/save` | Toggle save |
| POST | `/jobs/:id/request-referral` | Ask for a referral `{ message }` |
| POST | `/jobs/:id/referrals/:requesterId/respond` | Poster accepts/declines |
| GET / POST | `/mentorship` | My requests / create (students) |
| POST | `/mentorship/:id/respond` | Accept, reject, reply, close |

### Notifications, search, uploads, push, reports
| Method | Path | Description |
|---|---|---|
| GET | `/notifications` | `{ notifications, unreadCount }` (paged) |
| POST | `/notifications/:id/read` · `/notifications/read-all` | Mark read |
| GET | `/search?q=` | Grouped results (min. 2 chars; `limit` ≤ 10 per group) |
| GET | `/uploads/status` | `{ enabled, maxBytes }` |
| POST | `/uploads/image` | multipart field `image` → `{ url }` (503 if not configured) |
| GET | `/push/public-key` | `{ enabled, publicKey }` |
| POST | `/push/subscribe` · `/push/unsubscribe` | Manage this browser's subscription |
| POST | `/reports` | `{ targetType: post\|comment\|user\|job\|event\|project\|workshop, targetId, reason }` (duplicates collapse) |

### Admin (`/admin/*`, admin role only)
| Method | Path | Description |
|---|---|---|
| GET | `/admin/dashboard` | Totals + recent users/posts/workshops/activity |
| GET | `/admin/analytics?days=30` | Daily series for charts |
| GET / POST | `/admin/users` | List (`q`, `role`) / create |
| GET / PUT / DELETE | `/admin/users/:id` | Read / edit (incl. `verified`, `role`, `status`) / delete |
| POST | `/admin/users/:id/toggle-status` | Activate / deactivate |
| GET / DELETE | `/admin/posts`, `/workshops`, `/jobs`, `/office-hours`, `/projects`, `/events` (+ `/:id`) | Moderation lists and deletion |
| DELETE | `/admin/comments/:id` | Delete a comment |
| GET | `/admin/registrations`, `/connections`, `/mentorship` | Oversight lists |
| GET | `/admin/reports` | Report queue |
| POST | `/admin/reports/:id/resolve` | `{ status: resolved\|dismissed, action: none\|warn\|hide\|disable_user, note? }` |
| GET | `/admin/activity` | Audit log (latest 200) |
| GET | `/admin/export/users.csv` · `/registrations.csv` · `/activity.csv` | CSV downloads |

---

## 13. Real-time events (Socket.IO)

Connect to the API origin with `auth: { token }`. On connect each socket joins `user:<id>` plus the shared rooms `feed`, `jobs`, `office-hours`, `projects`, `events`.

| Direction | Event | Payload / meaning |
|---|---|---|
| server → client | `notification:new` | A new notification for this user |
| | `message:new` · `message:read` · `conversation:update` | Chat delivery, read receipts, list refresh |
| | `typing` | `{ conversationId, userId, isTyping }` |
| | `presence:online` · `presence:offline` | `{ userId }` |
| | `post:new` `post:updated` `post:deleted` `post:reaction` `post:comment` | Feed changes |
| | `event:new` `event:updated` `event:deleted` `event:rsvp` | Events |
| | `job:new` `job:updated` `job:deleted` | Jobs |
| | `officeHours:new` `officeHours:updated` `officeHours:deleted` | Office hours |
| | `project:new` `project:updated` `project:deleted` `project:starred` | Projects |
| client → server | `join:conversation` / `leave:conversation` | Only allowed for participants |
| | `typing` | `{ conversationId, isTyping }` |
| | `presence:query` | `(userIds[], ack)` → ids currently online |

---

## 14. Data models

| Model | Key fields |
|---|---|
| **User** | name, email (unique), firebaseUid, role, status, profile fields, skills, endorsements, avatarUrl, location, **verified**, **emailNotifications**, lastActiveAt |
| **Post** / **Comment** | author, content, category, reactions[], savedBy[], **images[]**, **hashtags[]**, isDeletedByAdmin · comment: post, author, text, parentComment |
| **Connection** | requester, recipient, status (pending/accepted/rejected) — unique pair |
| **Conversation** / **Message** | participants[], lastMessageAt · conversation, sender, text, **attachmentUrl**, readBy[] |
| **Workshop** / **Registration** | host, date/time, mode, maxParticipants, deadline, status · workshop, participant, status |
| **Event** | host, date, time, mode, location, category, capacity, rsvps[], **reminderSent** |
| **Job** | postedBy, company, type, category, deadline, savedBy[], referralAvailable, referralRequests[] |
| **OfficeHour** | host, date, duration, topic, bookedBy, status |
| **Project** | author, techStack[], links, stars[] |
| **Mentorship** | student, alumni, topic, message, status, responses[] |
| **Notification** | user, type, text, link, read |
| **Report** | reporter, targetType/Id, reason, status, **actionTaken, resolutionNote, resolvedBy** |
| **Activity** | actor, action, targetType/Id, **ip, meta** (audit log) |
| **PushSubscription** | user, endpoint (unique), keys |

Indexes cover every hot query (feed, chat history, notifications, directory filters, admin lists, reminders) and text indexes power search.

---

## 15. Security measures

- **Helmet** headers; **CORS** locked to `CLIENT_ORIGIN`; Next.js adds `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- **Input validation** with zod on write routes (types, lengths, enums, https-only image URLs); unknown fields are stripped, so `role`, `isDemo`, etc. can't be injected through profile updates.
- **NoSQL-injection protection** (`express-mongo-sanitize`) and ObjectId checks on every `:id`.
- **Regex-safe search** — user input is escaped before use in patterns.
- **Rate limiting** on login, writes, comments, chat, uploads and search.
- **Environment validation** at startup; demo mode off by default in production.
- **Uploads**: type allow-list, 5 MB cap, in-memory handling, hosted on Cloudinary (never on the API server's disk).
- **Content moderation**: blocked words, spam heuristics, report workflow.
- **Auditability**: admin actions recorded with IP; log lines redact `Authorization` headers.
- **Privacy**: emails are never returned to other users; admin accounts are hidden from the directory.
- **Resilience**: async errors are caught centrally; duplicate-key/validation/cast errors return 4xx instead of crashing.

---

## 16. Rate limits

| Limiter | Limit | Applies to |
|---|---|---|
| Writes | 40 / 15 min | create posts, events, workshops, jobs, reports… |
| Comments | 80 / 15 min | comments |
| Chat | 60 / min per user | sending messages |
| Uploads | 30 / 15 min per user | image uploads |
| Search | 60 / min per user | global search |
| Auth | stricter, per IP | register, demo login |

Signed-in limits are per user (not per IP), so many students on one campus network don't block each other.

---

## 17. Testing, linting and CI

```bash
cd backend  && npm test && npm run lint     # 23 tests
cd frontend && npm test && npm run lint     # 7 tests (+ `npm run build`)
```

- **Backend tests** (`node:test` + `supertest`) cover validators, moderation, environment rules, security headers, the demo-mode switch, malformed JSON, NoSQL payloads and auth gating. They need **no database**.
- **Frontend tests** cover the calendar (.ics) builder and the translation dictionary (every English key must have a Bangla one).
- **CI** (`.github/workflows/ci.yml`) runs lint, tests and the frontend build for every push and pull request.
- Not yet covered: database-backed integration tests and browser end-to-end tests (see roadmap).

---

## 18. Deployment guide

A common low-cost setup: **MongoDB Atlas** + **backend on Render/Railway/Fly** + **frontend on Vercel**.

**Backend**
1. Set environment variables (`NODE_ENV=production`, `MONGODB_URI`, `DEMO_JWT_SECRET` (strong), `CLIENT_ORIGIN=https://your-frontend-domain`, Firebase credentials, optional services).
2. Build command `npm ci`, start command `npm start` (or deploy the `backend/Dockerfile`).
3. Health check path: `/api/health`. The app already trusts one proxy hop (`trust proxy = 1`).
4. Run `npm run seed` **only** if you want demo data — and keep `DEMO_MODE_ENABLED` off if real users exist.

**Frontend**
1. Root directory `frontend`, framework Next.js. Set `NEXT_PUBLIC_API_BASE_URL=https://your-api-domain/api` and the Firebase web config.
2. Add the frontend domain to Firebase *Authorized domains*.

**Go-live checklist**
- [ ] Credentials rotated (section 1) and `.env` files not in git
- [ ] `DEMO_MODE_ENABLED` unset/false
- [ ] `CLIENT_ORIGIN` exactly matches the frontend URL (scheme + host, no trailing slash)
- [ ] HTTPS everywhere (required for push and PWA install)
- [ ] `UNIVERSITY_EMAIL_DOMAINS` set if you want auto-verification
- [ ] At least one real admin: create via Atlas (`role: "admin"`) or promote a user from another admin account
- [ ] Atlas backups enabled; Atlas IP allow-list correct
- [ ] SMTP / Cloudinary / VAPID configured if you want those features

---

## 19. Scaling

- One API instance handles hundreds of concurrent users comfortably. To run several, set `REDIS_URL` (shared Socket.IO rooms/presence) and put them behind a load balancer.
- The event-reminder job is an in-process timer. With several instances set `RUN_JOBS=false` on all but one (reminders are also idempotent via `reminderSent`, so a duplicate run won't double-send).
- Chat history, feed, directory and notifications are all paginated; admin lists are capped (users 500, activity 200).

---

## 20. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Server exits immediately with `[env] …` errors | Missing/weak `MONGODB_URI`, `DEMO_JWT_SECRET`, or (production) `CLIENT_ORIGIN` — fix the variable named in the message |
| `MongoServerSelectionError` | Wrong URI or your IP isn't allowed in Atlas *Network Access* |
| Browser shows CORS errors | `CLIENT_ORIGIN` must exactly equal the page's origin |
| Demo page says "Not found" | Demo mode is off (`NODE_ENV=production` or `DEMO_MODE_ENABLED=false`) |
| Real login fails with "Firebase is not configured" | Backend `FIREBASE_*` variables missing or private key lost its `\n` escapes |
| "Live" indicator stuck on *Connecting…* | API unreachable, wrong `NEXT_PUBLIC_API_BASE_URL`, or a proxy blocking WebSockets |
| No 📷 Photo buttons | Cloudinary not configured (by design they hide) |
| No emails | `SMTP_*` unset, or the account is a seeded demo user / has opted out |
| Push toggle missing | Needs VAPID keys, HTTPS, and a production build (`npm run build && npm start`) |
| Search returns nothing for new posts | Text indexes build in the background after first start; wait a moment |
| Dark mode looks off somewhere | Dark theme is a CSS override layer (`globals.css`, bottom); add a rule for that class |
| `npm run seed` removed my data | Seed resets collections — never run it against a database with real users |

---

## 21. Known limitations and roadmap

**Limitations**
- Chat is 1-to-1 only; no group chats or message editing/deletion.
- Bangla translation covers key screens only.
- No database-backed integration tests or browser E2E tests yet.
- Event times are free text; reminders trigger on the event *date* (within 24 h), not the exact clock time.
- Single-process reminder job (see [Scaling](#19-scaling)).

**Ideas for next steps**
group chats · polls and @mentions · AI helpers (résumé feedback, mentor matching) · mentorship session booking dashboard · gamification badges and leaderboard · React Query/SWR data layer · TypeScript migration · Playwright E2E tests · Sentry error monitoring · OpenAPI/Swagger docs.

---

*Contributions: create a branch, run `npm test && npm run lint` in both apps, and open a pull request — CI will check it. Add a `LICENSE` file before publishing the repository.*
