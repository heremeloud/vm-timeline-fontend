# Event / project linking rules

How a post's hashtags and keywords turn into links to events and projects, and how the project, event and
admin screens show those links. The logic lives in `src/utils/eventTagLinks.ts` (what a post links to) and
`src/utils/eventTagLinkPath.ts` (where the link goes). Update this file when you change either.

## 1. The tag index

`GET /events/tag-index` (`routers/events.py`) returns one list that everything below is built from
(`buildEventTagIndex` turns it into a `Map`):

| Entry | Flags | Contributes |
| --- | --- | --- |
| Visible event | none | its `tags`, any per-date `date_items[].hashtag`, and its `keyword` |
| Project | `is_project` | the project's base hashtag |
| Project episode | `is_project`, `is_episode`, `episode_number` | the episode hashtag (EP1, EP2, …) |
| Project filming day | `is_project`, `is_filming_day`, `q_number` | the filming-day hashtag (Q1, Q2, …) |
| Project fitting / workshop | `is_project`, `is_fitting_workshop`, `fitting_workshop_kind`, `fitting_workshop_number` | the hashtag of a costume fitting (F1, F2, …) or workshop (W1, W2, …) |

- Tags are matched case-insensitively and without the `#`.
- Per-date hashtags on an event are indexed only for that date, so a date's tag points at that date.
- Identity tags (`#viewmim`, `#วิวมิ้ม`, `#vimmy`, …, see `EXCLUDED_IDENTITY_TAGS`) never link.
- Event keywords are stored in the same map under a `keyword:` prefix (a hashtag can never contain `:`).
- Hidden events and projects are not in the index.

## 2. What a post links to (`getEventTagLinks`)

Three text sources on a post:

1. **Caption text**: `caption`, `caption_translation`, `caption_translation_note`.
2. **Related Event / Project** (`timeline_context`): used only when "Show Related Event / Project" is ticked
   (`show_timeline_context`), or when the caller passes `includeHiddenTimelineContext` (event page, admin).
3. Hashtags are found in any source; **keywords are only searched for in Related Event / Project**.

### 2.1 Related Event / Project overrides the caption

If the Related Event / Project text contains a hashtag or event keyword that links to something, **only those
links are used and the caption's own hashtags are ignored** (they stay plain text). If that text links to
nothing (a plain note, an unknown hashtag), the caption's hashtags link as usual. If the text is hidden and the
caller doesn't include hidden text, it isn't an override.

### 2.2 Picking the target for a hashtag

For a hashtag with several index matches:

1. **Events beat projects.** Project, episode and filming-day entries are only used when no real event owns the tag.
2. **Nearby events.** An event is "nearby" when the post's date is within **14 days** of one of the event's
   dates (its `dates`, otherwise `start_date`–`end_date`).
3. Among nearby events, **physical events** (category `event` or `fan event`) win; then any nearby event;
   if none is nearby, all matches stay candidates.
4. The candidate **closest to the post's date** wins; ties go to the lowest id.
5. **Project fallback.** If no event is nearby, the link opens the **project** instead:
   the project whose base hashtag it is, otherwise the chosen event's own project.
   A far-away event that merely reuses a project's base hashtag does not get the link.
   Example: `#GirlRulesSeries` on a post from Nov 2024 links to the Girl Rules project, not to the Oct 2025 launch event.
6. A hashtag that is a project **episode**, **filming-day**, **fitting** or **workshop** hashtag links to that entry's related-posts page (Q / EP / F / W).

### 2.3 Linking to a project row explicitly (no hashtag needed)

A project row (fitting, workshop, Q day, episode) may have no hashtag or keyword. In the post form, **"Link to project rows"**
(`ProjectEntryPicker`) lets you tick rows of a series (labels F1, W2, Q5, EP3 with their dates), and the choice is saved on the post as
`project_entry_links_json` (`[{project_id, entry_type, entry_number}]`, normalized by the backend). Rules:

- A post can link to **several rows**; a day that is both a fitting and a workshop is just two ticks.
  Rows whose date equals the post's date are flagged **same date**, with a **Link all** button for them.
- These links count as the curator's explicit choice: like related-text hashtags they **replace the caption's own hashtag links**,
  and they apply under the same gate (the "Show Related Event / Project" box is ticked, or the caller counts hidden text).
- They open the row's related-posts page (`/projects/:id/<type>/:n`) and show as chips ("Girl Rules F1") on the post.
- Related-post lists and counts include them whether or not the row has a hashtag (`?entry_type=&entry_number=` on
  `/posts/project/:ref/related`; counts carry `<type>:<number>` keys, e.g. `fitting:1`). A post counts once per row.
- The tag index lists every project row (empty `tags` when it has no hashtag) so the frontend can name them.

### 2.4 Keywords

An event's `keyword` typed in Related Event / Project links the post to that event:

- whole-phrase match, case-insensitive, spaces collapsed, never inside a longer word;
- always opens the event (never a project);
- several events with the same keyword: nearest to the post's date, then lowest id;
- keywords in the caption do **not** link.

## 3. Where a link goes (`getEventTagLinkPath`)

| Link | Opens |
| --- | --- |
| Q/EP/F/W entry hashtag | `/projects/:id/filming/:q`, `/projects/:id/episodes/:ep`, `/projects/:id/fitting/:n` or `/projects/:id/workshop/:n` (related posts for that entry) |
| Project (base hashtag or far-event fallback) | `/projects/:id` |
| Event hashtag or keyword | `/events/:id` |

`linkOpensEvent(link)` is true only for the last row (no `projectId`).

## 4. Where links are shown

- **Post text**: `EventLinkedText` links hashtags and keywords inline in the caption, translation, note and the
  Related Event / Project box.
- **"Related events" chips** under a post: hashtags that aren't already inline (never keywords).
- **Project page** (`ProjectDetail`): the sections are **Fitting & Workshop** (F1, W1, …), **Filming Q Days** and **Episodes**.
  In each, the **Q** / **EP** / **F** / **W** number links to
  1. the event that owns the row's hashtag (`findEventForHashtag`: real events only, nearest to the filming/air date), else
  2. the related-posts page if any post uses the hashtag, else
  3. stays plain text.
  The Keyword column still just copies the keyword.
- **Related posts page** (`/projects/:id/filming|episodes|fitting|workshop/:n`): posts mentioning the row's hashtag anywhere in
  caption, translation, note or Related Event / Project text (the "show on related page" checkbox applies; the post's own Public/timeline visibility does not).
- **Event page** (`EventDetail`): "Related posts" lists posts whose link **opens this event**
  (`linkOpensEvent`), counting hidden Related Event / Project text. A post that links to the project instead
  (because the event is far from the post's date) is not listed.

## 5. Checkboxes

| Checkbox (post form) | Effect |
| --- | --- |
| Show "Related Event / Project" (`show_timeline_context`) | Shows the box and lets its hashtags/keywords link on the public post. Default **off**. |
| Show post on related event page (`show_on_related_page`) | Whether the post appears on public related-post lists (project Q/EP pages, event page) and their counts. Default **on**. It is independent of the "Public" toggle: **a post hidden from the public timeline still appears on related pages** unless this box is unticked. (A post whose author is hidden stays hidden everywhere.) |

## 6. Admin view (regardless of checkboxes)

Admins (a JWT in `localStorage`) see more:

- **Post card strip**: "Links to  `#tag` → Project entry / Project / Event: *name*", the name being a link to the
  page. A link that the public doesn't see (Related Event / Project is off) is marked *(hidden)*, and
  "Not listed on related pages" appears when `show_on_related_page` is off.
- **Project page**: a small count next to each Q/EP number, including posts hidden from the related page.
- **Related lists**: the Q/EP related-posts page and the event page include posts hidden from the related page.
  The backend endpoints take `include_hidden=true`
  (`/posts/event/:id`, `/posts/project/:ref/related`, `/posts/project/:ref/related-counts`)
  and answer **403** without a valid admin token; public calls are unchanged.

## 7. Where to change what

| To change… | Edit |
| --- | --- |
| Explicit project-row links (picker, storage, counts) | `components/ProjectEntryPicker.tsx`, `utils/projectEntries.ts`, `routers/posts.py` (`_normalize_project_entry_links`, related endpoints) |
| Which tags/keywords are indexed | `routers/events.py` (`get_event_tag_index`), `buildEventTagIndex` |
| Which event/project a hashtag picks, the 14-day window, the override rule | `getEventTagLinks` and helpers in `utils/eventTagLinks.ts` |
| Where a link opens | `utils/eventTagLinkPath.ts` |
| How links render in text | `components/EventLinkedText.tsx`, chips and admin strip in `components/PostCard.tsx` |
| Which posts a project or event page lists | `routers/posts.py` (`get_event_post_candidates`, `get_project_post_candidates`, `get_project_related_post_counts`), `pages/EventDetail.tsx` |

Tests for the rules are in `src/utils/eventTagLinks.test.ts`.

## 8. Fitting, workshop and prep days

Stored in `ProjectFittingWorkshop` (`kind` = `fitting` | `workshop` | `prep`, `number` unique per kind, `date`, `hashtag`, `keyword`).
`prep` is a day that is both a fitting and a workshop, or general preparation.

- **Names.** Visitors (related-posts page, post chips, admin strip, tag index, tooltips) see **Fitting Day 1**, **Workshop Day 2**,
  **Prep Day 1** (`projectEntryLabel`; Q days and episodes stay `Q5` / `EP3`); the project page's table uses the compact **D1** (below). The admin forms save space with **F / W / P**
  (`projectEntryShortLabel`: F1, W2, P1) in the project form and the post picker.
- **Optional columns.** Many of these days have no hashtag or keyword, so the project form has Hashtag / Keyword toggles
  (on when any row already has one) and the project page only shows those columns when some row has a value.
- **Layout.** On the project page a day shows as **D1** (`projectEntryDayLabel`), like Q1 and EP1; when the project has days of more than one
  type a letter tells them apart (**F D1**, **W D1**, **P D1**), and the tooltip / accessible name is the full "Fitting Day 1". The admin
  count circle sits right after the label; every label is a box of the same width (`--series-label-min`, as if padded with invisible space; only the text is underlined, and the characters are set slightly tighter), so the small circle starts at the same spot in every row of every table. The Fitting & Workshop, Filming Q Days and Episodes tables share one first-column width
  (`--series-index-col`), so their dates line up. The column, the label minimum width and the circle are all in `rem`/`em`, so they scale
  together with the reader's text size (fixed-pixel column widths clipped the circle at larger sizes).
- **Saving.** Edited in the project form above Filming Q Days (`SeriesMetadataFields`). Saving a project replaces only the
  collections the request sends (`filming_days`, `episode_metadata`, `fitting_workshops`); one left out is untouched.
- **Linking.** Rows with a hashtag link like Q/EP; rows without one are linked from the post form (see 2.3).

Backend tests: `tests/test_project_fitting_workshop.py`, `tests/test_event_related_posts.py`.

## 9. Related-post counts: how they are computed and cached

`GET /posts/project/:ref/related-counts` (`routers/posts.py`) feeds the numbers on the project page (the count circles are admin-only).

- **One pass, no N+1.** `_compute_related_counts` runs a fixed number of queries (the project's rows, then one query for the candidate posts that
  selects only the text columns), extracts each post's hashtags once, and looks them up in a dict of `hashtag -> rows`. The cost grows with
  the number of posts, not rows x posts, and the query count does not change with the number of rows or posts (covered by a test).
- **Server cache.** The answer is cached per process for 5 minutes, per project and per view (public / admin). Any write request (POST, PATCH,
  PUT, DELETE) clears it (`clear_related_counts_after_writes` in `main.py`). On the Vercel deployment the database is read-only and only changes
  with a deploy (see `on_startup`), so cached answers are always current there.
- **CDN cache.** The public answer is sent with `Cache-Control: public, max-age=0, s-maxage=300, stale-while-revalidate=60`, so Vercel's edge can
  answer without running the function (browsers always revalidate, so a local edit shows up at once). The admin answer (`include_hidden`) is
  `private, no-store` and always needs a valid admin token, even when the public answer is cached.
- **Frontend.** The project page asks for the admin counts when a token is present and falls back to the public counts if that request fails,
  so the Q / EP links never disappear. The circles themselves only show for a logged-in admin: the token is stored per site, so being logged in on
  `localhost` does not log you in on viewmim.info.

