# Search rules (events and projects)

How event and project search works and which parts the admin can change. The code is `vm-timeline-backend/search_rules.py`;
update this file when you change it.

## Where it applies

| Screen | Endpoint | Searches |
| --- | --- | --- |
| Events page (public) | `GET /events?name=` | name, English name, keyword, tags, date metadata |
| Manage Display → Events | `GET /events/admin?name=` and `/events/admin/count?name=` | same |
| Manage Display → Projects | `GET /projects/admin?name=` and `/projects/admin/count?name=` | title, original title, hashtag, category |

On Manage Display → Events the search combines with **Type** (category or category - subcategory), **Participants**
(ViewMim / View / Mim / Vimmy) and a **Start/End Date** range; the same filters apply to the list and its page count.

Manage Display → Posts has its own search (captions, translations, notes, URLs, replies) and is not covered here.

## The rules

1. **Word by word.** The text is split on spaces. *Every* word must be found somewhere in the item, in any order:
   `bangkok fan` finds "ViewMim Fan Meet Bangkok". A leading `#` is ignored, and case does not matter.
2. **Substring match.** A word matches when it appears inside any searched field (`fan` matches "Fan Meet"). Thai has no
   spaces between words, so Thai text is matched this way only.
3. **Typo tolerance.** A word of 4 or more letters also matches a *similar* word of the item (`bangkoc` finds "Bangkok").
   Shorter words must match exactly so that `fen` does not find "fan". The strictness is a setting:

   | Setting | Meaning |
   | --- | --- |
   | Off | exact (substring) matching only |
   | Normal (default) | about 80% similar |
   | Loose | about 70% similar; more typos forgiven, more false matches |

4. **Identity hashtags are ignored in tags.** Hashtags such as ViewMim and วิวมิ้ม are on almost every event, so matching
   them in tags would return everything (`mim` would find every event). They are skipped when searching an event's tags
   and its per-date hashtags, and a project's hashtag. They **still match in names and keywords**: an event named
   "วิวมิ้ม Birthday" is found by `วิวมิ้ม`. The same list also stops those hashtags from linking a post to an event
   (`utils/eventTagLinks.ts`, see `docs/event-project-linking.md`).
5. **Blank search** applies no filter.

## Limits and safety

- The text is cut to **100 characters** and **8 words**.
- The typed text never reaches SQL. Matching runs in Python over the stored text; the query is then filtered with
  `id IN (…)` using bound parameters. So `%`, `_` and quotes are plain text, and SQL injection is not possible through search.
- Because matching runs in Python, each search reads the searched columns of every event (or project). That is fine for
  hundreds of rows; revisit it if the tables grow into the tens of thousands.

## What the admin can edit

Manage Display → **Event Setup** → **Search rules**, saved by `PUT /search-settings` (admin only):

- **Identity hashtags**: one per line, with or without `#`. At most 50, 60 characters each, duplicates removed.
  "Restore default hashtags" fills in the built-in list.
- **Typo tolerance**: Off / Normal / Loose.

The settings are one row in the `searchsettings` table (`SearchSettings` in `models.py`). With no row saved, the built-in
defaults (`DEFAULT_IDENTITY_TAGS` in `search_rules.py`, mirrored by `DEFAULT_IDENTITY_TAGS` in `utils/eventTagLinks.ts`) apply.
`GET /search-settings` is public because the frontend reads the hashtag list on start-up (`App.tsx`) so hashtag links skip them.
A page that was already open keeps the old list until it reloads.

## When you add or change a rule

Change `search_rules.py`, add a case to `vm-timeline-backend/tests/test_search_rules.py`, and update this file.
