import api from "./api";

export const getAuthors = () => api.get("/authors/");

export const ensureAuthor = (data) => api.post("/authors/ensure", data);
