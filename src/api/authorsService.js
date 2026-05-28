import api from "./api";

export const getAuthors = () => api.get("/authors/");

export const updateAuthor = (id, data) => api.patch(`/authors/${id}`, data);

export const uploadAuthorPhoto = (id, file) => {
    const form = new FormData();
    form.append("file", file);
    return api.post(`/authors/${id}/upload-photo`, form);
};

export const ensureAuthor = (data) => api.post("/authors/ensure", data);
