# NexAI — Think Smarter. Work Faster. Create More.

NexAI is a full-stack AI workspace: chat, agents, research, documents, image/video/voice studios, developer tools, analytics, 18 domain workspaces and the admin console behind them — **370 features across 19 modules**, one shared memory and one credit system.

It runs **zero-config**. No database, no API keys and no build step required: the backend seeds a demo workspace into a local JSON file and answers with a module-aware demo engine. Add a provider key and the same UI talks to a live model.

```
React 18 + Vite  ·  Node 20 + Express  ·  JSON store  ·  SSE streaming  ·  zero external services
```

---

## Quick start

Two terminals. Nothing else.

```bash
# 1 — API on http://localhost:5000
cd backend
npm install
npm run dev

# 2 — UI on http://localhost:5173
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** and sign in with the seeded workspace:

| Field | Value |
| --- | --- |
| Email | `demo@nexai.app` |
| Password | `demo1234` |
| Workspace | Northstar Studio (Business plan, admin) |

The demo account starts with 18,500 credits, six conversations, two agents, five projects, files, tickets, invoices, API keys and 30 days of usage history — enough to exercise every screen.

> PowerShell note: if `npm` is blocked by execution policy, use `npm.cmd`.

### Production build

```bash
cd frontend
npm run build      # writes frontend/dist
npm run preview    # serve the built app
```

The Vite dev server proxies `/api` to `localhost:5000`. For a single-origin deployment, serve `frontend/dist` from any static host and point the frontend at the API origin with `VITE_API_URL` (see `frontend/src/api.js`).

---

## What is inside

### 19 modules · 370 features

| Module | Features | Highlights |
| --- | --- | --- |
| AI Chat & Assistant | 20 | streaming chat, model/tone/length controls, attachments, memory, regenerate, share |
| Advanced Intelligence | 20 | deep reasoning, critique, debate, fact-check, decision briefs |
| AI Writing | 20 | long-form drafting, rewriting, tone shift, outlines, style cloning |
| Documents & PDF | 20 | PDF/DOCX/XLSX/CSV extraction, summaries, Q&A, tables, redaction |
| Image Studio | 20 | prompt builder, styles, aspect ratios, deterministic SVG generation, gallery |
| Video Studio | 20 | script → shot list → storyboard, captions, hooks, repurposing |
| Voice & Audio | 20 | speech synthesis/recognition via the browser, scripts, transcripts, dubbing |
| Developer Tools | 20 | code generation/explanation, SQL, tests, regex, API design, debugging |
| AI Research | 20 | web-grounded briefs, citations, source comparison, literature maps |
| Business AI | 20 | strategy, SWOT, OKRs, pricing, meeting notes, stakeholder updates |
| AI Agents & Automation | 20 | no-code agent builder, tools, schedules, runs, marketplace |
| Education & Learning | 20 | lesson plans, quizzes, flashcards, study paths, grading rubrics |
| Marketing & Social | 20 | campaigns, social posts, ads, email sequences, SEO, brand voice |
| Data Analytics | 20 | CSV analysis, charts, forecasting, cohort/retention, insight narratives |
| Customer Support | 20 | tickets, suggested replies, sentiment, escalation, macros, CSAT |
| Personal Finance | 20 | budgets, cash-flow, invoice parsing, scenario planning, savings |
| Platform & UX | 20 | command palette, themes, shortcuts, search, notifications, PWA |
| Admin & Enterprise | 20 | users, revenue, security, audit log, storage, coupons, feature flags |
| Advanced & Enterprise AI (bonus) | 10 | agents-as-API, evaluation harness, guardrails, model routing, BYO keys |

Every feature carries an id, description, action type and system prompt. The catalogue is generated from one source of truth:

```bash
node scripts/build-catalog.mjs   # regenerates backend/src/catalog.js + frontend/src/catalog.json
```

### The app

- **Dashboard** — greeting, credits, live stats, quick actions, recent activity, usage chart.
- **Chat** — SSE streaming, conversation history, pin/rename/archive/delete, attachments, per-message feedback, share links.
- **Agents** — create/edit agents with instructions, tools, model, schedule and autonomy; run history; marketplace installs.
- **Research** — plan → search → read → synthesise, with numbered citations and source cards.
- **Studios** — image (SVG art), video (storyboard + shot list), voice (speech APIs with graceful fallback).
- **Documents** — drag-and-drop PDF/DOCX/XLSX/CSV/TXT, client-side extraction, analysis and generated artefacts.
- **Developer** — code generation, explanation, tests, SQL, regex and API snippets with copy/download.
- **Analytics** — computed usage, module breakdown, top tools, forecast, cost per capability.
- **Module workspaces** — every module ships 20 focused tools with structured output and credit metering.
- **Workspace** — projects, files, prompt library, marketplace, integrations, team.
- **Account** — billing, plans, coupons, invoices, usage, API keys, model catalogue, settings, help.
- **Admin** — users, revenue, plan distribution, storage, services, audit log, coupons, demo reset.
- **Feature library** — search and filter all 370 features, inspect prompts and jump into the matching tool.

### Demo mode vs live mode

NexAI always answers. The gateway in `backend/src/ai.js` detects available credentials and routes to the first configured provider:

| Provider | Variable |
| --- | --- |
| Anthropic | `ANTHROPIC_API_KEY` |
| OpenAI | `OPENAI_API_KEY` |
| Google Gemini | `GEMINI_API_KEY` |
| OpenRouter | `OPENROUTER_API_KEY` |
| Groq | `GROQ_API_KEY` |
| Ollama (local) | `OLLAMA_URL` |

Without a key, requests go to the demo engine: module-aware, deterministic, streamed token-by-token, with demo badges visible in the UI. Image generation produces deterministic SVG compositions; video produces production-ready storyboards; voice uses the browser's speech synthesis and recognition APIs.

Optional web search for Research: `TAVILY_API_KEY`.

Copy `backend/.env.example` to `backend/.env` to configure:

```ini
PORT=5000
JWT_SECRET=change-me-in-production
CLIENT_URL=http://localhost:5173

# DATA_FILE=./data/db.json

ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=
OPENROUTER_API_KEY=
GROQ_API_KEY=
OLLAMA_URL=
TAVILY_API_KEY=
```

---

## Architecture

```
nexai/
├── backend/
│   ├── data/db.json          # seeded JSON store (created/updated at runtime)
│   └── src/
│       ├── server.js         # Express REST API + SSE chat + admin
│       ├── store.js          # JSON persistence, seed data, plans, auth helpers
│       ├── ai.js             # provider gateway, streaming, demo intelligence
│       ├── media.js          # SVG art, storyboards, dataset analysis
│       └── catalog.js        # generated 370-feature catalogue
├── frontend/
│   ├── public/               # PWA manifest + icon
│   └── src/
│       ├── App.jsx           # shell, hash router, auth, command palette
│       ├── api.js            # fetch wrapper + SSE streaming client
│       ├── context.js        # app context (user, catalog, theme, toasts)
│       ├── nav.js            # navigation, module metadata, route map
│       ├── ui.jsx            # design-system components + charts + markdown
│       ├── styles.css        # dark/light design system, all views, responsive
│       ├── catalog.json      # generated public feature catalogue
│       └── views/            # 15 view files covering every route
└── scripts/
    ├── build-catalog.mjs     # blueprint → catalog generator
    ├── extract-classes.mjs   # CSS class inventory
    └── check-imports.mjs     # missing JSX import detector
```

### Design decisions

- **No database dependency.** A JSON store keeps the project runnable anywhere. It is atomic-write safe and easy to inspect (`backend/data/db.json`). Swap `store.js` for Mongo/Postgres without touching the API surface.
- **No auth dependencies.** Passwords are hashed with Node's `crypto.scrypt`; sessions use HS256 JWTs signed with `crypto.createHmac`. No `bcrypt`/`jsonwebtoken` native install issues.
- **Streaming without a library.** The frontend reads `fetch` response bodies and parses `data:` frames; events are `start`, `delta`, `done`, `error`.
- **Deterministic demo.** Every tool has a tailored response template, so demos look intentional rather than empty.
- **Credit metering everywhere.** Chat, agents, studio and module runs debit credits and write usage records; analytics and the admin console read the same records.
- **Accessibility and motion.** Keyboard navigation, focus states, reduced-motion support, responsive down to 360 px.

---

## API surface (short version)

All routes are prefixed with `/api`. Authenticated routes expect `Authorization: Bearer <token>`.

| Area | Routes |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/demo`, `GET /me`, `PATCH /me`, `POST /me/password`, `POST /me/avatar`, `POST /me/2fa` |
| Catalogue | `GET /catalog`, `GET /models`, `GET /plans`, `GET /integrations`, `POST /integrations/:id/toggle` |
| Chat | `GET/POST /conversations`, `GET/PATCH/DELETE /conversations/:id`, `GET /conversations/:id/export`, `POST /conversations/:id/share`, `POST /chat`, `POST /chat/stream`, `GET /share/:shareId` |
| Agents | `GET/POST /agents`, `PATCH/DELETE /agents/:id`, `POST /agents/:id/run`, `GET /marketplace/agents`, `POST /marketplace/agents/:id/install` |
| Research | `POST /research/run`, `GET /research/sources`, `DELETE /research/sources/:id` |
| Documents | `GET/POST /documents`, `DELETE /documents/:id`, `POST /documents/analyze`, `POST /documents/:id/ask` |
| Studios | `POST /image/generate`, `GET /image/gallery`, `GET /image/:id`, `POST /video/generate`, `GET /video/gallery`, `GET /voice/voices` |
| Workspace | `/projects`, `/files`, `/prompts`, `/prompts/:id/use`, `/team`, `/search`, `/notifications` |
| Analytics | `GET /dashboard`, `GET /usage`, `GET /activity`, `GET /analytics/datasets`, `POST /analytics/analyze`, `POST /analytics/ask` |
| Support | `/tickets`, `/tickets/:id/reply` |
| Billing | `GET /billing`, `POST /billing/plan`, `POST /billing/coupon` |
| API keys | `GET/POST /keys`, `DELETE /keys/:id`, `POST /v1/chat`, `GET /v1/models` |
| Admin | `GET /admin/overview`, `GET/PATCH/DELETE /admin/users/:id`, `GET /admin/audit`, `/admin/coupons`, `POST /admin/reset-demo` |

The SSE contract:

```text
data: {"type":"start","conversationId":"c_…","model":"NexAI Core","demo":true}
data: {"type":"delta","text":"## Five taglines"}
data: {"type":"done","conversation":{…},"message":{…},"credits":18430,"suggestions":[…],"confidence":0.91}
```

---

## Scripts

| Command | Where | Purpose |
| --- | --- | --- |
| `npm run dev` | backend | start API with `node --watch` |
| `npm run dev` | frontend | Vite dev server on :5173 |
| `npm run build` | frontend | production bundle in `dist/` |
| `npm run catalog` | backend | rebuild the 370-feature catalogue |
| `node scripts/check-imports.mjs` | root | find missing capitalised JSX imports |
| `node scripts/extract-classes.mjs` | root | dump every CSS class used per view |

---

## Quality notes

- All 31 routes were exercised in a real browser after the last change; no console errors.
- Chat was verified end-to-end: send → stream → persist → reload conversation.
- Production build succeeds (Vite, ~707 kB main bundle incl. PDF/XLSX workers).
- Demo data can be reset from **Admin → Reset demo** or by deleting `backend/data/db.json`.
- The UI clearly marks demo intelligence with an amber badge; nothing pretends to be a live model.

## License

MIT. Demo workspace, names and metrics are fictional.
