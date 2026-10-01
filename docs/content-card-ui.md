# Event and social content card UI

Event cards, timeline post cards, and platform-mimic cards are composite patterns in the local UI library. They are intentionally higher-level than `Card`: they own content structure, platform behavior, embeds, translations, replies, admin controls, and responsive media.

Import the canonical implementations from `src/ui/patterns/contentCards.js`. Do not copy their markup into a page.

```jsx
import {
  EventCardPattern,
  PostCardPattern,
  InstagramPostPattern,
  BroadcastChannelPattern,
  TwitterEmbedPattern,
  TwitterFallbackPattern,
} from "../ui/patterns/contentCards";
```

## Shared content-card shell

`EventCardPattern` and `PostCardPattern` both use `.ui-content-card`. Its values are tokens in `src/styles/UI.css`:

| Token | Default | Purpose |
| --- | --- | --- |
| `--ui-content-card-width` | `550px` | Canonical maximum card width |
| `--ui-content-card-padding` | `20px` | Desktop internal padding |
| `--ui-content-card-radius` | `12px` | Outer radius |
| `--ui-content-card-border` | `#e5e5e5` | Outer border |
| `--ui-content-card-surface` | `#fff` | Card surface |
| `--ui-content-card-shadow` | subtle neutral shadow | Card elevation |

Cards have a 40px bottom rhythm. At 640px and below they use 12px page-edge space and 16px internal padding. Platform cards inside PostCard remain bounded by the available inner width.

## Event card

Canonical component: `EventCardPattern` / `components/EventCard.jsx`.

An event card owns:

1. Category and optional subcategory.
2. Admin public-visibility control.
3. Linked title and optional English title.
4. Project or press-tour relationship.
5. Date/location metadata.
6. Keyword row first, hashtag row second.
7. Active-date keyword/hashtag state synchronized with the photo carousel.
8. Event photos using shared carousel controls.
9. Live media and per-media metadata.
10. Participants and admin actions.

Do not display all date-specific keywords and hashtags simultaneously. Multi-date cards show the metadata associated with the active photo. Keywords remain on their own first row. Carousel controls come from `CarouselControls`.

## Timeline post card

Canonical component: `PostCardPattern` / `components/PostCard.jsx`.

PostCard is the routing shell for social content. It owns the platform/date line, admin visibility, embed selection, adult fallback, caption and translation blocks, timeline context, event-tag links, replies, and edit/delete actions. Platform selection is data-driven:

- `ig` or `instagram` → Instagram post pattern.
- Instagram plus `content_type="broadcast"` → Broadcast Channel pattern.
- `x` or `twitter` → X/Twitter embed or fallback pattern.
- `tt` or `tiktok` → TikTok embed.

Pages should pass a post object to PostCard instead of selecting a platform renderer themselves unless they are building a specialized preview.

## Platform identity tokens

Platform mimic colors are centralized in `UI.css`:

| Platform | Tokens and purpose |
| --- | --- |
| X/Twitter | `--ui-platform-x`, `-text`, `-muted`, `-border`, `-link` |
| Instagram | `--ui-platform-instagram`, `-text`, `-border`, `-link`, `-action`, `-action-hover` |
| Broadcast | `--ui-platform-broadcast-text`, `-muted`, `-border`, `-message` |
| TikTok | `--ui-platform-tiktok` |

Platform colors express source identity only. They must not replace semantic app colors for Save, Add, Insert, Delete, Public, warnings, or validation.

## X/Twitter pattern

`TwitterEmbedPattern` renders the official widget. `TwitterFallbackPattern` renders the archive/adult-safe approximation when an embed should not be shown.

The fallback uses Arial, X text/muted colors, a 48px avatar, a 12px radius, source link, pre-wrapped caption, translation, note, and bounded media. It must remain recognizable without copying interactive X controls that are not functional.

## Instagram post pattern

`InstagramPostPattern` supports the official embed and the archive/manual rendering. The archive rendering owns:

- 34px circular avatar and username header.
- Optional profile action.
- Contained image/video or shared story carousel.
- Current-media counter.
- Caption with preserved whitespace and Instagram-colored hashtags.
- Translation and note blocks supplied by PostCard.

The archive card has a 540px inner maximum, a white surface, thin Instagram-neutral border, and square-ish 3px radius. Do not apply the app's 12px outer-card radius to the embedded Instagram mimic.

## Broadcast Channel pattern

`BroadcastChannelPattern` renders a contained channel header followed by message entries. It uses a 48px avatar, source link, transcript disclosure, bounded attachment media, translation divider, and note. Messages stay centered with a 460px maximum inside the 550px platform shell.

Broadcast is an Instagram source, so its platform dot uses Instagram pink, but its message surfaces use neutral Broadcast tokens rather than Instagram action purple.

## Responsive and interaction rules

- Outer Event/Post cards share one width, page edge, padding, border, radius, shadow, and vertical rhythm.
- Embedded platform cards use their own authentic inner radius and typography.
- Media never exceeds its card; videos and images use contained sizing where cropping would lose information.
- Instagram stories and event photo carousels use the same arrows and dots.
- Hover, focus, visibility, Save/Add/Insert/Delete, and disabled states come from shared UI rules.
- A platform color never serves as the only indication of state; labels and accessible attributes remain required.
- Admin-only controls must not change the public card's content spacing when hidden.

## Change checklist

- Reuse a pattern export rather than copying markup.
- Keep platform selection inside PostCard for normal timeline use.
- Update shared tokens instead of scattering new near-match colors.
- Verify public and admin states.
- Verify desktop, 640px mobile, long captions, translations, notes, multiple media, and missing avatars.
- Verify official-embed failure and archive/fallback rendering.
