# Post ordering rules

How top-level posts are ordered. Replies are separate (see the end). The single source of truth is
`_order_posts` in `vm-timeline-backend/routers/posts.py`; update this file when you change it.

## The rule

Two sorts exist: **Newest first** (the default) and **Oldest first**. For *Newest first*:

1. **Date**: `posted_at` (a plain `YYYY-MM-DD`, Bangkok date), newest day first.
2. **Within one day**, the day is either *date-only* or *exact*. A post's **time** is its exact time (`posted_at_utc`), or, for
   date-only content such as IG stories, the time entered as "N hours ago" (`estimated_posted_at_utc`):
   - A day is **mixed / date-only** if *any* top-level post on that date has **no time at all** (neither of the two,
     e.g. an IG story saved without the "ago" time). Every post on that day is then ordered by its manual `sort_order`,
     ascending. The times of the timed posts on that day are **ignored**.
   - A day is **exact** if *every* post on it has a time. Posts are ordered by that time, newest first.
3. **Tie-break**: higher `id` first.

*Oldest first* is the mirror image: oldest day first, manual order reversed (`sort_order` descending),
exact times oldest first, lower `id` first.

| Day contains | Order within the day (Newest first) |
| --- | --- |
| only posts with a time (exact, or an IG story's "ago" time) | by time, newest first |
| any post with no time at all (e.g. a story saved without the "ago" time) | manual `sort_order`, ascending (what you drag in Manage Display) |

## Manual order (`sort_order`)

- Set by dragging posts in **Manage Display → Posts**; posts only move within the same `posted_at` date
  (`POST /posts/admin/{id}/order`). The whole day is renumbered `0, 1, 2…`.
- A **new post** gets `first sort_order of that date - 1`, so it lands at the top of its day in *Newest first*.
- Dragging on an *exact* day changes `sort_order` but has no visible effect, because that day is sorted by time.
- With *Oldest first* selected, Manage Display flips the dragged position before saving, so the stored order stays
  the *Newest first* order.

## Where it applies

The **same** `_order_posts(query, "newest")` is used everywhere, so these always agree:

| Screen | Endpoint |
| --- | --- |
| Public timeline | `GET /posts/timeline` |
| Admin timeline and Manage Display → Posts | `GET /posts/admin` |
| Event page → Related Posts | `GET /posts/event/{id}` |
| Project / Q day / episode / fitting / workshop / prep → Related Posts | `GET /posts/project/{ref}/related` |

The event and project Related Posts pages have a **Newest first / Oldest first** toggle (`PostSortToggle`). Because *Oldest first* is the exact mirror of
*Newest first*, they reverse the backend's newest list (`utils/postOrder.ts`) instead of re-sorting. Apart from that, do not give a screen its own sort. Related lists are the timeline's order *filtered*, so two posts keep the same
relative order as on the timeline. The differences you may still see on a related page are not ordering:

- Posts that are hidden but ticked **On related page** are included there and slot in by date; the timeline omits them.
- The event page drops posts whose hashtag resolves to a different event for that date (`docs/event-project-linking.md`).

## Replies

Replies (`parent_id` set) are not part of the lists above. They are shown under their post in chronological order
(`_order_replies`: `posted_at_utc`, or the date at 00:00 Bangkok time if there is no exact time, then `id`).
