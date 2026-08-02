import { useState } from "react";
import { uploadMedia } from "../api/mediaService";

const destinationForAuthor = (author) => {
    const normalized = author.trim().toLowerCase();
    if (normalized === "view" || normalized === "mim") return "primary";
    if (normalized === "vimmy") return "vimmy";
    if (normalized) return "related";
    return "primary";
};

export default function R2MediaUploader({ author, postedAt, mediaType, sequenceStart = 1, onUploaded, multiple = false }) {
    const destination = destinationForAuthor(author);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState("");

    const handleFiles = async (event) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;
        if (!author || !postedAt) {
            setError("Select an author and posted date before uploading.");
            event.target.value = "";
            return;
        }

        setUploading(true);
        setProgress(0);
        setError("");

        try {
            const urls = [];
            for (let index = 0; index < files.length; index += 1) {
                const response = await uploadMedia(files[index], {
                    destination,
                    author,
                    postedAt,
                    mediaType,
                    sequence: sequenceStart + index,
                }, (progressEvent) => {
                    const fileProgress = progressEvent.total ? progressEvent.loaded / progressEvent.total : 0;
                    setProgress(Math.round(((index + fileProgress) / files.length) * 100));
                });
                urls.push(response.data.url);
            }
            setProgress(100);
            onUploaded(urls);
            event.target.value = "";
        } catch (err) {
            setError(err.response?.data?.detail || "Upload failed. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="r2-uploader">
            <div className="r2-uploader-controls">
                <select value={destination} disabled aria-label="R2 upload destination">
                    <option value="primary">View &amp; Mim media</option>
                    <option value="vimmy">Vimmy media</option>
                    <option value="related">Other people</option>
                </select>
                <label className={`r2-upload-button${uploading ? " is-disabled" : ""}`}>
                    {uploading ? `Uploading ${progress}%` : multiple ? "Upload files" : "Upload file"}
                    <input type="file" accept="image/*,video/*" multiple={multiple} disabled={uploading} onChange={handleFiles} />
                </label>
            </div>
            {author && postedAt && (
                <div className="r2-upload-name-preview">
                    Filename: {author.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-{postedAt.replaceAll("-", "")}-{mediaType}-{String(sequenceStart).padStart(2, "0")}.ext
                </div>
            )}
            {uploading && <progress value={progress} max="100">{progress}%</progress>}
            {error && <div className="r2-upload-error" role="alert">{error}</div>}
        </div>
    );
}
