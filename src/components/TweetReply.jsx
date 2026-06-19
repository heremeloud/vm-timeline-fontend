import { useEffect, useState } from "react";
import { deletePost, updatePost } from "../api/postsService";
import TweetEmbed from "./TweetEmbed";
import { isVideo } from "../utils/media";
import "../styles/PostCard.css";

export default function TweetReply({ reply }) {
    const [isEditing, setIsEditing] = useState(false);

    const [editUrl, setEditUrl] = useState(reply.external_url || "");
    const [editCaption, setEditCaption] = useState(reply.caption);
    const [editTranslation, setEditTranslation] = useState(
        reply.caption_translation
    );
    const [editTranslationNote, setEditTranslationNote] = useState(
        reply.caption_translation_note || ""
    );
    const [editMedia, setEditMedia] = useState(reply.media_url);
    const [editIsAdult, setEditIsAdult] = useState(reply.is_adult ?? false);

    useEffect(() => {
        // whenever edited reply comes back from server → re-render embed
        setTimeout(() => window.twttr?.widgets?.load(), 50);
    }, [reply]);

    // useEffect(() => {
    //     // when closing the editor → re-render embed
    //     if (!isEditing) {
    //         setTimeout(() => window.twttr?.widgets?.load(), 50);
    //     }
    // }, [isEditing]);

    async function handleDelete() {
        if (!confirm("Delete this tweet reply?")) return;
        try {
            await deletePost(reply.id);
            window.location.reload();
        } catch (err) {
            console.error("Delete reply failed:", err);
            alert("Delete failed: " + (err.response?.data?.detail || err.message));
        }
    }

    async function saveEdit() {
        await updatePost(reply.id, {
            external_url: editUrl || null,
            caption: editCaption,
            caption_translation: editTranslation,
            caption_translation_note: editTranslationNote.trim() || null,
            media_url: editMedia || null,
            is_adult: editIsAdult,
        });

        window.location.reload();
    }

    return (
        <div style={{ padding: "14px 0", borderBottom: "1px solid #eee" }}>
            {/* Show translation + buttons only when not editing */}
            {!isEditing && (
                <>
                    {reply.is_adult ? (
                        <div className="post-adult-card">
                            {reply.author_name && (
                                <div className="post-adult-author">{reply.author_name}</div>
                            )}
                            {reply.external_url && (
                                <a href={reply.external_url} target="_blank" rel="noopener noreferrer" className="post-adult-source">
                                    Tweet ↗
                                </a>
                            )}
                            {reply.caption && (
                                <p className="post-adult-caption">{reply.caption}</p>
                            )}
                            {reply.caption_translation && (
                                <p className="post-adult-translation">{reply.caption_translation}</p>
                            )}
                            {reply.caption_translation_note && (
                                <p className="post-adult-note">📝 {reply.caption_translation_note}</p>
                            )}
                            {reply.media_url && (
                                isVideo(reply.media_url) ? (
                                    <video
                                        src={reply.media_url}
                                        controls
                                        playsInline
                                        muted
                                        className="post-adult-media"
                                    />
                                ) : (
                                    <img src={reply.media_url} alt="" className="post-adult-media" />
                                )
                            )}
                        </div>
                    ) : (
                        <>
                            <TweetEmbed url={reply.external_url} />
                            {reply.caption_translation && (
                                <div style={{ opacity: 0.7, whiteSpace: "pre-wrap", wordBreak: "break-word", marginTop: "6px" }}>
                                    {reply.caption_translation}
                                </div>
                            )}
                            {reply.caption_translation_note && (
                                <p className="post-translation-note">📝 {reply.caption_translation_note}</p>
                            )}
                            {reply.media_url && (
                                <img src={reply.media_url} alt="reply-media" style={{ maxWidth: "100%", marginTop: 10 }} />
                            )}
                        </>
                    )}

                    {localStorage.getItem("jwt") && (
                        <div style={{ marginTop: 8, display: "flex", gap: 10 }}>
                            <button onClick={() => setIsEditing(true)} className="btn btn-edit">Edit</button>
                            <button onClick={handleDelete} className="btn btn-delete">Delete</button>
                        </div>
                    )}
                </>
            )}

            {/* ================= EDIT MODE ================= */}
            {isEditing && (
                <div style={{ marginTop: 10 }}>
                    <label>Tweet URL:</label>
                    <input
                        type="text"
                        value={editUrl}
                        onChange={(e) => setEditUrl(e.target.value)}
                        style={{ width: "100%" }}
                    />
                    <br />
                    <label>Caption:</label>
                    <textarea
                        value={editCaption}
                        onChange={(e) => setEditCaption(e.target.value)}
                        rows={3}
                        style={{ resize: "none", width: "100%" }}
                    />
                    <br />
                    <label>Translation:</label>
                    <textarea
                        value={editTranslation}
                        onChange={(e) => setEditTranslation(e.target.value)}
                        rows={3}
                        style={{ resize: "none", width: "100%" }}
                    />
                    <br />
                    <label>Translator's note (optional):</label>
                    <textarea
                        value={editTranslationNote}
                        onChange={(e) => setEditTranslationNote(e.target.value)}
                        rows={2}
                        style={{ resize: "none", width: "100%" }}
                    />
                    <br />
                    <label>Media URL:</label>
                    <input
                        type="text"
                        value={editMedia}
                        onChange={(e) => setEditMedia(e.target.value)}
                        style={{ resize: "none", width: "100%" }}
                    />

                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, color: "#b00", margin: "10px 0 4px", width: "auto", cursor: "pointer" }}>
                        <input
                            type="checkbox"
                            checked={editIsAdult}
                            onChange={(e) => setEditIsAdult(e.target.checked)}
                            style={{ width: "auto", margin: 0 }}
                        />
                        🔞 Adult content
                    </label>

                    <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={saveEdit} className="btn btn-primary">
                            Save
                        </button>
                        <button
                            onClick={() => setIsEditing(false)}
                            className="btn btn-secondary"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
