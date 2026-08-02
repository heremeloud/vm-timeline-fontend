import { useState } from "react";
import { uploadMedia } from "../api/mediaService";

const destinationForAuthor = (author) => {
    const normalized = author.trim().toLowerCase();
    if (normalized === "view" || normalized === "mim") return "primary";
    if (normalized === "vimmy") return "vimmy";
    if (normalized) return "related";
    return "primary";
};

const authorSlug = (author) => author.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const generatedFilename = (file, author, postedAt, mediaType, sequence) => {
    const extension = file.name.includes(".") ? `.${file.name.split(".").pop().toLowerCase()}` : ".ext";
    return `${authorSlug(author)}-${postedAt.replaceAll("-", "")}-${mediaType}-${String(sequence).padStart(2, "0")}${extension}`;
};

const formatSize = (size) => {
    if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

function QueuedFilePreview({ file }) {
    const [url] = useState(() => URL.createObjectURL(file));

    return file.type.startsWith("video/") ? (
        <video
            className="r2-file-preview"
            src={url}
            controls
            muted
            playsInline
            preload="metadata"
            aria-label={`Preview ${file.name}`}
        />
    ) : (
        <img className="r2-file-preview" src={url} alt={`Preview ${file.name}`} />
    );
}

export default function R2MediaUploader({ author, postedAt, mediaType, sequenceStart = 1, onUploaded, multiple = false }) {
    const automaticDestination = destinationForAuthor(author);
    const [manualDestination, setManualDestination] = useState("");
    const destination = manualDestination || automaticDestination;
    const [files, setFiles] = useState([]);
    const [draggingOver, setDraggingOver] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState("");

    const addFiles = (incoming) => {
        const accepted = Array.from(incoming).filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"));
        if (!accepted.length) {
            setError("Only image and video files can be uploaded.");
            return;
        }
        setError(accepted.length === incoming.length ? "" : "Some unsupported files were skipped.");
        setFiles((current) => multiple ? [...current, ...accepted] : accepted.slice(0, 1));
    };

    const moveFile = (from, to) => {
        if (from === to || from === null) return;
        setFiles((current) => {
            const next = [...current];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
        });
    };

    const uploadFiles = async () => {
        if (!files.length) return;
        if (!author || !postedAt) {
            setError("Select an author and posted date before uploading.");
            return;
        }

        setUploading(true);
        setProgress(0);
        setError("");
        const urls = [];

        try {
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
            setFiles([]);
        } catch (err) {
            if (urls.length) {
                onUploaded(urls);
                setFiles((current) => current.slice(urls.length));
            }
            setError(err.response?.data?.detail || "Upload failed. Remaining files are still queued.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="r2-uploader">
            <div className="r2-uploader-controls">
                <select value={manualDestination} onChange={(event) => setManualDestination(event.target.value)} disabled={uploading} aria-label="R2 upload destination">
                    <option value="">-- Auto: {automaticDestination === "primary" ? "ViewMim media" : automaticDestination === "vimmy" ? "Vimmy media" : "Other people"} --</option>
                    <option value="primary">Manually: ViewMim media</option>
                    <option value="vimmy">Manually: Vimmy media</option>
                    <option value="related">Manually: Other people</option>
                    <option value="test">Manually: Testing bucket</option>
                </select>
                <label className={`r2-upload-button${uploading ? " is-disabled" : ""}`}>
                    Choose {multiple ? "files" : "file"}
                    <input
                        type="file"
                        accept="image/*,video/*"
                        multiple={multiple}
                        disabled={uploading}
                        onChange={(event) => {
                            addFiles(event.target.files || []);
                            event.target.value = "";
                        }}
                    />
                </label>
            </div>

            <div
                className={`r2-drop-zone${draggingOver ? " is-dragging" : ""}`}
                onDragEnter={(event) => {
                    event.preventDefault();
                    setDraggingOver(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) setDraggingOver(false);
                }}
                onDrop={(event) => {
                    event.preventDefault();
                    setDraggingOver(false);
                    if (!uploading) addFiles(event.dataTransfer.files || []);
                }}
            >
                Drop {multiple ? "story files" : "a media file"} here
            </div>
            {!multiple && (
                <div className="r2-upload-mode-note">
                    Need multiple files? Select Instagram content type <strong>Story</strong> or <strong>Broadcast channel</strong> above.
                </div>
            )}

            {files.length > 0 && (
                <div className="r2-upload-queue">
                    {files.map((file, index) => (
                        <div
                            key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                            className={`r2-queued-file${multiple ? "" : " is-single"}`}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                moveFile(draggedIndex, index);
                                setDraggedIndex(null);
                            }}
                        >
                            {multiple && (
                                <span
                                    className="r2-drag-handle"
                                    title="Drag to reorder"
                                    draggable={!uploading}
                                    onDragStart={() => setDraggedIndex(index)}
                                    onDragEnd={() => setDraggedIndex(null)}
                                >
                                    ⋮⋮
                                </span>
                            )}
                            <span className="r2-file-order">{sequenceStart + index}</span>
                            <QueuedFilePreview file={file} />
                            <span className="r2-file-details">
                                <small className="r2-upload-as-label">Will upload as</small>
                                <strong title={author && postedAt ? generatedFilename(file, author, postedAt, mediaType, sequenceStart + index) : file.name}>
                                    {author && postedAt ? generatedFilename(file, author, postedAt, mediaType, sequenceStart + index) : "Select author and date"}
                                </strong>
                                <small title={file.name}>Original: {file.name} · {formatSize(file.size)}</small>
                            </span>
                            {multiple && (
                                <span className="r2-file-move-actions">
                                    <button type="button" disabled={uploading || index === 0} onClick={() => moveFile(index, index - 1)} aria-label={`Move ${file.name} up`}>↑</button>
                                    <button type="button" disabled={uploading || index === files.length - 1} onClick={() => moveFile(index, index + 1)} aria-label={`Move ${file.name} down`}>↓</button>
                                </span>
                            )}
                            <button type="button" className="r2-file-remove" disabled={uploading} onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
                        </div>
                    ))}
                    <button type="button" className="r2-upload-queued-button" disabled={uploading} onClick={uploadFiles}>
                        {uploading ? `Uploading ${progress}%` : `Upload ${files.length} ${files.length === 1 ? "file" : "files"}`}
                    </button>
                </div>
            )}

            {uploading && <progress value={progress} max="100">{progress}%</progress>}
            {error && <div className="r2-upload-error" role="alert">{error}</div>}
        </div>
    );
}
