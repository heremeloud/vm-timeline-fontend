import type { Id } from "./types/models";

type RouteId = Id | string;

/** Which list of a series a related-posts page belongs to. */
export type ProjectEntryType = "filming" | "episodes" | "fitting" | "workshop" | "prep";

export const ROUTES = {
    home: "/",
    archive: "/archive",
    events: "/events",
    eventView: (slug: string) => `/events/view/${slug}`,
    eventDetail: (id: RouteId) => `/events/${id}`,
    projects: "/projects",
    projectDetail: (id: RouteId) => `/projects/${id}`,
    projectRelatedPosts: (id: RouteId, entryType: ProjectEntryType, entryNumber: RouteId) =>
        `/projects/${id}/${entryType}/${entryNumber}`,
    createProject: "/create-project",
    editProject: (id: RouteId) => `/edit-project/${id}`,
    admin: "/admin",
    manageDisplay: "/manage-display",
    manageAuthors: "/manage-authors",
    topics: "/specials",
    topicDetail: (id: RouteId) => `/specials/${id}`,
    createTopic: "/create-special",
    editTopic: (id: RouteId) => `/edit-special/${id}`,
    postDetail: (id: RouteId) => `/post/${id}`,
    createPost: "/create-post",
    editPost: (id: RouteId) => `/edit-post/${id}`,
    addReply: (id: RouteId) => `/add-reply/${id}`,
    createEvent: "/create-event",
    editEvent: (id: RouteId) => `/edit-event/${id}`,
};
