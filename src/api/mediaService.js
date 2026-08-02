import api from "./api";

export const uploadMedia = (file, metadata, onUploadProgress) => {
    const form = new FormData();
    form.append("destination", metadata.destination);
    form.append("author", metadata.author);
    form.append("posted_at", metadata.postedAt);
    form.append("media_type", metadata.mediaType);
    form.append("sequence", String(metadata.sequence));
    form.append("file", file);
    return api.post("/media/upload", form, { onUploadProgress });
};

export const deleteMediaObject = (url) => api.delete("/media/object", { data: { url } });
