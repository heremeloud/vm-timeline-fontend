import api from "./api";

export const getEventCategories = () => api.get("/event-categories");
export const createEventCategory = (data) => api.post("/event-categories/admin", data);
export const updateEventCategory = (id, data) => api.patch(`/event-categories/admin/${id}`, data);
export const deleteEventCategory = (id) => api.delete(`/event-categories/admin/${id}`);
export const createEventSubcategory = (data) => api.post("/event-categories/admin/subcategories", data);
export const updateEventSubcategory = (id, data) => api.patch(`/event-categories/admin/subcategories/${id}`, data);
export const deleteEventSubcategory = (id) => api.delete(`/event-categories/admin/subcategories/${id}`);
