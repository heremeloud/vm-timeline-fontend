import api from "./api";
import type { Author, Id } from "../types/models";

export type AuthorInput = { [K in keyof Omit<Author, "id">]?: Author[K] | null };

export const getAuthors = () => api.get<Author[]>("/authors/");

export const createAuthor = (data: AuthorInput) => api.post<Author>("/authors/", data);

export const updateAuthor = (id: Id, data: AuthorInput) => api.patch<Author>(`/authors/${id}`, data);

export const uploadAuthorPhoto = (id: Id, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<Author>(`/authors/${id}/upload-photo`, form);
};

export const ensureAuthor = (data: AuthorInput) => api.post<Author>("/authors/ensure", data);
