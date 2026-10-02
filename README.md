# ViewMim timeline frontend

React 19 + Vite + TypeScript (strict). Talks to the FastAPI backend in `../vm-timeline-backend`.

```bash
npm install
npm run dev          # http://localhost:5173 (API: VITE_API_URL, default http://localhost:8000)
npm run typecheck    # tsc -b
npm run lint
npm test             # node --test on src/**/*.test.ts
npm run build        # typecheck + vite build
```

## Docs

- [`docs/frontend-rules.md`](docs/frontend-rules.md) — architecture, TypeScript/API/styling conventions (**read first**, also for AI assistants)
- [`src/ui/README.md`](src/ui/README.md) — UI primitive catalogue and rules
- [`docs/ui-library.md`](docs/ui-library.md) — detailed visual rules
- [`docs/content-card-ui.md`](docs/content-card-ui.md), [`docs/relationship-chart-ui.md`](docs/relationship-chart-ui.md) — composite patterns

## Environment

- `VITE_API_URL` — backend base URL (default `http://localhost:8000`).
- `VITE_SHOW_EVENT_VIEW_NAVIGATION=false` — hide the "Browse event pages" chip row on `/events` (routes keep working).
