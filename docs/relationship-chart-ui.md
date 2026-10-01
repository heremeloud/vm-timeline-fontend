# Relationship chart UI system

The relationship chart is a reusable visual subsystem built by `RelationshipChart.jsx`, styled by `RelationshipChart.css`, and backed by geometry and palette rules in `utils/relationshipChart.js`. Preserve these contracts when extending it; do not recreate chart chrome, cards, connection controls, or editor panels per project.

## Visual foundation

The chart uses a warm-paper visual language that is intentionally distinct from ordinary white app cards while still sharing the app's brown accent family. Its canonical CSS tokens live in `src/styles/UI.css`:

| Token | Default | Purpose |
| --- | --- | --- |
| `--ui-chart-surface` | `#fffcf6` | Main canvas, cards, dialog, group-label backing |
| `--ui-chart-surface-muted` | `#faf5ec` | Notes and low-emphasis panels |
| `--ui-chart-surface-soft` | `#f7eee4` | Secondary interactive surfaces |
| `--ui-chart-text` | `#614c45` | Primary chart text |
| `--ui-chart-text-muted` | `#88766d` | Descriptions, captions, and notes |
| `--ui-chart-accent` | `#a67c52` | Editor controls and neutral relationship fallback |
| `--ui-chart-accent-strong` | `#806348` | Strong labels and editor summaries |
| `--ui-chart-accent-soft` | `#faf3ea` | Hover surfaces |
| `--ui-chart-eyebrow` | `#a46e67` | Eyebrow and detail labels |
| `--ui-chart-decoration` | `#b79980` | Decorative canvas copy |
| `--ui-chart-border` | `#eadbd2` | Main chart and panel borders |
| `--ui-chart-border-strong` | `#dfcbbc` | Controls and elevated panels |
| `--ui-chart-divider` | `#eddfd3` | Section dividers |
| `--ui-chart-grid` | `#e6d7c9` | Dotted canvas grid and editor fieldsets |
| `--ui-chart-focus` | `#977258` | Keyboard focus and linking state |
| `--ui-chart-backdrop` | `#34242166` | Modal backdrop |
| `--ui-chart-shadow` | `#38282033` | Elevated panel and handle shadows |

Use the tokens rather than introducing nearby raw browns or creams. Destructive chart-editor actions use the global danger button tokens, not chart accent colors.

## Relationship-data colors

Relationship and group colors carry data meaning and remain separate from UI chrome. `SWATCH_PRESETS` in `utils/relationshipChart.js` is the canonical palette:

| Meaning | Color |
| --- | --- |
| Romance | `#c78390` |
| Friendship | `#87a292` |
| Family | `#ab96ba` |
| Colleagues | `#7c98b3` |
| Rivalry | `#c28a50` |
| Unknown | `#92949c` |
| Neutral | `#a67c52` |
| Berry | `#a5527a` |
| Moss | `#7a8f5c` |
| Gold | `#c9a227` |

Do not repurpose these colors for Save, Delete, Add, or Insert actions. Connections and group enclosures may use user-selected colors; app controls may not infer action meaning from them.

## Anatomy and invariants

The chart is composed of:

1. Header — eyebrow, title, description, visibility state, expand, and export controls.
2. Toolbar — story/episode selection and editable actions.
3. Viewport — horizontally scrollable on small screens; never shrink the canvas until cards overlap.
4. Canvas — a 620px minimum dotted workspace with percentage-based character, group, and connection positions.
5. Character cards — framed portrait plus name, optional Thai name, and role.
6. Connections — line, optional arrows, clickable midpoint, label, history, and details.
7. Groups — colored enclosure, label, edge-margin controls, and resize handle.
8. Note/footer — version context and export attribution.
9. Editor surfaces — side panel/popover, fields, swatches, visibility controls, and semantic action buttons.

Keep UI controls out of exported images. Export rendering intentionally skips editor hints, resize handles, visibility controls, side panels, and other authoring-only elements.

## Character sizing

CSS and geometry must stay synchronized. The canonical values are mirrored between `RelationshipChart.css` and `CARD_SIZES` in `utils/relationshipChart.js`:

| Size | Frame | Name | Role |
| --- | --- | --- | --- |
| Large | 148 × 152px | 18px | 14px |
| Medium | 120 × 124px | 16px | 13px |
| Small | 96 × 100px | 14px | 12px |

The compact scale is `0.82`. Wide containers progressively scale cards from `1.25` to `2.45`; exports use the same scaling system. Any card-dimension change must update both CSS and `CARD_SIZES`, then rerun geometry tests.

The rounded-square SVG frame is the universal default. The loaf frame is a deliberate project-level variant activated only with `.frame-loaf`; do not make it the default.

## Interaction states

- Pointer hover lifts character frames by 3px.
- Keyboard focus uses `--ui-chart-focus`; pointer clicks suppress the browser focus flash.
- Linking uses the same focus color with a 3px outline.
- Focusing a character or relationship dims unrelated cards to `0.3` and lines to `0.18`.
- Relationship labels appear on hover, keyboard focus, or revealed state.
- Selected swatches and symbols must expose state with `aria-pressed` or the existing selected class in addition to color.
- Checkboxes use the chart accent unless their meaning is Public/Enabled or Destructive, which follow the shared semantic toggle rules.
- Remove/Delete uses the shared danger treatment; Save uses the shared save treatment.

## Responsive behavior

At 520px and below, header and toolbar spacing tighten, fields become one column, decorations hide, and the canvas uses the `0.82` compact scale. The viewport remains scrollable so relationships retain their geometry. Do not replace this with a fluid canvas that compresses cards into one another.

## Extension checklist

- Reuse the existing chart, editor, and popover classes.
- Use `--ui-chart-*` tokens for chrome and `SWATCH_PRESETS` for relationship data.
- Preserve keyboard focus, labels, and non-color state indicators.
- Keep CSS card dimensions synchronized with geometry constants.
- Verify view, edit, compact, expanded, and exported modes.
- Run relationship chart tests after geometry, episode-history, visibility, or export changes.
