import { ROUTES } from "../routes";
import type { EventTagLink } from "./eventTagLinks";

/** The page a hashtag/keyword link opens: a project's Q/EP related posts, its project page, or the event. */
export function getEventTagLinkPath({ event, projectId, projectEntryType, projectEntryNumber }: EventTagLink): string {
    if (projectId && projectEntryType && Number.isFinite(projectEntryNumber)) {
        return ROUTES.projectRelatedPosts(projectId, projectEntryType, projectEntryNumber!);
    }
    return projectId ? ROUTES.projectDetail(projectId) : ROUTES.eventDetail(event.id ?? 0);
}
