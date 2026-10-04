import type { ProjectEntryType } from "../routes";
import type { EventTagEntry, Post, ProjectEntryLink } from "../types/models";

export type EventTagIndex = Map<string, EventTagEntry[]>;

export interface EventTagLink {
    /** The hashtag, or for `kind: "keyword"` the event keyword as it should be matched in the text. */
    hashtag: string;
    kind?: "hashtag" | "keyword" | "entry";
    event: EventTagEntry;
    projectId?: number | null;
    projectEntryType?: ProjectEntryType | null;
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

/** The project's own base-hashtag entry, as opposed to its episode, filming-day, fitting or workshop entries. */
function isBaseProjectEntry(entry: EventTagEntry) {
    return Boolean(entry.is_project && !entry.is_episode && !entry.is_filming_day && !entry.is_fitting_workshop);
}

/** Which related-posts page an index entry belongs to, if it is a project's Q/EP/fitting/workshop entry. */
function projectEntryOf(entry: EventTagEntry): { type: ProjectEntryType; number: number } | null {
    if (entry.is_filming_day) return { type: "filming", number: Number(entry.q_number) };
    if (entry.is_episode) return { type: "episodes", number: Number(entry.episode_number) };
    if (entry.is_fitting_workshop && entry.fitting_workshop_kind) {
        return { type: entry.fitting_workshop_kind, number: Number(entry.fitting_workshop_number) };
    }
    return null;
}

function normalizeTag(tag: string | null | undefined = "") {
    return String(tag || "").trim().replace(/^#/, "").toLocaleLowerCase();
}

/** Event keywords share the tag index under this prefix; a hashtag can never contain ":". */
const KEYWORD_KEY_PREFIX = "keyword:";

/** Index key of a project row (Q day, episode, fitting, workshop), whether or not it has a hashtag. */
export function projectEntryKey(projectId: number | string, type: string, number: number | string) {
    return `entry:${projectId}:${type}:${number}`;
}

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
        const projectEntry = projectEntryOf(event);
        if (projectEntry && event.project_id != null) {
            const entryKey = projectEntryKey(event.project_id, projectEntry.type, projectEntry.number);
            index.set(entryKey, [event]);
        }

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
        (entry) => entry.id != null && !entry.is_project && !projectEntryOf(entry),
    );
    if (matches.length === 0) return null;
    return [...matches].sort((a, b) => {
        const distanceDifference = distanceFromPost(a, referenceDate) - distanceFromPost(b, referenceDate);
        if (distanceDifference !== 0 && !Number.isNaN(distanceDifference)) return distanceDifference;
        return Number(a.id) - Number(b.id);
    })[0];
}

type TaggedPost = Pick<Post, "caption" | "caption_translation" | "caption_translation_note" | "timeline_context" | "show_timeline_context" | "posted_at" | "project_entry_links_json">;

/** Whether a link opens the event itself; links with a `projectId` open that project (or its Q/EP page) instead. */
export function linkOpensEvent(link: EventTagLink): boolean {
    return !link.projectId;
}

export interface LinkTarget {
    kind: "event" | "project" | "entry";
    label: string;
}

/** What a link opens, in words: an event, a project, or a project's Q/EP entry. */
export function describeLinkTarget(link: EventTagLink, eventTagIndex: EventTagIndex): LinkTarget {
    if (link.projectEntryType) return { kind: "entry", label: String(link.event.name || "Project entry") };
    if (link.projectId) {
        const project = [...eventTagIndex.values()].flat().find(
            (entry) => isBaseProjectEntry(entry) && String(entry.project_id) === String(link.projectId),
        );
        return { kind: "project", label: String(project?.name || `Project #${link.projectId}`) };
    }
    return { kind: "event", label: String(link.event.name || "Event") };
}

/** Links for the hashtags written in `text`. */
function hashtagLinksIn(text: string, post: Partial<TaggedPost>, eventTagIndex: EventTagIndex): EventTagLink[] {
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
        const projectOwningTag = matches.find(isBaseProjectEntry);
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
                // No event is near the post's date, so a hashtag that is also a project's base hashtag
                // belongs to that project, not to a far-away event that happens to reuse it.
                : nearbyMatches.length === 0 ? (projectOwningTag?.project_id ?? event.project_id) : null,
            projectEntryType: projectEntryOf(event)?.type ?? null,
            projectEntryNumber: projectEntryOf(event)?.number ?? null,
        });
    });

    return links;
}

/** Links for event keywords written in `text`; only the "Related Event / Project" text is searched for these. */
function keywordLinksIn(text: string, post: Partial<TaggedPost>, eventTagIndex: EventTagIndex): EventTagLink[] {
    const links: EventTagLink[] = [];
    eventTagIndex.forEach((matches, key) => {
        const keyword = key.startsWith(KEYWORD_KEY_PREFIX) ? matches[0]?.keyword?.trim() : null;
        if (!keyword || !keywordPattern(keyword).test(text)) return;
        const event = [...matches].sort((a, b) => {
            const distanceDifference = distanceFromPost(a, post.posted_at) - distanceFromPost(b, post.posted_at);
            if (distanceDifference !== 0 && !Number.isNaN(distanceDifference)) return distanceDifference;
            return (a.id || 0) - (b.id || 0);
        })[0];
        links.push({ hashtag: keyword, kind: "keyword", event, projectId: null });
    });
    return links;
}

/** Links for the project rows the post was explicitly linked to in the post form. */
function entryLinksOf(post: Partial<TaggedPost>, eventTagIndex: EventTagIndex): EventTagLink[] {
    let items: unknown;
    try {
        items = JSON.parse(post.project_entry_links_json || "[]");
    } catch {
        return [];
    }
    if (!Array.isArray(items)) return [];
    const links: EventTagLink[] = [];
    (items as Partial<ProjectEntryLink>[]).forEach((item) => {
        if (item.project_id == null || !item.entry_type || item.entry_number == null) return;
        const entry = eventTagIndex.get(projectEntryKey(item.project_id, item.entry_type, item.entry_number))?.[0];
        if (!entry) return; // the project is hidden or the row was deleted
        links.push({
            hashtag: String(entry.name || `${item.entry_type} ${item.entry_number}`),
            kind: "entry",
            event: entry,
            projectId: item.project_id,
            projectEntryType: item.entry_type,
            projectEntryNumber: item.entry_number,
        });
    });
    return links;
}

export function getEventTagLinks(post: Partial<TaggedPost>, eventTagIndex: EventTagIndex | null | undefined, { includeHiddenTimelineContext = false } = {}): EventTagLink[] {
    if (!eventTagIndex?.size) return [];

    const relatedText = (includeHiddenTimelineContext || (post.show_timeline_context ?? false)) ? post.timeline_context : null;
    const captionText = [post.caption, post.caption_translation, post.caption_translation_note].filter(Boolean).join("\n");

    // A hashtag, a keyword, or a picked project row in "Related Event / Project" is the curator's explicit choice,
    // so when it links anywhere it replaces whatever the caption's own hashtags would link to.
    const relatedConsidered = includeHiddenTimelineContext || (post.show_timeline_context ?? false);
    const relatedLinks = [
        ...(relatedText ? [...hashtagLinksIn(relatedText, post, eventTagIndex), ...keywordLinksIn(relatedText, post, eventTagIndex)] : []),
        ...(relatedConsidered ? entryLinksOf(post, eventTagIndex) : []),
    ];
    if (relatedLinks.length > 0) return relatedLinks;
    return hashtagLinksIn(captionText, post, eventTagIndex);
}
