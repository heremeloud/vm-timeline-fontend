import api from "./api";
import type { CountResponse, Event, EventDateItem, EventTagEntry, EventPhoto, Id, LiveMediaItem } from "../types/models";

export interface EventListParams {
    limit?: number;
    offset?: number;
    sort?: string;
    name?: string;
    category?: string;
    subcategory?: string;
    author?: string;
    visibleStart?: string;
    visibleEnd?: string;
}

/** Writable event fields; the API accepts arrays where the table stores JSON. */
export interface EventInput {
    name?: string;
    english_name?: string | null;
    location?: string | null;
    keyword?: string | null;
    category?: string | null;
    subcategory?: string | null;
    tags?: string[];
    photo_items?: EventPhoto[];
    media_urls?: string[];
    dates?: string[];
    date_items?: EventDateItem[];
    media_url?: string | null;
    media_focal_x?: number | null;
    media_focal_y?: number | null;
    event_date?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    announcement_urls?: string[];
    public_announcement_url?: string | null;
    interview_content?: string | null;
    show_interview_content?: boolean;
    private_notes?: string | null;
    live_urls?: string[];
    live_media_items?: LiveMediaItem[];
    author_ids?: Id[];
    project_id?: Id | null;
    parent_event_id?: Id | null;
    is_visible?: boolean;
}

function listUrl(base: string, { limit, offset, sort, name, category, subcategory, author, visibleStart, visibleEnd }: EventListParams) {
    let url = `${base}?limit=${limit}&offset=${offset}&sort=${sort}`;
    if (name) url += `&name=${encodeURIComponent(name)}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    if (subcategory) url += `&subcategory=${encodeURIComponent(subcategory)}`;
    if (author) url += `&author=${encodeURIComponent(author)}`;
    if (visibleStart) url += `&visible_start=${encodeURIComponent(visibleStart)}`;
    if (visibleEnd) url += `&visible_end=${encodeURIComponent(visibleEnd)}`;
    return url;
}

export const getEventTagIndex = () => api.get<EventTagEntry[]>("/events/tag-index");

export const getEvents = (params: EventListParams = {}) => api.get<Event[]>(listUrl("/events", params));

export const getEvent = (id: Id | string) => api.get<{ event: Event }>(`/events/${id}`);

export const getAdminEvent = (id: Id | string) => api.get<{ event: Event }>(`/events/admin/${id}`);

export const getAdminEvents = ({ limit = 50, offset = 0, sort = "newest", ...rest }: EventListParams = {}) =>
    api.get<Event[]>(listUrl("/events/admin", { limit, offset, sort, ...rest }));

export const countAdminEvents = ({ name, category }: Pick<EventListParams, "name" | "category"> = {}) => {
    const params = new URLSearchParams();
    if (name) params.set("name", name);
    if (category) params.set("category", category);
    return api.get<CountResponse>(`/events/admin/count?${params.toString()}`);
};

export const createEvent = (data: EventInput) => api.post<Event>("/events", data);

export const updateEvent = (id: Id | string, data: EventInput) => api.patch<Event>(`/events/${id}`, data);

export const deleteEvent = (id: Id) => api.delete(`/events/${id}`);
