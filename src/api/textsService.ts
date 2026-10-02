import api from "./api";
import type { Id, PostText } from "../types/models";

export type PostTextInput = Partial<Omit<PostText, "id">> & { source?: string };

/** The reply editor sends `caption`; the API maps it onto the stored `content`. */
export interface TextPairInput {
    caption?: string;
    translation?: string;
    note?: string | null;
    media_url?: string | null;
    posted_at?: string | null;
}

export const getTextsByPost = (postId: Id | string) => api.get<PostText[]>(`/texts/by_post/${postId}`);

export const createText = (data: PostTextInput) => api.post<PostText>("/texts/", data);

export const updateTextPair = (id: Id, data: TextPairInput) => api.patch(`/texts/pair/${id}`, data);

export const deleteTextPair = (id: Id) => api.delete(`/texts/pair/${id}`);
