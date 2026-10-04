import type { EventTagEntry, Post } from "../types/models";

export type EventTagIndex = Map<string, EventTagEntry[]>;

export interface EventTagLink {
    /** The hashtag, or for `kind: "keyword"` the event keyword as it should be matched in the text. */
    hashtag: string;
    kind?: "hashtag" | "keyword";
    event: EventTagEntry;
    projectId?: number | null;
    projectEntryType?: "filming" | "episodes" | null;
    projectEntryNumber?: number | null;
}

const EXCLUDED_IDENTITY_TAGS = new Set([
    "viewmim",
    "วิวมิ้ม",
    "vimmy",
    "viewbenyapa",
    "วิวเบญญาภา",
    "สระอิของวว",
    "mimrattanawadee",
    "มิ้มรัตนวดี",
    "ด้อมเป็ดจิ๋ว",
]);

const PHYSICAL_EVENT_CATEGORIES = new Set([
    "event",
    "fan event",
]);

const NEARBY_EVENT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

function normalizeTag(tag: string | null | undefined = "") {
    return String(tag || "").trim().replace(/^#/, "").toLocaleLowerCase();
}

/** Event keywords share the tag index under this prefix; a hashtag can never contain ":". */
const KEYWORD_KEY_PREFIX = "keyword:";

function normalizeKeyword(keyword: string | null | undefined = "") {
    return String(keyword || "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

/** Matches a keyword as a whole phrase, ignoring case and spacing, never inside a longer word. */
export function keywordPattern(keyword: string): RegExp {
    const escaped = keyword.trim().split(/\s+/).map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+");
    return new RegExp(`(?<![\\p{L}\\p{M}\\p{N}_])${escaped}(?![\\p{L}\\p{M}\\p{N}_])`, "giu");
}

function parseDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? null : date;
}

function distanceFromPost(event: EventTagEntry, postDate: string | null | undefined): number {
    const post = parseDate(postDate);
    if (post && event.dates?.length) {
        return Math.min(...event.dates.map(parseDate).filter((date): date is Date => date !== null).map(date => Math.abs(date.getTime() - post.getTime())));
    }
    const start = parseDate(event.start_date || event.event_date);
    const end = parseDate(event.end_date) || start;

    if (!post || !start) return Number.POSITIVE_INFINITY;
    if (post < start) return start.getTime() - post.getTime();
    if (end && post > end) return post.getTime() - end.getTime();
    return 0;
}

export function buildEventTagIndex(events: EventTagEntry[] = []): EventTagIndex {
    const index: EventTagIndex = new Map();

    events.forEach((event) => {
        const keyword = normalizeKeyword(event.keyword);
        if (keyword && !event.is_project) {
            const keywordKey = `${KEYWORD_KEY_PREFIX}${keyword}`;
            index.set(keywordKey, [...(index.get(keywordKey) || []), event]);
        }

        const tagsByName = new Map<string, string[]>();
        const globalTags = new Set<string>();
        (event.tags || []).forEach((tag) => {
            const normalized = normalizeTag(tag);
            if (normalized) {
                globalTags.add(normalized);
                tagsByName.set(normalized, event.dates || []);
            }
        });
        (event.date_items || []).forEach((item) => {
            const normalized = normalizeTag(item.hashtag);
            if (!normalized || globalTags.has(normalized)) return;
            const dates = tagsByName.get(normalized) || [];
            tagsByName.set(normalized, [...dates, item.date].filter(Boolean));
        });

        tagsByName.forEach((dates, normalized) => {
            if (EXCLUDED_IDENTITY_TAGS.has(normalized)) return;

            const matches = index.get(normalized) || [];
            matches.push(dates.length ? { ...event, dates: [...new Set(dates)] } : event);
            index.set(normalized, matches);
        });
    });

    return index;
}

/**
 * The event (not a project, filming day or episode) that owns a hashtag, for linking a
 * project's Q/EP row to its event page. With several matches the one closest to
 * `referenceDate` wins, then the lowest id.
 */
export function findEventForHashtag(index: EventTagIndex | null | undefined, hashtag: string | null | undefined, referenceDate?: string | null): EventTagEntry | null {
    const matches = (index?.get(normalizeTag(hashtag)) || []).filter(
        (entry) => entry.id != null && !entry.is_project && !entry.is_filming_day && !entry.is_episode,
    );
    if (matches.length === 0) return null;
    return [...matches].sort((a, b) => {
        const distanceDifference = distanceFromPost(a, referenceDate) - distanceFromPost(b, referenceDate);
        if (distanceDifference !== 0 && !Number.isNaN(distanceDifference)) return distanceDifference;
        return Number(a.id) - Number(b.id);
    })[0];
}

type TaggedPost = Pick<Post, "caption" | "caption_translation" | "caption_translation_note" | "timeline_context" | "show_timeline_context" | "posted_at">;

export function getEventTagLinks(post: Partial<TaggedPost>, eventTagIndex: EventTagIndex | null | undefined, { includeHiddenTimelineContext = false } = {}): EventTagLink[] {
    if (!eventTagIndex?.size) return [];

    const text = [
        post.caption,
        post.caption_translation,
        post.caption_translation_note,
        (includeHiddenTimelineContext || (post.show_timeline_context ?? false)) ? post.timeline_context : null,
    ].filter(Boolean).join("\n");
    const hashtags = text.match(/#[\p{L}\p{M}\p{N}_]+/gu) || [];
    const seen = new Set<string>();
    const links: EventTagLink[] = [];

    hashtags.forEach((hashtag) => {
        const normalized = normalizeTag(hashtag);
        if (seen.has(normalized) || EXCLUDED_IDENTITY_TAGS.has(normalized)) return;
        seen.add(normalized);

        const matches = eventTagIndex.get(normalized);
        if (!matches?.length) return;

        // Event hashtags take priority. Project and episode hashtags are a
        // fallback when this hashtag does not identify an event.
        const eventMatches = matches.filter((event) => !event.is_project);
        const eligibleMatches = eventMatches.length > 0 ? eventMatches : matches;

        const nearbyMatches = eligibleMatches.filter(
            (event) => distanceFromPost(event, post.posted_at) <= NEARBY_EVENT_WINDOW_MS
        );
        const nearbyPhysicalMatches = nearbyMatches.filter((event) =>
            PHYSICAL_EVENT_CATEGORIES.has((event.category || "").trim().toLocaleLowerCase())
        );
        const candidates =
            nearbyPhysicalMatches.length > 0
                ? nearbyPhysicalMatches
                : nearbyMatches.length > 0
                  ? nearbyMatches
                  : eligibleMatches;
        const event = [...candidates].sort((a, b) => {
            const distanceDifference =
                distanceFromPost(a, post.posted_at) - distanceFromPost(b, post.posted_at);
            if (distanceDifference !== 0) return distanceDifference;
            return (a.id || 0) - (b.id || 0);
        })[0];

        links.push({
            hashtag,
            event,
            projectId: event.is_project
                ? event.project_id
                : nearbyMatches.length === 0 ? event.project_id : null,
            projectEntryType: event.is_filming_day ? "filming" : event.is_episode ? "episodes" : null,
            projectEntryNumber: event.is_filming_day
                ? Number(event.q_number)
                : event.is_episode ? Number(event.episode_number) : null,
        });
    });

    // An event keyword typed into "Related Event / Project" links the post to that event.
    const relatedText = (includeHiddenTimelineContext || (post.show_timeline_context ?? false)) ? post.timeline_context : null;
    if (relatedText) {
        eventTagIndex.forEach((matches, key) => {
            const keyword = key.startsWith(KEYWORD_KEY_PREFIX) ? matches[0]?.keyword?.trim() : null;
            if (!keyword || !keywordPattern(keyword).test(relatedText)) return;
            const event = [...matches].sort((a, b) => {
                const distanceDifference = distanceFromPost(a, post.posted_at) - distanceFromPost(b, post.posted_at);
                if (distanceDifference !== 0 && !Number.isNaN(distanceDifference)) return distanceDifference;
                return (a.id || 0) - (b.id || 0);
            })[0];
            links.push({ hashtag: keyword, kind: "keyword", event, projectId: null });
        });
    }

    return links;
}
