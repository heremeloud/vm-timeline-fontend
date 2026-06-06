import api from "./api";

export const getTopics = () => api.get("/topics/");

export const getAdminTopics = () => api.get("/topics/admin");

export const getTopic = (id) => api.get(`/topics/${id}`);

export const createTopic = (data) => api.post("/topics/", data);

export const updateTopic = (id, data) => api.patch(`/topics/${id}`, data);

export const updateTopicItemTime = (id, data) => api.patch(`/topics/items/${id}/time`, data);

export const deleteTopic = (id) => api.delete(`/topics/${id}`);
