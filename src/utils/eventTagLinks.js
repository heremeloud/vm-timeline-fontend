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

function normalizeTag(tag = "") {
    return tag.trim().replace(/^#/, "").toLocaleLowerCase();
}

function parseDate(value) {
    if (!value) return null;
    const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? null : date;
}

function distanceFromPost(event, postDate) {
    const post = parseDate(postDate);
    const start = parseDate(event.start_date || event.event_date);
    const end = parseDate(event.end_date) || start;

    if (!post || !start) return Number.POSITIVE_INFINITY;
    if (post < start) return start.getTime() - post.getTime();
    if (end && post > end) return post.getTime() - end.getTime();
    return 0;
}

export function buildEventTagIndex(events = []) {
    const index = new Map();

    events.forEach((event) => {
        (event.tags || []).forEach((tag) => {
            const normalized = normalizeTag(tag);
            if (!normalized || EXCLUDED_IDENTITY_TAGS.has(normalized)) return;

            const matches = index.get(normalized) || [];
            matches.push(event);
            index.set(normalized, matches);
        });
    });

    return index;
}

export function getEventTagLinks(post, eventTagIndex) {
    if (!eventTagIndex?.size) return [];

    const text = [
        post.caption,
        post.caption_translation,
        post.caption_translation_note,
    ].filter(Boolean).join("\n");
    const hashtags = text.match(/#[\p{L}\p{M}\p{N}_]+/gu) || [];
    const seen = new Set();
    const links = [];

    hashtags.forEach((hashtag) => {
        const normalized = normalizeTag(hashtag);
        if (seen.has(normalized) || EXCLUDED_IDENTITY_TAGS.has(normalized)) return;
        seen.add(normalized);

        const matches = eventTagIndex.get(normalized);
        if (!matches?.length) return;

        const nearbyMatches = matches.filter(
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
                  : matches;
        const event = [...candidates].sort((a, b) => {
            const distanceDifference =
                distanceFromPost(a, post.posted_at) - distanceFromPost(b, post.posted_at);
            if (distanceDifference !== 0) return distanceDifference;
            return (a.id || 0) - (b.id || 0);
        })[0];

        links.push({
            hashtag,
            event,
            projectId: nearbyMatches.length === 0 ? event.project_id : null,
        });
    });

    return links;
}
