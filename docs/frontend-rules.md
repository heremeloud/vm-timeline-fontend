# Frontend rules (for developers and AI assistants)

Conventions for `vm-timeline-frontend`: React 19 + Vite 7 + TypeScript (strict) + react-router 7 + axios.
Visual rules are in [`ui-library.md`](ui-library.md); the component catalogue is in [`../src/ui/README.md`](../src/ui/README.md).
The backend is FastAPI in `../vm-timeline-backend`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run typecheck` | `tsc -b` (strict; also run by `build`) |
| `npm run lint` | ESLint + typescript-eslint + react-hooks |
| `npm test` | `node --test "src/**/*.test.ts"` (Node runs `.ts` natively) |
| `npm run build` | typecheck + production build |

Before finishing any change: typecheck, lint, test, build must all pass.

## Layout

```
src/
  api/          one *Service.ts per backend router + api.ts (axios instance)
  components/   feature components (cards, embeds, forms, relationship chart)
  constants/    static option lists
  hooks/        shared hooks
  pages/        route components (App.tsx wires routes; src/routes.ts holds paths)
  styles/       CSS (UI.css = tokens + primitives; one file per feature)
  types/        models.ts — domain types mirroring backend serializers
  ui/           local UI library (see ui/README.md)
  utils/        pure helpers (+ *.test.ts)
```

## TypeScript rules

- `strict`, `noUnusedLocals/Parameters`, `verbatimModuleSyntax`, `erasableSyntaxOnly` (no `enum`/namespaces/parameter properties — Node strips types for tests).
- Use `import type { … }` for types. Relative imports are extensionless, except in `*.test.ts` (use `./file.ts`).
- No `any`. Prefer a precise interface; use `unknown` + narrowing for caught errors. A cast needs a one-line reason.
- Component props: `interface XProps`, extend native props (`ButtonHTMLAttributes`, …) when wrapping an element.
- State: always give the generic when the initial value can't infer it (`useState<Post | null>(null)`).
- Route params are `string | undefined`: pass `id ?? ""` to services.
- Form state keeps strings (inputs are strings); convert on submit (`parseInt`, `|| null`).

## Domain types — `src/types/models.ts`

Types mirror what the backend *serializes*, not the table models: e.g. an event has `tags: string[]`, `photo_items`,
`dates`, `date_items`, `live_media_items` (the `*_json` columns are dropped), a post has an enriched `media_urls: MediaItem[]`
**and** a writable `media_urls_json: string`. When the backend serializer changes (`routers/*.py` `_serialize_*`/`_enrich*`),
update `models.ts` in the same change. Keep optional/nullable exactly as the API returns.

## API layer — `src/api`

- `api.ts` exports one axios instance: base URL `VITE_API_URL` (default `http://localhost:8000`), adds `Authorization: Bearer <jwt>` from
  `localStorage["jwt"]`, and on 401 / 403 "Invalid token" clears the token and redirects to `/admin?expired=1`.
- **Components never call axios directly.** Add a function to the matching `*Service.ts`.
- Service functions are thin, typed, and return the axios response: `export const getX = (id: Id | string) => api.get<{ x: X }>(`/xs/${id}`)`.
  Type the generic with the real response shape; type request bodies with an exported `XInput`
  (all-optional, `| null` where the API accepts clearing, e.g. `PostInput`, `EventInput`, `ProjectInput`).
- Response shapes vary by route — check the backend: lists return arrays; single-item reads return `{ post }`, `{ event }`,
  `{ project }`, `{ topic }`; counts return `{ count }`; timeline returns `{ items, has_more, last_updated }`.
- Public vs admin: routes under `/…/admin…` need the JWT. Public pages call the public function, admin pages the `getAdmin…` one
  (`isAdmin = !!localStorage.getItem("jwt")`). Login is `application/x-www-form-urlencoded`.
- Query strings: encode user text with `encodeURIComponent` / `URLSearchParams`; omit empty filters (`"all"` means none).
- Caching (`axios-cache-interceptor`) is currently disabled in `api.ts` on purpose — don't re-enable without asking.
- Error handling: use `errorDetail(err, fallback)` from `utils/errors` to turn FastAPI `detail` (string or validation list) into text.
  Don't read `err.response.data.detail` by hand. Log with `console.error`, tell the user with `alert`/`Alert`.
- Env vars are declared in `src/vite-env.d.ts`; read them only in `config.ts` / `api.ts` (`API_BASE`) or document the new one in the README.
- Writes that reorder or toggle should update local state optimistically and roll back on failure (see `ManageDisplay.movePost`).

## Shared helpers worth reusing

`utils/errors` (`errorDetail`), `utils/postUrls` (URL normalization/detection, Bangkok time ↔ UTC), `utils/postForm` (story-item helpers),
`utils/media` (`isVideo`, `isImage`, `resolvePhotoUrl`, `getYouTubeEmbedUrl`), `utils/authors` (`orderViewMimFirst`), `utils/slugify`,
`utils/dates` (`getLocalToday`), `hooks/useModalDialog` (native `<dialog>` driven by state), `hooks/useEventCategories`.
Search for an existing helper before writing a new one; extract a helper when a third copy appears.

## Components & pages

- One default-exported component per file, named like the file. Pages own data loading; components receive typed props.
- Admin-only UI is gated by the JWT presence check; admin routes are wrapped in `ProtectedRoute` in `App.tsx`.
- Paths come from `ROUTES` (`src/routes.ts`) — never hard-code a URL string in a `Link`/`navigate`.
- Effects: no synchronous `setState` in an effect body (lint-enforced); derive state during render or key on props instead.
- Hashtag/keyword → event/project links (post cards, project Q/EP rows, event related posts, admin view) follow `docs/event-project-linking.md`; update it when you change `utils/eventTagLinks.ts`.
- Don't edit `RelationshipChart*` styling/geometry without reading `docs/relationship-chart-ui.md` (CSS and `utils/relationshipChart.ts` constants are kept in sync).

## Styling rules

1. Use `src/ui` primitives; page CSS only lays them out. See `src/ui/README.md` and `docs/ui-library.md`.
2. Use `--ui-*` tokens; no new hard-coded brand colors or spacing outside the 4/8/12/16 scale.
3. Avoid inline `style` except for genuinely dynamic values (focal point `objectPosition`, computed positions/CSS variables).
4. Navigation that looks like a button is `ButtonLink`; never nest interactive elements.
5. `.eventform-form` re-styles raw `label`/`input`/`select`; a primitive inside it may need a scoped override in `EventForm.css`
   (see `.eventform-default-tags`). Known debt: the global `textarea { height: 70px !important }` in `App.css` fights `Textarea`.
6. When you convert a screen, convert a whole interaction and check desktop, mobile, focus, disabled and loading states in the browser.

## Testing

Pure logic gets tests next to it (`foo.test.ts`, `node:test` + `node:assert/strict`). Type fixtures with small helpers rather than casts.
UI verification is manual in the browser; admin screens need a real JWT from `/admin` (never commit or hard-code credentials).

## Checklist for a new feature

1. Backend shape known → add/adjust type in `types/models.ts`.
2. Add typed functions in the right `api/*Service.ts`.
3. Build the screen from `src/ui` primitives; add a route in `App.tsx` + `ROUTES`.
4. `npm run typecheck && npm run lint && npm test && npm run build`.
5. Update `docs/ui-library.md` / `src/ui/README.md` if you added or changed a primitive.
