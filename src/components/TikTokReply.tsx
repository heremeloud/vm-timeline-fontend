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

function isVideo(url?: string | null) {
    if (!url) return false;
    return (
        url.endsWith(".mp4") ||
        url.endsWith(".webm") ||
        url.endsWith(".mov")
    );
}

export default function TikTokReply({ reply }: { reply: PostText }) {
    const main = reply;

    const [isEditing, setIsEditing] = useState(false);
    const [editCaption, setEditCaption] = useState(main.content || "");
    const [editTranslation, setEditTranslation] = useState(main.translation || "");
    const [editNote, setEditNote] = useState(main.note || "");
    const [editDate, setEditDate] = useState(main.posted_at || "");

    async function handleDelete() {
        if (!confirm("Delete this TikTok reply (caption + translation)?")) {
            return;
        }
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
            posted_at: editDate || null,
        });
        window.location.reload();
    }

    return (
        <div className="igreply-container">
            {!isEditing && (
                <>
                    <div className="igreply-row ttreply-row">
                        <Avatar
                            url={main.author_tiktok_pfp_url || main.author_photo}
                            authorId={main.author_id}
                            name={main.author_name}
                        />

                        <div className="igreply-content">
                            <div className="igreply-author">
                                {main.author_name} :
                            </div>

                            {main.content && (
                                <div className="igreply-caption">
                                    {main.content}
                                </div>
                            )}

                            {main.translation && (
                                <div className="igreply-translation">
                                    {main.translation}
                                    {main.note && (
                                        <div className="igreply-note">
                                            📝 {main.note}
                                        </div>
                                    )}
                                </div>
                            )}

                            {main.media_url && (
                                <div className="igreply-media">
                                    {isYouTube(main.media_url) ? (
                                        <iframe
                                            src={getYouTubeEmbed(main.media_url)}
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
                                                (e.currentTarget.style.display = "none")
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
                                                (e.currentTarget.style.display = "none")
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
                            setEditDate(main.posted_at || "");
                        }}
                    />
                </Stack>
            )}
        </div>
    );
}
