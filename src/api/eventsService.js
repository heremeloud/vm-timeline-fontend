import api from "./api";

export const getEvents = ({ limit, offset, sort, name, category } = {}) => {
    let url = `/events?limit=${limit}&offset=${offset}&sort=${sort}`;
    if (name) url += `&name=${encodeURIComponent(name)}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    return api.get(url);
};

export const getEvent = (id) => api.get(`/events/${id}`);

export const createEvent = (data) => api.post("/events", data);

export const updateEvent = (id, data) => api.patch(`/events/${id}`, data);

export const deleteEvent = (id) => api.delete(`/events/${id}`);
