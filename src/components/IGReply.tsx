import { useState } from "react";
import { deleteTextPair, updateTextPair } from "../api/textsService";
import Avatar from "./Avatar";
import { errorDetail } from "../utils/errors";
import { ReplyAdminActions, ReplyEditActions } from "./ReplyActions";
import { FormField, Stack, TextInput, Textarea } from "../ui";
import type { PostText } from "../types/models";
import "../styles/IGReply.css";

function isYouTube(url?: string | null) {
    if (!url) return false;
    return url.includes("youtu.be") || url.includes("youtube.com");
}

function getYouTubeEmbed(url?: string | null) {
    if (!url) return "";

    // youtube.com/watch?v=XXXXX
    if (url.includes("watch?v=")) {
        return (
            "https://www.youtube.com/embed/" +
            url.split("watch?v=")[1].split("&")[0]
        );
    }

    // youtu.be/XXXXX
    if (url.includes("youtu.be/")) {
        return (
            "https://www.youtube.com/embed/" +
            url.split("youtu.be/")[1].split("?")[0]
        );
    }

    return "";
}

function isVideo(url?: string | null) {
    if (!url) return false;
    return (
        url.endsWith(".mp4") || url.endsWith(".webm") || url.endsWith(".mov")
    );
}

export default function IGReply({ reply }: { reply: PostText }) {
    const main = reply;

    const [isEditing, setIsEditing] = useState(false);
    const [editCaption, setEditCaption] = useState(main.content || "");
    const [editTranslation, setEditTranslation] = useState(main.translation || "");
    const [editNote, setEditNote] = useState(main.note || "");
    const [editMediaURL, setEditMediaURL] = useState(main.media_url || "");
    const [editDate, setEditDate] = useState(main.posted_at || "");

    async function handleDelete() {
        if (!confirm("Delete this IG reply (caption + translation)?")) return;
        try {
            await deleteTextPair(main.id);
            window.location.reload();
        } catch (err) {
            console.error("Delete reply failed:", err);
            alert("Delete failed: " + errorDetail(err, err instanceof Error ? err.message : "Unknown error"));
        }
    }

    async function saveEdit() {
        await updateTextPair(main.id, {
            caption: editCaption,
            translation: editTranslation,
            note: editNote || null,
            media_url: editMediaURL || null,
            posted_at: editDate || null,
        });
        window.location.reload();
    }

    return (
        <div className="igreply-container">
            {/* DISPLAY MODE */}
            {!isEditing && (
                <>
                    <div className="igreply-row igreply-row--instagram">
                        {main.author_instagram_url ? (
                            <a href={main.author_instagram_url} target="_blank" rel="noopener noreferrer" className="ig-author-link" aria-label={`${main.author_name || "Author"} on Instagram`}>
                                <Avatar
                                    url={main.author_ig_pfp_url || main.author_photo}
                                    authorId={main.author_id}
                                    name={main.author_name}
                                />
                            </a>
                        ) : (
                            <Avatar
                            url={main.author_ig_pfp_url || main.author_photo}
                            authorId={main.author_id}
                            name={main.author_name}
                            />
                        )}

                        <div className="igreply-content">
                            {/* Author */}
                            <div className="igreply-author">
                                {main.author_instagram_url ? (
                                    <a href={main.author_instagram_url} target="_blank" rel="noopener noreferrer" className="ig-author-link">
                                        {main.author_name}
                                    </a>
                                ) : main.author_name} :
                            </div>

                            {/* Only show the caption if it exists. */}
                            {!main.media_url && main.content && (
                                <div className="igreply-caption">
                                    {main.content}
                                </div>
                            )}

                            {/* Translation */}
                            {main.translation && (
                                <div className="igreply-translation">
                                    {main.translation}
                                    {main.note && (
                                        <div className="igreply-note post-note-line">
                                            <span className="post-note-icon" aria-hidden="true">📝</span>
                                            <span className="post-note-text">{main.note}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* MEDIA BLOCK */}
                            {main.media_url && (
                                <div className="igreply-media">
                                    {isYouTube(main.media_url) ? (
                                        <iframe
                                            src={getYouTubeEmbed(
                                                main.media_url
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
                                            playsInline
                                            muted
                                            autoPlay
                                            preload="metadata"
                                            onError={(e) =>
                                                (e.currentTarget.style.display =
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
                                                (e.currentTarget.style.display =
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

                    <ReplyAdminActions onEdit={() => setIsEditing(true)} onDelete={handleDelete} />
                </>
            )}

            {/* EDIT MODE */}
            {isEditing && (
                <Stack gap="3" className="reply-edit">
                    <FormField label="Caption">
                        <Textarea value={editCaption} onChange={(e) => setEditCaption(e.target.value)} rows={3} />
                    </FormField>

                    <FormField label="Translation">
                        <Textarea value={editTranslation} onChange={(e) => setEditTranslation(e.target.value)} rows={3} />
                    </FormField>

                    <FormField label={<>Translator's Note <span className="form-optional">(optional)</span></>}>
                        <TextInput
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            placeholder="For example: slang, context, or nuance"
                        />
                    </FormField>

                    <FormField label={<>Media URL <span className="form-optional">(optional)</span></>}>
                        <TextInput type="url" value={editMediaURL} onChange={(e) => setEditMediaURL(e.target.value)} placeholder="https://..." />
                    </FormField>

                    <FormField label={<>Reply Date <span className="form-optional">(optional)</span></>}>
                        <TextInput type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                    </FormField>

                    <ReplyEditActions
                        onSave={saveEdit}
                        onCancel={() => {
                            setIsEditing(false);
                            setEditCaption(main.content || "");
                            setEditTranslation(main.translation || "");
                            setEditNote(main.note || "");
                            setEditMediaURL(main.media_url || "");
                            setEditDate(main.posted_at || "");
                        }}
                    />
                </Stack>
            )}
        </div>
    );
}
