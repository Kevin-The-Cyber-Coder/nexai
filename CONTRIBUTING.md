# Contributing to NexAI

Thanks for taking the time to improve NexAI. The project is intentionally dependency-light so it can run anywhere.

## Setup

```bash
cd backend && npm install && npm run dev     # :5000
cd frontend && npm install && npm run dev    # :5173
```

Demo login: `demo@nexai.app` / `demo1234`.

## Before opening a pull request

```bash
cd frontend && npm run build
node scripts/check-imports.mjs
node scripts/smoke-test.mjs                  # API must be running
```

All three should pass. The smoke test checks the catalogue total, auth, dashboard, chat, usage and admin endpoints.

## Adding or changing a feature

1. Edit the blueprint inside `scripts/build-catalog.mjs`.
2. Run `node scripts/build-catalog.mjs` (or `npm run catalog` from `backend/`).
3. Add a response template in `backend/src/ai.js` if the tool needs domain-specific demo output.
4. Run the build and smoke test.

Every feature must have a unique `id`, a `name`, a one-sentence `description`, an `action` (`chat`, `generate`, `analyze`, `plan`, `code`, …) and a system prompt.

## Commit style

Use conventional, file-scoped messages:

```text
feat(frontend/src/views/Chat.jsx): stream markdown responses with caret
fix(backend/src/server.js): return topTools as objects for the usage view
docs(README.md): document zero-config demo mode
```

## Code style

- ES modules, two-space indentation, single quotes in JS.
- Components live in `frontend/src/views/`; shared primitives in `frontend/src/ui.jsx`.
- Backend has no ORM: all persistence goes through `backend/src/store.js`.
- Never commit `.env`, `node_modules/` or `frontend/dist/`.
- Keep demo mode fully functional. A missing API key must degrade, not break.
