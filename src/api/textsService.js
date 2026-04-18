import api from "./api";

export const getTextsByPost = (postId) => api.get(`/texts/by_post/${postId}`);

export const createText = (data) => api.post("/texts/", data);

export const updateTextPair = (id, data) => api.patch(`/texts/pair/${id}`, data);

export const deleteTextPair = (id) => api.delete(`/texts/pair/${id}`);
