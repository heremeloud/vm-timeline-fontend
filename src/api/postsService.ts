import api from "./api";
import type { CountResponse, Id, Post, TimelinePage } from "../types/models";

export interface PostListParams {
    limit?: number;
    offset?: number;
    sort?: string;
    platform?: string;
}

export interface SearchScopes {
    text: boolean;
    translations: boolean;
    notes: boolean;
    urls: boolean;
    replies: boolean;
}

export interface AdminPostFilters {
    platform?: string;
    authorId?: string | number;
    dateFrom?: string;
    dateTo?: string;
    /** Author categories (`artist`, `crew`, `official`, …) whose posts are left out. */
    hideAuthorCategories?: string[];
}

export interface AdminPostListParams extends PostListParams, AdminPostFilters {}

export interface AdminPostSearchParams extends AdminPostListParams {
    q?: string;
    searchScopes?: SearchScopes;
}

/** Writable post fields; the API stores `media_urls` as JSON server-side. */
/** `media_urls` is read-only enrichment; writes go through the stored `media_urls_json` string. */
type PostFields = Omit<Post, "id" | "media_urls" | "comments" | "childrenPosts">;
export type PostInput = { [K in keyof PostFields]?: PostFields[K] | null };

export type ReorderPosition = "before" | "after";

export interface ArchiveResult {
    archived: boolean;
    caption?: string | null;
    /** URLs of the media copied into R2. */
    media_urls: string[];
    post: Post;
}

function appendFilters(params: URLSearchParams, { platform, authorId, dateFrom, dateTo, hideAuthorCategories = [] }: AdminPostFilters) {
    if (hideAuthorCategories.length > 0) params.set("hide_author_categories", hideAuthorCategories.join(","));
    if (platform && platform !== "all") params.set("platform", platform);
    if (authorId && authorId !== "all") params.set("author_id", String(authorId));
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
}

function appendSearchScopes(params: URLSearchParams, searchScopes?: SearchScopes) {
    if (!searchScopes) return;
    params.set("include_text", String(searchScopes.text));
    params.set("include_translations", String(searchScopes.translations));
    params.set("include_notes", String(searchScopes.notes));
    params.set("include_urls", String(searchScopes.urls));
    params.set("include_replies", String(searchScopes.replies));
}

export const getPosts = ({ limit, offset, sort, platform }: PostListParams = {}) => {
    let url = `/posts?limit=${limit}&offset=${offset}&sort=${sort}`;
    if (platform && platform !== "all") url += `&platform=${platform}`;
    return api.get<Post[]>(url);
};

export const getTimeline = ({ limit, offset, sort, platform }: PostListParams = {}) => {
    let url = `/posts/timeline?limit=${limit}&offset=${offset}&sort=${sort}`;
    if (platform && platform !== "all") url += `&platform=${platform}`;
    return api.get<TimelinePage>(url);
};

/** `includeHidden` (admin only) also returns posts not ticked "Show post on related page". */
const hiddenParam = (includeHidden: boolean) => (includeHidden ? "include_hidden=true" : "");

export const getEventPostCandidates = (eventId: Id | string, includeHidden = false) =>
    api.get<Post[]>(`/posts/event/${eventId}?${hiddenParam(includeHidden)}`);

/** Posts related to a project row: by its hashtag (if any) and by explicit links made in the post form. */
export const getProjectPostCandidates = (
    projectId: Id | string,
    hashtag: string,
    includeHidden = false,
    entry?: { entryType: string; entryNumber: number },
) => {
    const params = new URLSearchParams();
    if (hashtag) params.set("hashtag", hashtag);
    if (entry) {
        params.set("entry_type", entry.entryType);
        params.set("entry_number", String(entry.entryNumber));
    }
    if (includeHidden) params.set("include_hidden", "true");
    return api.get<Post[]>(`/posts/project/${projectId}/related?${params.toString()}`);
};

export const getProjectRelatedPostCounts = (projectId: Id | string, includeHidden = false) =>
    api.get<Record<string, number>>(`/posts/project/${projectId}/related-counts?${hiddenParam(includeHidden)}`);

export const getPost = (id: Id | string) => api.get<{ post: Post }>(`/posts/${id}`);

export const getAdminPost = (id: Id | string) => api.get<{ post: Post }>(`/posts/admin/${id}`);

export const getAdminPosts = ({ limit = 100, offset = 0, sort = "newest", platform, authorId, dateFrom, dateTo, hideAuthorCategories }: AdminPostListParams = {}) => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset), sort });
    appendFilters(params, { platform, authorId, dateFrom, dateTo, hideAuthorCategories });
    return api.get<Post[]>(`/posts/admin?${params.toString()}`);
};

export const countAdminPosts = (filters: AdminPostFilters = {}) => {
    const params = new URLSearchParams();
    appendFilters(params, filters);
    return api.get<CountResponse>(`/posts/admin/count?${params.toString()}`);
};

export const searchAdminPosts = ({ q, limit = 50, offset = 0, sort = "newest", platform, authorId, dateFrom, dateTo, hideAuthorCategories, searchScopes }: AdminPostSearchParams = {}) => {
    const params = new URLSearchParams({
        q: q || "",
        limit: String(limit),
        offset: String(offset),
        sort,
    });
    appendFilters(params, { platform, authorId, dateFrom, dateTo, hideAuthorCategories });
    appendSearchScopes(params, searchScopes);
    return api.get<Post[]>(`/posts/admin/search?${params.toString()}`);
};

export const countAdminPostSearch = ({ q, platform, authorId, dateFrom, dateTo, hideAuthorCategories, searchScopes }: Omit<AdminPostSearchParams, "limit" | "offset" | "sort"> = {}) => {
    const params = new URLSearchParams({ q: q || "" });
    appendFilters(params, { platform, authorId, dateFrom, dateTo, hideAuthorCategories });
    appendSearchScopes(params, searchScopes);
    return api.get<CountResponse>(`/posts/admin/search/count?${params.toString()}`);
};

export const getThread = (id: Id | string) => api.get<Post[]>(`/posts/${id}/thread`);

export const getAdminThread = (id: Id | string) => api.get<Post[]>(`/posts/admin/${id}/thread`);

export const createPost = (data: PostInput) => api.post<Post>("/posts/", data);

export const updatePost = (id: Id | string, data: PostInput) => api.patch<Post>(`/posts/${id}`, data);

export const reorderPost = (id: Id, targetPostId: Id, position: ReorderPosition) => api.post(`/posts/admin/${id}/order`, {
    target_post_id: targetPostId,
    position,
});

export const archiveInstagramPost = (id: Id, destination = "primary") =>
    api.post<ArchiveResult>(`/posts/admin/${id}/archive`, { destination });

export const deletePost = (id: Id) => api.delete(`/posts/${id}`);
