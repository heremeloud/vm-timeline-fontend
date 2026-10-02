import api from "./api";
import type { EventView, Id } from "../types/models";

export type EventViewInput = Partial<Omit<EventView, "id">>;

export const getEventView = (slug: string) => api.get<EventView>(`/event-views/${encodeURIComponent(slug)}`);
export const getEventViews = () => api.get<EventView[]>("/event-views");
export const getAdminEventViews = () => api.get<EventView[]>("/event-views/admin");
export const createEventView = (data: EventViewInput) => api.post<EventView>("/event-views/admin", data);
export const updateEventView = (id: Id, data: EventViewInput) => api.patch<EventView>(`/event-views/admin/${id}`, data);
export const deleteEventView = (id: Id) => api.delete(`/event-views/admin/${id}`);
