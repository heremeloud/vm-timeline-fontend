import EventTagAnchor from "./EventTagAnchor";
import { getEventTagLinkPath } from "../utils/eventTagLinkPath";
import { keywordPattern } from "../utils/eventTagLinks";
import type { EventTagLink } from "../utils/eventTagLinks";

function normalizeTag(tag = ""): string {
    return tag.trim().replace(/^#/, "").toLocaleLowerCase();
}

export default function EventLinkedText({ text, eventTagLinks = [] }: { text?: string | null; eventTagLinks?: EventTagLink[] }) {
    if (!text || eventTagLinks.length === 0) return text ?? null;

    const hashtagLinks = eventTagLinks.filter((link) => link.kind !== "keyword");
    const keywordLinks = eventTagLinks.filter((link) => link.kind === "keyword");
    const eventByTag = new Map(
        hashtagLinks.map((link) => [normalizeTag(link.hashtag), link])
    );
    const keywordRegexes = keywordLinks.map((link) => ({ link, regex: keywordPattern(link.hashtag) }));
    const splitter = new RegExp(
        [...keywordRegexes.map(({ regex }) => `(${regex.source})`), "(#[\\p{L}\\p{M}\\p{N}_]+)"].join("|"),
        "giu",
    );
    const parts = text.split(splitter).filter((part): part is string => part !== undefined);

    return parts.map((part, index) => {
        const keywordMatch = keywordRegexes.find(({ regex }) => new RegExp(`^${regex.source}$`, "iu").test(part));
        const match = keywordMatch ? keywordMatch.link : part.startsWith("#") ? eventByTag.get(normalizeTag(part)) : null;
        if (!match) return part;
        const { event, projectId, projectEntryType, projectEntryNumber } = match;
        const hasProjectEntry = Boolean(projectId && projectEntryType && Number.isFinite(projectEntryNumber));
        const destination = getEventTagLinkPath(match);

        return (
            <EventTagAnchor
                key={`${event.id}-${index}`}
                to={destination}
                className="post-event-tag-link"
                title={hasProjectEntry ? "View related posts" : projectId ? "View related project" : `View event: ${event.name}`}
            >
                {part}
            </EventTagAnchor>
        );
    });
}
