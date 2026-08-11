import api from "./api";

export const getPosts = ({ limit, offset, sort, platform } = {}) => {
    let url = `/posts?limit=${limit}&offset=${offset}&sort=${sort}`;
    if (platform && platform !== "all") url += `&platform=${platform}`;
    return api.get(url);
};

export const getTimeline = ({ limit, offset, sort, platform } = {}) => {
    let url = `/posts/timeline?limit=${limit}&offset=${offset}&sort=${sort}`;
    if (platform && platform !== "all") url += `&platform=${platform}`;
    return api.get(url);
};

export const getPost = (id) => api.get(`/posts/${id}`);

export const getAdminPost = (id) => api.get(`/posts/admin/${id}`);

export const getAdminPosts = ({ limit = 100, offset = 0, sort = "newest", platform, authorId, dateFrom, dateTo } = {}) => {
    let url = `/posts/admin?limit=${limit}&offset=${offset}&sort=${sort}`;
    if (platform && platform !== "all") url += `&platform=${platform}`;
    if (authorId && authorId !== "all") url += `&author_id=${authorId}`;
    if (dateFrom) url += `&date_from=${encodeURIComponent(dateFrom)}`;
    if (dateTo) url += `&date_to=${encodeURIComponent(dateTo)}`;
    return api.get(url);
};

export const countAdminPosts = ({ platform, authorId, dateFrom, dateTo } = {}) => {
    const params = new URLSearchParams();
    if (platform && platform !== "all") params.set("platform", platform);
    if (authorId && authorId !== "all") params.set("author_id", authorId);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    return api.get(`/posts/admin/count?${params.toString()}`);
};

export const searchAdminPosts = ({ q, limit = 50, offset = 0, sort = "newest", platform, authorId, dateFrom, dateTo, searchScopes } = {}) => {
    const params = new URLSearchParams({
        q: q || "",
        limit: String(limit),
        offset: String(offset),
        sort,
    });
    if (platform && platform !== "all") params.set("platform", platform);
    if (authorId && authorId !== "all") params.set("author_id", authorId);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (searchScopes) {
        params.set("include_text", String(searchScopes.text));
        params.set("include_translations", String(searchScopes.translations));
        params.set("include_notes", String(searchScopes.notes));
        params.set("include_urls", String(searchScopes.urls));
        params.set("include_replies", String(searchScopes.replies));
    }
    return api.get(`/posts/admin/search?${params.toString()}`);
};

export const countAdminPostSearch = ({ q, platform, authorId, dateFrom, dateTo, searchScopes } = {}) => {
    const params = new URLSearchParams({ q: q || "" });
    if (platform && platform !== "all") params.set("platform", platform);
    if (authorId && authorId !== "all") params.set("author_id", authorId);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (searchScopes) {
        params.set("include_text", String(searchScopes.text));
        params.set("include_translations", String(searchScopes.translations));
        params.set("include_notes", String(searchScopes.notes));
        params.set("include_urls", String(searchScopes.urls));
        params.set("include_replies", String(searchScopes.replies));
    }
    return api.get(`/posts/admin/search/count?${params.toString()}`);
};

export const getThread = (id) => api.get(`/posts/${id}/thread`);

export const getAdminThread = (id) => api.get(`/posts/admin/${id}/thread`);

export const createPost = (data) => api.post("/posts/", data);

export const updatePost = (id, data) => api.patch(`/posts/${id}`, data);

export const reorderPost = (id, targetPostId, position) => api.post(`/posts/admin/${id}/order`, {
    target_post_id: targetPostId,
    position,
});

export const deletePost = (id) => api.delete(`/posts/${id}`);
