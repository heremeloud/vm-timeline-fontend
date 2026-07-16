import api from "./api";

export const getEvents = ({ limit, offset, sort, name, category, author, visibleStart, visibleEnd } = {}) => {
    let url = `/events?limit=${limit}&offset=${offset}&sort=${sort}`;
    if (name) url += `&name=${encodeURIComponent(name)}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    if (author) url += `&author=${encodeURIComponent(author)}`;
    if (visibleStart) url += `&visible_start=${encodeURIComponent(visibleStart)}`;
    if (visibleEnd) url += `&visible_end=${encodeURIComponent(visibleEnd)}`;
    return api.get(url);
};

export const getEvent = (id) => api.get(`/events/${id}`);

export const getAdminEvent = (id) => api.get(`/events/admin/${id}`);

export const getAdminEvents = ({ limit = 50, offset = 0, sort = "newest", name, category } = {}) => {
    let url = `/events/admin?limit=${limit}&offset=${offset}&sort=${sort}`;
    if (name) url += `&name=${encodeURIComponent(name)}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    return api.get(url);
};

export const createEvent = (data) => api.post("/events", data);

export const updateEvent = (id, data) => api.patch(`/events/${id}`, data);

export const deleteEvent = (id) => api.delete(`/events/${id}`);
