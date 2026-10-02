import type { AxiosProgressEvent } from "axios";
import api from "./api";

export interface MediaUploadMetadata {
    destination: string;
    author: string;
    postedAt: string;
    mediaType: string;
    sequence: number | string;
    filename?: string;
}

export interface MediaUploadResult {
    url: string;
    key: string;
    bucket?: string;
    destination: string;
    size: number;
    content_type: string;
}

export const uploadMedia = (
    file: File,
    metadata: MediaUploadMetadata,
    onUploadProgress?: (event: AxiosProgressEvent) => void,
) => {
    const form = new FormData();
    form.append("destination", metadata.destination);
    form.append("author", metadata.author);
    form.append("posted_at", metadata.postedAt);
    form.append("media_type", metadata.mediaType);
    form.append("sequence", String(metadata.sequence));
    if (metadata.filename) form.append("filename", metadata.filename);
    form.append("file", file);
    return api.post<MediaUploadResult>("/media/upload", form, { onUploadProgress });
};

export const deleteMediaObject = (url: string) => api.delete("/media/object", { data: { url } });

export const getMediaDownloadUrl = (url: string) => {
    const baseUrl = (api.defaults.baseURL || "").replace(/\/$/, "");
    return `${baseUrl}/media/download?url=${encodeURIComponent(url)}`;
};
