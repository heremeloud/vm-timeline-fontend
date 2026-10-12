import api from "./api";
import type { Id, ProjectCategoryOption } from "../types/models";

export interface ProjectCategoryInput {
    name?: string;
    label?: string;
    sort_order?: number;
    is_visible?: boolean;
}

export const getProjectCategories = () => api.get<ProjectCategoryOption[]>("/project-categories");
export const createProjectCategory = (data: ProjectCategoryInput) => api.post<ProjectCategoryOption>("/project-categories/admin", data);
export const updateProjectCategory = (id: Id, data: ProjectCategoryInput) => api.patch<ProjectCategoryOption>(`/project-categories/admin/${id}`, data);
export const deleteProjectCategory = (id: Id) => api.delete(`/project-categories/admin/${id}`);
