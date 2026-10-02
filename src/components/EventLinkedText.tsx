import { Link } from "react-router-dom";
import { ROUTES } from "../routes";
import type { EventTagLink } from "../utils/eventTagLinks";

function normalizeTag(tag = ""): string {
    return tag.trim().replace(/^#/, "").toLocaleLowerCase();
}

export default function EventLinkedText({ text, eventTagLinks = [] }: { text?: string | null; eventTagLinks?: EventTagLink[] }) {
    if (!text || eventTagLinks.length === 0) return text ?? null;

    const eventByTag = new Map(
        eventTagLinks.map((link) => [normalizeTag(link.hashtag), link])
    );
    const parts = text.split(/(#[\p{L}\p{M}\p{N}_]+)/gu);

    return parts.map((part, index) => {
        const match = part.startsWith("#") ? eventByTag.get(normalizeTag(part)) : null;
        if (!match) return part;
        const { event, projectId } = match;

        return (
            <Link
                key={`${event.id}-${index}`}
                to={projectId ? ROUTES.projectDetail(projectId) : ROUTES.eventDetail(event.id ?? 0)}
                className="post-event-tag-link"
                title={projectId ? "View related project" : `View event: ${event.name}`}
            >
                {part}
            </Link>
        );
    });
}
