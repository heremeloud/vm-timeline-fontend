import api from "./api";
import type { EventCategoryOption, EventSubcategoryOption, Id } from "../types/models";

export interface CategoryInput {
    name?: string;
    label?: string;
    sort_order?: number;
}

export interface SubcategoryInput extends CategoryInput {
    category_id?: Id;
}

export const getEventCategories = () => api.get<EventCategoryOption[]>("/event-categories");
export const createEventCategory = (data: CategoryInput) => api.post("/event-categories/admin", data);
export const updateEventCategory = (id: Id, data: CategoryInput) => api.patch(`/event-categories/admin/${id}`, data);
export const deleteEventCategory = (id: Id) => api.delete(`/event-categories/admin/${id}`);
export const createEventSubcategory = (data: SubcategoryInput) => api.post<EventSubcategoryOption>("/event-categories/admin/subcategories", data);
export const updateEventSubcategory = (id: Id, data: SubcategoryInput) => api.patch(`/event-categories/admin/subcategories/${id}`, data);
export const deleteEventSubcategory = (id: Id) => api.delete(`/event-categories/admin/subcategories/${id}`);
