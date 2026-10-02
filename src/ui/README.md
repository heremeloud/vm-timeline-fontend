# `src/ui` — local UI library

Reusable interface primitives. **Read this before building or changing any screen.**
The full visual rules (colors, sizes, semantics) live in [`docs/ui-library.md`](../../docs/ui-library.md);
this file is the quick map of what exists and how to use it.

```ts
import { Button, FormField, TextInput, Stack } from "../ui";   // always import from the barrel
```

Tokens (`--ui-*`) and all primitive CSS live in [`src/styles/UI.css`](../styles/UI.css).

## Rules

1. Use a primitive for behavior and accessibility; don't hand-roll buttons, inputs, or toggles.
2. Use a variant prop for intentional visual differences. Never restyle a primitive from page CSS.
3. Page CSS is for layout *around* a primitive only (grid, spacing, alignment).
4. Semantic color is decided by the action, not the place: delete → `danger`, add → `add` (label starts `+ Add`),
   insert at a position → `insert`, main save → `save`. Size is chosen separately via `size`.
5. Keyboard focus must stay visible. Icon-only controls need an `aria-label`.
6. Every component is typed. Props extend the native element's props where one exists, so `onClick`, `disabled`, `aria-*` just work.
7. Don't add inline `style={{…}}` for anything a class, token, `Stack`, or `Inline` can express.

## Catalogue

| Primitive | Use for | Notes |
| --- | --- | --- |
| `Button` | Any action | `variant`: `primary` `secondary`(default) `ghost` `danger` `add` `insert` `save`; `size`: `small` `medium`(default) `large`. `type="button"` by default. |
| `ButtonLink` | Navigation that looks like a button | Wraps react-router `Link`; same `variant`/`size`. Never nest a `<button>` in a `<Link>`. |
| `ToggleButton` / `ToggleGroup` | Immediate choices | `active` sets `aria-pressed` (or `aria-selected` with `role="tab"`); `segmented` for mutually exclusive. |
| `FormField` | Label + hint + error + required around **one** control | Injects `id`, `required`, `aria-invalid`, `aria-describedby` into its child. |
| `TextInput` `Select` `Textarea` `Checkbox` | Form controls | Don't style native controls per page. |
| `FilterBar` `FilterRow` `FilterField` `FilterDivider` | Compact, open filter rows | Events page is the reference. |
| `Pagination` | Prev / Next / "Jump to" bar | Controlled: `page`, `lastPage`, `onPrevious`, `onNext`, `jumpValue`, `onJumpChange`, `onJump`; `inline` for one row. |
| `Badge` | Read-only metadata/status | `neutral accent info success warning danger`. Not for actions. |
| `Alert` `EmptyState` | Inline feedback / empty lists | |
| `Card` `CardGrid` `Stack` `Inline` | Surfaces and layout | Gaps are `1`–`4` (4/8/12/16px). `CardGrid` is the only responsive card grid. |
| `CarouselControls` | Arrows + dots for media | Wrap media in `.media-carousel`. |
| `DragHandle` `DropIndicator` `reorderItems` | Drag to reorder | Row owns `onDragOver`/`onDrop`; `DropIndicator` (row must be `position: relative`) shows the target; `reorderItems` moves immutably. |
| `FloatingActionButton` / `FloatingActionLink` | The round "+" create control | `label` is the accessible name. |
| `FocalPointPicker` | Display Focus for photos/artwork | Re-exported from `components/`. |
| `cx(...)` | Join class names | Skips falsy values. |

Composite content cards (events, posts, embeds) are in `ui/patterns/contentCards.ts`; see `docs/content-card-ui.md`.

## Adding or changing a primitive

- One file per component in this folder, typed props exported (`export interface XProps`), default export the component.
- Import `"../styles/UI.css"` and add its CSS to `UI.css` using `--ui-*` tokens; use BEM-ish `ui-name`, `ui-name--variant`.
- Compose classes with `cx`, spread remaining props onto the native element, and keep `className` merge-able.
- Re-export from `index.ts`, document it in the table above and in `docs/ui-library.md`.
- Behavior with logic (`reorder.ts`) gets a `*.test.ts` next to it (`npm test`).
- Verify desktop, mobile width, keyboard focus, disabled and loading states.

## Anti-patterns already cleaned up (don't reintroduce)

- `<Link><button/></Link>` (invalid nesting) → `ButtonLink` / `FloatingActionLink`.
- Legacy `.btn-edit`, `.btn-delete`, `.form-primary-submit`, `.pagination-btn` raw buttons → `Button` (`pagination-btn` stays only inside `Pagination`).
- Per-page copies of the drop bar, pagination markup, and `<dialog>` open/close effects → `DropIndicator`, `Pagination`, `hooks/useModalDialog`.
