import api from "./api";

export const getPosts = ({ limit, offset, sort, platform } = {}) => {
    let url = `/posts?limit=${limit}&offset=${offset}&sort=${sort}`;
    if (platform && platform !== "all") url += `&platform=${platform}`;
    return api.get(url);
};

export const getPost = (id) => api.get(`/posts/${id}`);

export const getAdminPost = (id) => api.get(`/posts/admin/${id}`);

export const getAdminPosts = ({ limit = 100, offset = 0, sort = "newest", platform } = {}) => {
    let url = `/posts/admin?limit=${limit}&offset=${offset}&sort=${sort}`;
    if (platform && platform !== "all") url += `&platform=${platform}`;
    return api.get(url);
};

export const getThread = (id) => api.get(`/posts/${id}/thread`);

export const createPost = (data) => api.post("/posts/", data);

export const updatePost = (id, data) => api.patch(`/posts/${id}`, data);

export const deletePost = (id) => api.delete(`/posts/${id}`);
