import { useEffect, useState } from "react";
import api from "../api/api";
import TweetEmbed from "./TweetEmbed";

export default function TweetReply({ reply }) {
    const [isEditing, setIsEditing] = useState(false);

    const [editCaption, setEditCaption] = useState(reply.caption);
    const [editTranslation, setEditTranslation] = useState(
        reply.caption_translation
    );
    const [editMedia, setEditMedia] = useState(reply.media_url);

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
        await api.delete(`/posts/${reply.id}`);
        window.location.reload();
    }

    async function saveEdit() {
        await api.patch(`/posts/${reply.id}`, {
            caption: editCaption,
            caption_translation: editTranslation,
            media_url: editMedia || null,
        });

        window.location.reload();
    }

    return (
        <div style={{ padding: "14px 0", borderBottom: "1px solid #eee" }}>
            {/* ALWAYS keep the tweet embed here */}
            <TweetEmbed url={reply.external_url} />

            {/* Show translation + buttons only when not editing */}
            {!isEditing && (
                <>
                    {reply.caption_translation && (
                        <div
                            style={{
                                opacity: 0.7,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                marginTop: "6px",
                            }}
                        >
                            {reply.caption_translation}
                        </div>
                    )}

                    {reply.media_url && (
                        <img
                            src={reply.media_url}
                            alt="reply-media"
                            style={{ maxWidth: "100%", marginTop: 10 }}
                        />
                    )}
                    {localStorage.getItem("adminToken") && (
                        <div style={{ marginTop: 8, display: "flex", gap: 10 }}>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="btn btn-edit"
                            >
                                Edit
                            </button>
                            <button
                                onClick={handleDelete}
                                className="btn btn-delete"
                            >
                                Delete
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* ================= EDIT MODE ================= */}
            {isEditing && (
                <div style={{ marginTop: 10 }}>
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
                    <label>Media URL:</label>
                    <input
                        type="text"
                        value={editMedia}
                        onChange={(e) => setEditMedia(e.target.value)}
                        style={{ resize: "none", width: "100%" }}
                    />

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
