# QA report

Verified against the final source tree on Node 24 / Chromium (Vite dev server + production build).

## Automated checks

| Check | Command | Result |
| --- | --- | --- |
| Production bundle | `cd frontend && npm run build` | Pass — 305 modules, ~707 kB main JS, ~147 kB CSS |
| JSX import audit | `node scripts/check-imports.mjs` | Pass — no missing capitalised imports |
| API smoke test | `node scripts/smoke-test.mjs` | Pass — catalogue 370, auth, dashboard, chat, usage, admin |
| CSS class inventory | `node scripts/extract-classes.mjs` | Pass — inventory generated for every view |

## Route matrix

All 31 routes were opened in a real browser with the console watched for errors. Every route rendered non-empty content.

| Route | View | Result |
| --- | --- | --- |
| `#/dashboard` | Dashboard | Pass |
| `#/chat` | Chat | Pass |
| `#/agents` | Agents | Pass |
| `#/automation` | Agents (automation mode) | Pass |
| `#/research` | Research | Pass |
| `#/image` | Image Studio | Pass |
| `#/video` | Video Studio | Pass |
| `#/voice` | Voice Studio | Pass |
| `#/documents` | Documents | Pass |
| `#/developer` | Developer Tools | Pass |
| `#/analytics` | Analytics | Pass |
| `#/writing` | Writing module workspace | Pass |
| `#/education` | Education module workspace | Pass |
| `#/business` | Business module workspace | Pass |
| `#/marketing` | Marketing module workspace | Pass |
| `#/finance` | Finance module workspace | Pass |
| `#/support` | Support Desk | Pass |
| `#/projects` | Projects | Pass |
| `#/files` | Files | Pass |
| `#/prompts` | Prompt library | Pass |
| `#/marketplace` | Agent marketplace | Pass |
| `#/integrations` | Integrations | Pass |
| `#/team` | Team | Pass |
| `#/features` | Feature library | Pass |
| `#/billing` | Billing | Pass |
| `#/usage` | Usage & credits | Pass |
| `#/keys` | API keys | Pass |
| `#/models` | Model catalogue | Pass |
| `#/settings` | Settings | Pass |
| `#/help` | Help & support | Pass |
| `#/admin` | Admin console | Pass |

## Interaction checks

- **Chat streaming** — send → SSE deltas render → response persists → reload restores the conversation.
- **Markdown streaming** — the caret renders outside `react-markdown` (react-markdown v9 accepts string children only).
- **Regenerate / stop / feedback / copy** — wired to the message actions.
- **Conversation management** — create, rename, pin, archive, delete and share-link routes respond.
- **Attachments** — PDF, DOCX, XLSX/CSV, text and code extraction happens client-side, then travels with the prompt.
- **Agents** — create, edit, run, schedule fields and marketplace install all hit the API and update state.
- **Studios** — image request returns deterministic SVG; video returns a storyboard and shot list; voice uses browser speech APIs with a clear fallback.
- **Documents** — upload, extract, analyse and ask-about-document flows work with the demo engine.
- **Billing** — plan change updates credits, invoices and the current plan; coupons validate and report errors.
- **API keys** — create, reveal, copy and revoke; public `/api/v1/chat` accepts a key.
- **Admin** — user edit/suspend/delete, coupons, audit log, revenue and reset-demo.

## Known limits

- Demo mode is intentionally deterministic; it is not a live language model.
- Payments, email delivery and third-party integrations are simulated.
- Voice input/output depends on browser support for `speechSynthesis` / `SpeechRecognition`.
- The JSON store is single-process. Use a real database before running multiple API instances.
- The main bundle exceeds Vite's 500 kB warning threshold because PDF and XLSX workers are bundled; they are lazily loaded.

## Seed reset

Delete `backend/data/db.json` and restart the API, or use **Admin → Reset demo**. The default seed is restored automatically.
