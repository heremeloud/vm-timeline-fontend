# Local UI library

Quick component map and authoring rules: [`src/ui/README.md`](../src/ui/README.md). Project-wide conventions: [`frontend-rules.md`](frontend-rules.md). All components are TypeScript with exported prop types.

The app's reusable interface primitives live in `src/ui`. New screens should use these components and the shared tokens in `src/styles/UI.css` before adding page-specific styles.

## Principles

1. Use a shared primitive for behavior and accessibility.
2. Use a variant prop for intentional visual differences.
3. Add page CSS only for layout around a primitive, not to redefine the primitive.
4. Keyboard focus must always be visible.
5. Destructive actions use `danger`; add actions use `add`; the main save action uses `save`.

## Button

```tsx
import { Button } from "../ui";

<Button variant="primary" type="submit">Save event</Button>
<Button variant="secondary" onClick={onCancel}>Cancel</Button>
<Button variant="primary" size="small" onClick={onEdit}>Edit</Button>
<Button variant="danger" size="small" onClick={onDelete}>Delete</Button>
```

Variants: `primary`, `secondary` (default), `ghost`, `danger`, `add`, `insert`, and `save`. `primary` remains an alias for the app accent where an older screen has not yet adopted a semantic intent.

Sizes: `small`, `medium` (default), and `large`.

Button heights are border-box dimensions: small is 30px, medium is 36px, and large is 42px. Padding is included in those heights and must not make the rendered control taller.

Use a native `disabled` prop while an action is unavailable or saving. Icon-only buttons must have an `aria-label`.

Use `className="ui-button--icon"` for compact icon-only actions that sit beside ordinary buttons. It keeps a square 36px control while preserving the medium row height. Always include an `aria-label` and usually a short `title` tooltip.

### Semantic action colors

Action meaning determines color; location determines only size. The same action must retain its intent color in a card, form, modal, or compact row.

| Intent | Variant | Color | Labels and uses |
| --- | --- | --- | --- |
| Delete | `danger` | Vivid red (`#e32636`) | Delete, Remove, Disconnect, Clear permanently |
| Add | `add` | Green | Add date/row/item/media, Create a new record |
| Insert | `insert` | Blue-gray | Insert an item at a specific position in an existing sequence |
| Save | `save` | Brown | Save, Apply, Update, Confirm edits |

All four intents share the same interaction rules: solid default, a brighter hover, a subtle pressed offset, matching keyboard focus, and reduced-opacity disabled state. Hover and pressed states do not change the label color. Never choose a different color because a button is smaller. Use `size="small"`, `"medium"`, or `"large"` independently, and use one size for every action in the same row.

```tsx
<Button variant="danger" size="small">Remove</Button>
<Button variant="add" size="medium">+ Add date</Button>
<Button variant="insert" size="small">Insert photo</Button>
<Button variant="save" size="large" type="submit">Save event</Button>
```

### Button states and toggles

All native buttons use the app accent for keyboard focus and suppress the browser's default blue click/tap circle. Pointer clicks do not leave a focus ring; keyboard navigation keeps a visible brown focus outline. Selected or pressed buttons must use an explicit app variant or page state such as `.active`, `.is-active`, or `[aria-pressed="true"]`—never the browser's default blue state. Native checkbox and radio accents also default to the app accent.

Do not remove `:focus-visible` without supplying another visible keyboard-focus treatment. When a specialized control overrides the universal outline, keep its replacement in the brown/neutral UI palette.

Use `ToggleButton` and `ToggleGroup` for choices that switch immediately. The `active` prop supplies `aria-pressed`; when `role="tab"` is used, it supplies `aria-selected` instead. Use `segmented` for mutually exclusive choices such as List/Calendar.

```tsx
import { ToggleButton, ToggleGroup } from "../ui";

<ToggleGroup segmented aria-label="View">
  <ToggleButton active={view === "list"} onClick={() => setView("list")}>List</ToggleButton>
  <ToggleButton active={view === "calendar"} onClick={() => setView("calendar")}>Calendar</ToggleButton>
</ToggleGroup>
```

Toggle colors are semantic and include matching off, hover, on, focus, and disabled states. The selected state uses the brighter semantic tint while retaining the same text color as the unselected state; selection must not invert labels to white or darken the control.

The Events List/Calendar segmented switch intentionally preserves the original high-contrast exception: the selected side is solid brown with white text, and the unselected side is white with brown text.

| Variant | Color | Use |
| --- | --- | --- |
| `accent` | Brown | View modes, filters, tabs, and ordinary selections |
| `neutral` | Gray | Secondary display options with no positive or negative meaning |
| `success` | Green | Enabled, public, approved, or included states |
| `danger` | Red | Destructive, remove, block, or irreversible confirmation states |

Do not use green merely because a choice is selected or red merely to attract attention. Visibility checkboxes use the success color when checked. Delete-associated toggles use danger. Every other selection defaults to accent.

## Forms

Use `FormField` to connect labels, hints, validation messages, required state, and controls. Use `TextInput`, `Select`, `Textarea`, and `Checkbox` instead of styling native controls per page.

```tsx
import { Button, FormField, Select, Stack, TextInput } from "../ui";

<Stack gap="4">
  <FormField label="Event name" required error={errors.name}>
    <TextInput value={name} onChange={(event) => setName(event.target.value)} />
  </FormField>

  <FormField label="Category" hint="Used by public event filters.">
    <Select value={category} onChange={(event) => setCategory(event.target.value)}>
      <option value="">None</option>
      <option value="show">Show</option>
    </Select>
  </FormField>

  <Button variant="primary" type="submit">Save</Button>
</Stack>
```

Validation belongs in the page or form hook. The UI layer displays `error` and automatically supplies `aria-invalid` and `aria-describedby`.

Every visible add-action label starts with `+ Add`, including add media, replies, dates, Q days, episodes, photos, playlists, and timeline items. Use `variant="add"` for all of them. Do not use the insertion color for an add action.

When an action sits beside an input, align the row with `align-items: center` or `align-items: end`. The action may match the control height or use the smaller shared size, but it must remain vertically centered against the input. Destructive X/remove controls use `variant="danger"`. Project metadata and YouTube playlist rows use the compact 30px `✕` control centered within the input height.

`FocalPointPicker`, exported from `src/ui`, is the universal Display Focus control for both Event photos and Project artwork. Keep Focus Top, Focus Center, and Focus Lower in one equal-width row; page-specific form CSS may change only the preview aspect ratio, not the controls or presets.

Display Focus preset labels use compact responsive type and 4px horizontal padding so all three labels remain inside their equal-width buttons without wrapping or overflow.

## Filters

Use `FilterBar`, `FilterRow`, `FilterField`, and `FilterDivider`. Filters use compact versions of the normal controls, stack on narrow screens, and remain visually open without a background or enclosing box. The Events filter is the baseline: `FilterField` owns its label typography and the 6px label-to-control spacing, while `FilterBar` owns the 8px group spacing and 24px spacing below the filters. On narrow screens, every label/control pair remains grouped and centered; do not push the label and control to opposite page edges. Do not restyle those details per page. If a page truly needs a contained filter panel, compose it inside `Card` explicitly.

```tsx
import { FilterBar, FilterDivider, FilterField, Select, TextInput } from "../ui";

<FilterBar>
  <FilterField label="Search">
    <TextInput value={query} onChange={onQueryChange} placeholder="Name, #, KW" />
  </FilterField>
  <FilterDivider />
  <FilterField label="Sort">
    <Select value={sort} onChange={onSortChange}>
      <option value="newest">Newest first</option>
      <option value="oldest">Oldest first</option>
    </Select>
  </FilterField>
</FilterBar>
```

The Events page is the reference implementation.

## Badges

`Badge` is for short, read-only metadata and status—not actions. Variants are `neutral`, `accent`, `info`, `success`, `warning`, and `danger`.

```tsx
<Badge variant="accent">FAN EVENT</Badge>
<Badge variant="success">Public</Badge>
<Badge variant="warning">Draft</Badge>
```

Clickable keyword and hashtag badges remain a specialized event component because they contain copy and search actions.

## Cards and layout

Use `Card` for a bordered surface, `CardGrid` for responsive collection pages, `Stack` for vertical rhythm, and `Inline` for wrapping horizontal groups.

```tsx
<Card>
  <Stack gap="3">
    <h2>Event title</h2>
    <Inline gap="2">
      <Badge>Show</Badge>
      <Badge variant="success">Public</Badge>
    </Inline>
  </Stack>
</Card>
```

Supported gaps are `1` (4px), `2` (8px), `3` (12px), and `4` (16px).

### Responsive card collections

Use `CardGrid` for grids of Projects-sized cards. Projects is the reference implementation and defines the universal card sizing and page-edge rhythm: three columns with a 20px gap, two columns with a 14px gap at 640px and below, and one column with a 16px gap at 320px and below. Grid padding is 16px on desktop, 12px on standard mobile, and 16px in the single-column layout.

```tsx
import { CardGrid } from "../ui";

<CardGrid>
  {items.map((item) => <CollectionCard key={item.id} item={item} />)}
</CardGrid>
```

Do not create a page-specific `auto-fill` grid for these cards; it causes card widths and page padding to diverge between pages at narrow viewport widths. Projects and Specials are the reference implementations.

## Feedback and empty states

Use `Alert` for inline information, success, warnings, and errors. Use `EmptyState` when a whole list or section has no content.

```tsx
<Alert variant="error" title="Could not save">Try again in a moment.</Alert>

<EmptyState
  icon="📅"
  title="No events found"
  action={<Button onClick={clearFilters}>Clear filters</Button>}
>
  Try changing the date range or category.
</EmptyState>
```

## Carousel controls

Wrap the media and controls in `.media-carousel`. The component owns arrows, dots, boundary behavior, labels, focus, and active state.

```tsx
import { CarouselControls } from "../ui";
import "../styles/MediaCarousel.css";

<div className="media-carousel">
  <img src={photos[index].url} alt="Event" />
  <CarouselControls
    index={index}
    total={photos.length}
    onChange={setIndex}
    itemLabel="Photo"
  />
</div>
```

Do not create new inline arrow or dot styles. Instagram media and event photos are the reference implementation.

## Relationship charts

Relationship charts use a preserved subsystem built on the same UI tokens but with dedicated warm-paper surfaces, chart geometry, character-card sizes, data-color semantics, interaction states, editor panels, and export rules. Do not rebuild these parts as page-specific cards or controls.

See [relationship-chart-ui.md](relationship-chart-ui.md) for the canonical palette, anatomy, responsive behavior, accessibility states, export rules, and the CSS/geometry synchronization contract.

## Event and social content cards

Event cards, PostCard, the X/Twitter embed and fallback, the Instagram archive/post mimic, and the Instagram Broadcast Channel mimic are reusable composite patterns. They share the universal content-card shell while preserving authentic platform-specific anatomy and colors.

Import them from `src/ui/patterns/contentCards.ts`. See [content-card-ui.md](content-card-ui.md) for ownership boundaries, tokens, anatomy, responsive behavior, and platform rules.

## Drag to reorder

Use `DragHandle` as the visible and accessible drag affordance. Its compact warm, fully rounded outlined pill is based on the original Specials timeline control and is the app default, including Manage Display. It opts out of generic form-button styling. Its background, border, and text colors remain unchanged on hover, press, and drag; only the cursor changes. Use `reorderItems` to perform immutable list movement.

```tsx
import { DragHandle, reorderItems } from "../ui";

<DragHandle
  label={`Reorder ${item.name}`}
  onDragStart={() => setDraggedIndex(index)}
  onDragEnd={() => setDraggedIndex(null)}
/>

// In the drop handler:
setItems((current) => reorderItems(current, draggedIndex, targetIndex));
```

The row remains responsible for `onDragOver` and `onDrop`, because drop placement differs by screen. Show a visible insertion state on the row and disable the handle while saving.

## Pagination

Timeline, Events, and Manage Display share `pagination-bar`, `pagination-controls`, `pagination-btn`, `pagination-jump`, and `jump-to-input`. Prev/Next are outlined brown controls. The compact “Jump to:” number field submits on Enter or blur; do not add a separate Go button or page-specific sizing. Add `pagination-bar--inline` when the identical controls should stay on one row, as they do in Manage Display. Pagination inside a form must retain these public-page styles instead of inheriting form button, label, or input treatments.

When a drag handle is positioned inside a card, reserve the handle width plus at least 16px of clear space before a thumbnail or other card content. The handle must never overlap or visually touch the thumbnail.

## Navigation, pagination and floating actions

- `ButtonLink` is a router `Link` styled as a `Button` (same `variant`/`size`). Never wrap a `<button>` in a `Link`.
- `Pagination` renders the shared `pagination-bar`; pages pass state and handlers, not markup. Use `inline` for the one-row form.
- `FloatingActionButton` / `FloatingActionLink` are the round "+" create controls; always pass `label`.
- `DropIndicator` is the insertion bar for drag-to-reorder rows (use `compact` for tight lists).

## Tokens

Shared colors, spacing, radii, focus rings, and shadows are CSS custom properties prefixed with `--ui-` in `src/styles/UI.css`. Prefer those tokens in new component styles.

## Legacy migration map

Migrate existing classes incrementally when touching their screens:

| Existing pattern | Replacement |
| --- | --- |
| `.btn-edit`, `.manage-authors-row-edit` | `<Button variant="primary" size="small">` (every "Edit" action is `primary`; size follows its row) |
| `.btn-delete`, `.manage-display-delete` | `<Button variant="danger" size="small">` |
| `.form-primary-submit`, `.archive-save-btn` | `<Button variant="primary" type="submit">` |
| `.archive-cancel-btn` | `<Button variant="secondary">` (`.pagination-btn` lives only inside `<Pagination>`) |
| `<Link><button/></Link>`, `.fab-button` | `<ButtonLink>`, `<FloatingActionLink>` / `<FloatingActionButton>` |
| Per-page drop bars, pagination markup | `<DropIndicator>`, `<Pagination>` |
| Form labels, inputs, hints, validation text | `<FormField>` + a shared control |
| `.filter-bar`, `.filter-group`, `.filter-divider` | `<FilterBar>`, `<FilterField>`, `<FilterDivider>` |
| Read-only category/status pills | `<Badge>` |
| One-off bordered panels | `<Card>` with `<Stack>` / `<Inline>` |
| Project/Special-style card collections | `<CardGrid>` |
| Page-specific error or empty messages | `<Alert>` / `<EmptyState>` |
| `.eventcard-photo-*`, inline Instagram arrows/dots | `<CarouselControls>` |
| `.manage-authors-drag-handle`, `.r2-drag-handle` | `<DragHandle>` + `reorderItems` |

Avoid a sweeping visual migration. Convert a complete interaction at a time and verify desktop, mobile, keyboard focus, disabled state, and loading state.
