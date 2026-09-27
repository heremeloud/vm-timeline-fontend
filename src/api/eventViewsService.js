import api from "./api";

export const getEventView = (slug) => api.get(`/event-views/${encodeURIComponent(slug)}`);
export const getEventViews = () => api.get("/event-views");
export const getAdminEventViews = () => api.get("/event-views/admin");
export const createEventView = (data) => api.post("/event-views/admin", data);
export const updateEventView = (id, data) => api.patch(`/event-views/admin/${id}`, data);
export const deleteEventView = (id) => api.delete(`/event-views/admin/${id}`);
