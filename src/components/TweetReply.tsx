import { useEffect, useState } from "react";
import { deletePost, updatePost } from "../api/postsService";
import TweetEmbed from "./TweetEmbed";
import { errorDetail } from "../utils/errors";
import { ReplyAdminActions, ReplyEditActions } from "./ReplyActions";
import { Checkbox, FormField, Stack, TextInput, Textarea } from "../ui";
import type { Post } from "../types/models";
import AdultTweetCard from "./AdultTweetCard";
import "../styles/PostCard.css";

export default function TweetReply({ reply }: { reply: Post }) {
    const [isEditing, setIsEditing] = useState(false);

    const [editUrl, setEditUrl] = useState(reply.external_url || "");
    const [editCaption, setEditCaption] = useState(reply.caption ?? "");
    const [editTranslation, setEditTranslation] = useState(
        reply.caption_translation ?? ""
    );
    const [editTranslationNote, setEditTranslationNote] = useState(
        reply.caption_translation_note || ""
    );
    const [editMedia, setEditMedia] = useState(reply.media_url ?? "");
    const [editDate, setEditDate] = useState(reply.posted_at || "");
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
            alert("Delete failed: " + errorDetail(err, err instanceof Error ? err.message : "Unknown error"));
        }
    }

    async function saveEdit() {
        await updatePost(reply.id, {
            external_url: editUrl || null,
            caption: editCaption,
            caption_translation: editTranslation,
            caption_translation_note: editTranslationNote.trim() || null,
            media_url: editMedia || null,
            posted_at: editDate || null,
            is_adult: editIsAdult,
        });

        window.location.reload();
    }

    return (
        <div className="tweet-reply">
            {/* Show translation + buttons only when not editing */}
            {!isEditing && (
                <>
                    {reply.is_adult ? (
                        <AdultTweetCard tweet={reply} />
                    ) : (
                        <>
                            <TweetEmbed url={reply.external_url} />
                            {reply.caption_translation && (
                                <div className="post-caption-translation tweet-reply__translation">
                                    {reply.caption_translation}
                                </div>
                            )}
                            {reply.caption_translation_note && (reply.show_translation_note ?? true) && (
                                <p className="post-translation-note">📝 {reply.caption_translation_note}</p>
                            )}
                            {reply.media_url && (
                                <img src={reply.media_url} alt="reply-media" className="tweet-reply__media" />
                            )}
                        </>
                    )}

                    <ReplyAdminActions onEdit={() => setIsEditing(true)} onDelete={handleDelete} />
                </>
            )}

            {/* ================= EDIT MODE ================= */}
            {isEditing && (
                <Stack gap="3" className="reply-edit">
                    <FormField label="Tweet URL">
                        <TextInput value={editUrl} onChange={(e) => setEditUrl(e.target.value)} />
                    </FormField>

                    <FormField label="Caption">
                        <Textarea value={editCaption} onChange={(e) => setEditCaption(e.target.value)} rows={3} />
                    </FormField>

                    <FormField label="Translation">
                        <Textarea value={editTranslation} onChange={(e) => setEditTranslation(e.target.value)} rows={3} />
                    </FormField>

                    <FormField label={<>Translator's Note <span className="form-optional">(optional)</span></>}>
                        <Textarea value={editTranslationNote} onChange={(e) => setEditTranslationNote(e.target.value)} rows={2} />
                    </FormField>

                    <FormField label="Media URL">
                        <TextInput value={editMedia} onChange={(e) => setEditMedia(e.target.value)} />
                    </FormField>

                    <FormField label="Reply Date">
                        <TextInput type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                    </FormField>

                    <Checkbox
                        className="reply-edit__adult"
                        label="🔞 Adult content"
                        checked={editIsAdult}
                        onChange={(e) => setEditIsAdult(e.target.checked)}
                    />

                    <ReplyEditActions onSave={saveEdit} onCancel={() => setIsEditing(false)} />
                </Stack>
            )}
        </div>
    );
}
