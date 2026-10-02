import api from "./api";
import type { Id, Topic } from "../types/models";

export interface TopicItemInput {
    post_id: Id;
    happened_at?: string | null;
    label?: string | null;
    note?: string | null;
    show_replies?: boolean;
    media_index?: number | null;
    media_indices?: number[];
    sort_order?: number;
}

export interface TopicInput {
    title?: string;
    original_title?: string | null;
    slug?: string | null;
    description?: string | null;
    cover_url?: string | null;
    is_public?: boolean;
    is_visible?: boolean;
    start_date?: string | null;
    end_date?: string | null;
    sort_order?: number | null;
    items?: TopicItemInput[];
}

export const getTopics = () => api.get<Topic[]>("/topics/");

export const getAdminTopics = () => api.get<Topic[]>("/topics/admin");

export const getAdminTopic = (id: Id | string) => api.get<{ topic: Topic }>(`/topics/admin/${id}`);

export const getTopic = (id: Id | string) => api.get<{ topic: Topic }>(`/topics/${id}`);

export const createTopic = (data: TopicInput) => api.post<Topic>("/topics/", data);

export const updateTopic = (id: Id | string, data: TopicInput) => api.patch<Topic>(`/topics/${id}`, data);

export const updateTopicItemTime = (id: Id, data: { happened_at: string | null }) => api.patch(`/topics/items/${id}/time`, data);

export const deleteTopic = (id: Id) => api.delete(`/topics/${id}`);
