import { useState } from "react";
import api from "../api/api";
import Avatar from "./Avatar";
import "../styles/IGReply.css"; 

function isYouTube(url) {
    if (!url) return false;
    return url.includes("youtu.be") || url.includes("youtube.com");
}

function getYouTubeEmbed(url) {
    if (!url) return "";
    if (url.includes("watch?v=")) {
        return (
            "https://www.youtube.com/embed/" +
            url.split("watch?v=")[1].split("&")[0]
        );
    }
    if (url.includes("youtu.be/")) {
        return (
            "https://www.youtube.com/embed/" +
            url.split("youtu.be/")[1].split("?")[0]
        );
    }
    return "";
}

function isVideo(url) {
    if (!url) return false;
    return (
        url.endsWith(".mp4") || url.endsWith(".webm") || url.endsWith(".mov")
    );
}

export default function TikTokReply({ pair }) {
    const main = pair.main;
    const trans = pair.translation;

    const [isEditing, setIsEditing] = useState(false);
    const [editCaption, setEditCaption] = useState(main.content);
    const [editTranslation, setEditTranslation] = useState(
        trans?.content || "",
    );

    async function handleDelete() {
        if (!confirm("Delete this TikTok reply (caption + translation)?"))
            return;
        await api.delete(`/texts/pair/${main.id}`);
        window.location.reload();
    }

    async function saveEdit() {
        await api.patch(`/texts/pair/${main.id}`, {
            caption: editCaption,
            translation: editTranslation,
        });
        window.location.reload();
    }

    return (
        <div className="igreply-container">
            {!isEditing && (
                <>
                    <div className="igreply-row">
                        <Avatar
                            url={main.author_photo}
                            authorId={main.author_id}
                            name={main.author_name}
                        />

                        <div className="igreply-content">
                            <div className="igreply-author">
                                {main.author_name} :
                            </div>

                            {!main.media_url && main.content && (
                                <div className="igreply-caption">
                                    {main.content}
                                </div>
                            )}

                            {trans && (
                                <div className="igreply-translation">
                                    {trans.content}
                                </div>
                            )}

                            {main.media_url && (
                                <div className="igreply-media">
                                    {isYouTube(main.media_url) ? (
                                        <iframe
                                            src={getYouTubeEmbed(
                                                main.media_url,
                                            )}
                                            title="YouTube video"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            style={{
                                                width: "100%",
                                                height: "250px",
                                                borderRadius: "8px",
                                                marginTop: "6px",
                                                border: "none",
                                            }}
                                        />
                                    ) : isVideo(main.media_url) ? (
                                        <video
                                            src={main.media_url}
                                            controls
                                            onError={(e) =>
                                                (e.target.style.display =
                                                    "none")
                                            }
                                            style={{
                                                maxWidth: "100%",
                                                maxHeight: "250px",
                                                borderRadius: "8px",
                                                marginTop: "6px",
                                            }}
                                        />
                                    ) : (
                                        <img
                                            src={main.media_url}
                                            alt="reply media"
                                            onError={(e) =>
                                                (e.target.style.display =
                                                    "none")
                                            }
                                            style={{
                                                maxWidth: "100%",
                                                maxHeight: "250px",
                                                borderRadius: "8px",
                                                marginTop: "6px",
                                                objectFit: "contain",
                                            }}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {localStorage.getItem("adminToken") && (
                        <div className="igreply-actions">
                            <button onClick={() => setIsEditing(true)}>
                                Edit
                            </button>
                            <button onClick={handleDelete}>Delete</button>
                        </div>
                    )}
                </>
            )}

            {isEditing && (
                <div className="igreply-edit">
                    <label>Caption:</label>
                    <textarea
                        value={editCaption}
                        onChange={(e) => setEditCaption(e.target.value)}
                        rows={3}
                    />

                    <label>Translation:</label>
                    <textarea
                        value={editTranslation}
                        onChange={(e) => setEditTranslation(e.target.value)}
                        rows={3}
                    />

                    <div className="igreply-edit-buttons">
                        <button onClick={saveEdit}>Save</button>
                        <button
                            onClick={() => {
                                setIsEditing(false);
                                setEditCaption(main.content);
                                setEditTranslation(trans?.content || "");
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
