import api from "./api";

export const getProjects = ({ sort, category } = {}) => {
    let url = `/projects?sort=${sort || "newest"}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    return api.get(url);
};

export const getProject = (id) => api.get(`/projects/${id}`);

export const createProject = (data) => api.post("/projects", data);

export const updateProject = (id, data) => api.patch(`/projects/${id}`, data);

export const deleteProject = (id) => api.delete(`/projects/${id}`);

export const getProjectCategories = () => api.get("/projects/categories");
