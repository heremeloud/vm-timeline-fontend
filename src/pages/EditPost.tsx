import { Component, useState, useEffect, useRef } from "react";
import type { ClipboardEvent, FormEvent, ReactNode } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { archiveInstagramPost, getAdminPost, updatePost } from "../api/postsService";
import { getAuthors } from "../api/authorsService";
import { ROUTES } from "../routes";
import { isImage, isVideo } from "../utils/media";
import AutoResizeTextarea from "../components/AutoResizeTextarea";
import R2MediaUploader from "../components/R2MediaUploader";
import type { R2MediaUploaderHandle } from "../components/R2MediaUploader";
import MediaUrlField from "../components/MediaUrlField";
import InstagramEmbed from "../components/InstagramEmbed";
import TikTokEmbed from "../components/TikTokEmbed";
import TweetEmbed from "../components/TweetEmbed";
import { deleteMediaObject } from "../api/mediaService";
import { bangkokDateTimeToUtc, cleanPastedPostUrl, detectMediaAuthor, detectMediaDate, detectPostDateTime, isInstagramChannelUrl, isInstagramPostUrl, normalizePostUrl, utcToBangkokDateTime } from "../utils/postUrls";
import { isFromR2 } from "../utils/media";
import { appendUploadedUrls, nextMediaSequence } from "../utils/mediaItemOrder";
import { Button } from "../ui";
import { getLocalToday } from "../utils/dates";
import { errorDetail } from "../utils/errors";
import { emptyStoryItem, extractExternalId, getSequentialStoryUrl, getStoryItemCount, normalizeInstagramURL, normalizeTikTokURL } from "../utils/postForm";
import type { StoryItem } from "../utils/postForm";
import type { Author, Id, MediaItem, Post } from "../types/models";
import "../styles/EventForm.css";

export default function EditPost() {
    const { postId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const returnTo = location.state?.returnTo;
    const mediaUploaderRef = useRef<R2MediaUploaderHandle>(null);

    const [loading, setLoading] = useState(true);
    const [post, setPost] = useState<Post | null>(null);

    // Author list
    const [authors, setAuthors] = useState<Author[]>([]);

    // Form fields
    const [platform, setPlatform] = useState("ig");
    const [contentType, setContentType] = useState("story");
    const [authorId, setAuthorId] = useState<Id | "">("");
    const [tempAuthorName, setTempAuthorName] = useState("");
    const [tempAuthorPfpUrl, setTempAuthorPfpUrl] = useState("");
    const [externalURL, setExternalURL] = useState("");
    const [externalId, setExternalId] = useState("");
    const [caption, setCaption] = useState("");
    const [captionTranslation, setCaptionTranslation] = useState("");
    const [captionTranslationNote, setCaptionTranslationNote] = useState("");
    const [timelineContext, setTimelineContext] = useState("");
    const [showTimelineContext, setShowTimelineContext] = useState(false);
    const [showOnRelatedPage, setShowOnRelatedPage] = useState(true);
    const [showTranslationNote, setShowTranslationNote] = useState(true);
    const [mediaURL, setMediaURL] = useState("");
    const [mediaItems, setMediaItems] = useState<StoryItem[]>([emptyStoryItem()]);
    const [displaySource, setDisplaySource] = useState("external");
    const [storyItemQuantity, setStoryItemQuantity] = useState<number | string>(10);
    const [postedAt, setPostedAt] = useState("");
    const [postedTime, setPostedTime] = useState("");
    const [postedAtIsEstimated, setPostedAtIsEstimated] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const [isAdult, setIsAdult] = useState(false);
    const [archiving, setArchiving] = useState(false);
    const [archiveMessage, setArchiveMessage] = useState("");
    const supportsExactPostTime = platform !== "ig" || contentType === "post";

    // -----------------------------
    // LOAD POST + AUTHORS
    // -----------------------------
    useEffect(() => {
        async function load() {
            const aRes = await getAuthors();
            setAuthors(aRes.data);

            const res = await getAdminPost(postId ?? "");
            const p = res.data.post;

            setPost(p);
            setPlatform(p.platform);
            setContentType(p.content_type || (p.platform === "ig" && !p.external_url ? "story" : "post"));
            setAuthorId(p.author_id || "");
            setTempAuthorName(p.temp_author_name || "");
            setTempAuthorPfpUrl(p.temp_author_pfp_url || "");
            setExternalURL(p.external_url || "");
            setExternalId(p.external_id || "");
            setCaption(p.caption || "");
            setCaptionTranslation(p.caption_translation || "");
            setCaptionTranslationNote(p.caption_translation_note || "");
            setTimelineContext(p.timeline_context || "");
            setShowTimelineContext(Boolean(p.timeline_context?.trim()) && p.show_timeline_context === true);
            setShowOnRelatedPage(p.show_on_related_page ?? true);
            setShowTranslationNote(p.show_translation_note ?? true);
            setMediaURL(p.media_url || "");
            setDisplaySource(p.display_source || "external");
            // media_urls is now an array of objects {url, text, translation, note}
            const parsed: StoryItem[] = p.media_urls && p.media_urls.length > 0
                ? p.media_urls.map((item: MediaItem | string) =>
                    typeof item === "string"
                        ? { url: item, text: "", translation: "", note: "", deleteFromR2: false }
                        : { url: item.url || "", text: item.text || "", translation: item.translation || "", note: item.note || "", attachment_type: item.attachment_type || "screenshot", deleteFromR2: false }
                )
                : p.media_url
                    ? [{ url: p.media_url, text: "", translation: "", note: "", deleteFromR2: false }]
                    : [emptyStoryItem()];
            setMediaItems(parsed);
            setPostedAt(p.posted_at || "");
            setPostedTime(utcToBangkokDateTime(p.posted_at_utc)?.time || "");
            setPostedAtIsEstimated(p.posted_at_is_estimated ?? false);
            setIsVisible(p.is_visible ?? true);
            setIsAdult(p.is_adult ?? false);

            setLoading(false);
        }
        load();
    }, [postId]);

    if (loading) return <div>Loading...</div>;
    if (!post) return <div>Post not found</div>;

    const previewItems = platform === "ig"
        ? mediaItems.filter((item) => item.url.trim())
        : mediaURL.trim()
            ? [{ url: mediaURL.trim(), text: "", translation: "", note: "" }]
            : [];

    // -----------------------------
    // SAVE CHANGES
    // -----------------------------
    const addStoryItems = (quantity: number | string) => {
        const count = getStoryItemCount(quantity);
        setMediaItems((items) => [
            ...items,
            ...Array.from({ length: count }, emptyStoryItem),
        ]);
    };

    const removeMediaItem = async (index: number) => {
        const item = mediaItems[index];
        if (!item) return;

        if (item.deleteFromR2 && item.url.trim()) {
            const confirmed = window.confirm("Permanently delete this file from R2 now? This cannot be undone.");
            if (!confirmed) return;

            try {
                await deleteMediaObject(item.url.trim());
            } catch (error) {
                alert(errorDetail(error, "Could not delete the file from R2."));
                return;
            }
        }

        setMediaItems((items) => items.filter((_, itemIndex) => itemIndex !== index));
    };

    const generateStoryItemUrls = () => {
        const firstUrl = mediaItems[0]?.url.trim() || "";
        const firstGeneratedUrl = getSequentialStoryUrl(firstUrl, 0);
        if (!firstGeneratedUrl) {
            alert("Paste a first media URL ending in a number before the file extension.");
            return;
        }

        const count = getStoryItemCount(storyItemQuantity);
        setMediaItems((items) =>
            Array.from({ length: count }, (_, i) => ({
                ...(items[i] || emptyStoryItem()),
                url: getSequentialStoryUrl(firstUrl, i),
            })),
        );
    };

    const handlePostUrlPaste = (e: ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const pastedUrl = e.clipboardData.getData("text").trim();
        if (!isFromR2(pastedUrl)) {
            cleanPastedPostUrl(
                e,
                platform,
                setExternalURL,
                setPlatform,
                authors,
                (detectedAuthor) => setAuthorId(detectedAuthor.id),
            );
            if (isInstagramChannelUrl(pastedUrl)) setContentType("broadcast");
            else if (isInstagramPostUrl(pastedUrl)) setContentType("post");
            const detectedDateTime = detectPostDateTime(pastedUrl);
            if (detectedDateTime) {
                setPostedAt(detectedDateTime.date);
                setPostedTime(detectedDateTime.time);
                setPostedAtIsEstimated(detectedDateTime.estimated);
            }
            return;
        }

        e.preventDefault();
        setPlatform("ig");
        setContentType("story");
        setExternalURL("");
        setMediaItems((items) => {
            const emptyIndex = items.findIndex((item) => !item.url.trim());
            if (emptyIndex < 0) return [...items, { ...emptyStoryItem(), url: pastedUrl }];
            return items.map((item, index) => index === emptyIndex ? { ...item, url: pastedUrl } : item);
        });

        const detectedAuthor = detectMediaAuthor(pastedUrl, authors);
        if (detectedAuthor) setAuthorId(detectedAuthor.id);
        const detectedDate = detectMediaDate(pastedUrl);
        if (detectedDate) setPostedAt(detectedDate);
    };

    const setSingleMediaUrl = (value: string) => {
        setMediaURL(value);
        setMediaItems((items) => [
            { ...(items[0] || emptyStoryItem()), url: value },
            ...items.slice(1),
        ]);
    };

    const handleArchiveInstagramPost = async () => {
        const savedAuthorId = post.author_id || "";
        const archiveFieldsChanged =
            externalURL.trim() !== (post.external_url || "").trim()
            || postedAt !== (post.posted_at || "")
            || authorId !== savedAuthorId
            || tempAuthorName.trim() !== (post.temp_author_name || "").trim()
            || platform !== post.platform
            || contentType !== post.content_type;
        if (archiveFieldsChanged) {
            alert("Save the post URL, author, date, and content type before archiving.");
            return;
        }
        if (caption.trim() && !window.confirm("Archive the original Instagram media and replace the saved caption with Instagram's current caption?")) {
            return;
        }

        setArchiving(true);
        setArchiveMessage("");
        try {
            const response = await archiveInstagramPost(Number(postId));
            const archivedPost = response.data.post;
            const archivedItems = (archivedPost.media_urls || []).map((item) =>
                typeof item === "string"
                    ? { ...emptyStoryItem(), url: item }
                    : {
                        ...emptyStoryItem(),
                        url: item.url || "",
                        text: item.text ?? "",
                        translation: item.translation ?? "",
                        note: item.note ?? "",
                        attachment_type: item.attachment_type ?? undefined,
                    }
            );
            setPost(archivedPost);
            setCaption(archivedPost.caption || "");
            setMediaURL(archivedPost.media_url || "");
            setMediaItems(archivedItems.length ? archivedItems : [emptyStoryItem()]);
            setDisplaySource(archivedPost.display_source || "r2");
            setArchiveMessage(`Archived ${response.data.media_urls.length} media ${response.data.media_urls.length === 1 ? "item" : "items"} to R2.`);
        } catch (error) {
            setArchiveMessage(errorDetail(error, (error instanceof Error && error.message) || "Instagram archive failed."));
        } finally {
            setArchiving(false);
        }
    };

    async function saveChanges(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!tempAuthorName.trim() && !authorId) {
            alert("Select an author or enter a post-specific author.");
            return;
        }
        let newURL = externalURL;

        if (platform === "ig") newURL = normalizeInstagramURL(newURL);
        else if (platform === "x") newURL = normalizePostUrl(newURL, platform);
        else if (platform === "tt") newURL = normalizeTikTokURL(newURL);

        const isIGCollection = platform === "ig" && contentType !== "post";
        const isIGPost = platform === "ig" && contentType === "post";
        let newlyUploadedUrls: string[] = [];
        try {
            newlyUploadedUrls = await mediaUploaderRef.current?.uploadPending() || [];
        } catch (uploadError) {
            alert(errorDetail(uploadError, (uploadError instanceof Error && uploadError.message) || "Media upload failed. The post was not saved."));
            return;
        }

        const effectiveMediaItems = isIGCollection
            ? appendUploadedUrls(mediaItems, newlyUploadedUrls, emptyStoryItem)
            : isIGPost && newlyUploadedUrls.length
                ? [{ ...emptyStoryItem(), url: newlyUploadedUrls[0] }]
            : mediaItems;
        const newId = extractExternalId(newURL, platform);
        const filteredMediaItems = (isIGCollection || isIGPost)
            ? effectiveMediaItems
                .map((item) => ({ ...item, url: item.url.trim() }))
                .filter((item) => item.url || (contentType === "broadcast" && (item.text?.trim() || item.translation?.trim() || item.note?.trim())))
                .map((item) => ({
                    url: item.url,
                    text: item.text?.trim() || null,
                    translation: item.translation?.trim() || null,
                    note: item.note?.trim() || null,
                    attachment_type: contentType === "broadcast" ? item.attachment_type || "screenshot" : null,
                }))
            : [];

        await updatePost(postId ?? "", {
            platform,
            content_type: platform === "ig" ? contentType : "post",
            author_id: tempAuthorName.trim() ? null : authorId || null,
            temp_author_name: tempAuthorName.trim() || null,
            temp_author_pfp_url: tempAuthorName.trim() ? tempAuthorPfpUrl.trim() || null : null,
            external_url: newURL,
            external_id: newId,
            caption,
            caption_translation: captionTranslation,
            caption_translation_note: captionTranslationNote.trim() || null,
            timeline_context: timelineContext.trim() || null,
            show_timeline_context: showTimelineContext,
            show_on_related_page: showOnRelatedPage,
            show_translation_note: showTranslationNote,
            media_url: isIGCollection ? null : (newlyUploadedUrls[0] || filteredMediaItems[0]?.url || mediaURL || null),
            media_urls_json: JSON.stringify(filteredMediaItems),
            display_source: displaySource,
            posted_at: postedAt,
            posted_at_utc: supportsExactPostTime ? bangkokDateTimeToUtc(postedAt, postedTime) : null,
            posted_at_is_estimated: supportsExactPostTime && postedAtIsEstimated,
            is_visible: isVisible,
            is_adult: isAdult,
        });

        navigate(returnTo || ROUTES.postDetail(postId ?? ""), { replace: true });
    }

    // -----------------------------
    // RENDER
    // -----------------------------
    return (
        <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
            <h2>Edit Post #{postId}</h2>

            <PreviewErrorBoundary resetKey={displaySource}>
                <CompactPostPreview
                    platform={platform}
                    contentType={contentType}
                    externalURL={externalURL}
                    caption={caption}
                    previewItems={previewItems}
                    displaySource={displaySource}
                    post={post}
                />
            </PreviewErrorBoundary>

            <form id="edit-post-form" className="eventform-form" onSubmit={saveChanges}>

                <div className="eventform-section">
                    <label>Platform</label>
                    <select
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value)}
                    >
                        <option value="ig">Instagram</option>
                        <option value="x">Twitter</option>
                        <option value="tt">TikTok</option>
                    </select>
                </div>

                {platform === "ig" && (
                    <div className="eventform-section">
                        <label>Instagram Content Type</label>
                        <select value={contentType} onChange={(e) => {
                            const next = e.target.value;
                            setContentType(next);
                            if (next !== "post") setExternalURL("");
                        }}>
                            <option value="story">Story</option>
                            <option value="broadcast">Broadcast channel</option>
                            <option value="post">Post / Reel</option>
                        </select>
                    </div>
                )}

                <div className="eventform-section eventform-author-date-row">
                    <div>
                        <label>Saved Author {!tempAuthorName.trim() && <span className="form-required">*</span>}</label>
                        <select value={authorId} onChange={(e) => setAuthorId(e.target.value ? Number(e.target.value) : "")}>
                            <option value="">-- Select Author --</option>
                            {authors.map((a) => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label>Posted At <span className="form-required">*</span></label>
                        <div className="eventform-date-row">
                            <input type="date" value={postedAt} onChange={(e) => setPostedAt(e.target.value)} />
                            {supportsExactPostTime && <input
                                type="time"
                                step="1"
                                value={postedTime}
                                onChange={(e) => {
                                    setPostedTime(e.target.value);
                                    setPostedAtIsEstimated(false);
                                }}
                                aria-label="Posting time in Bangkok"
                                title="Bangkok time (UTC+7)"
                            />}
                            <label className="eventform-today-toggle">
                                <input
                                    type="checkbox"
                                    checked={postedAt === getLocalToday()}
                                    onChange={(e) => setPostedAt(e.target.checked ? getLocalToday() : "")}
                                />
                                Today
                            </label>
                        </div>
                        {supportsExactPostTime && <div className="eventform-field-note">URLs auto-fill this when possible. Instagram times are estimates. Time is shown in Bangkok (UTC+7) and stored as UTC.</div>}
                    </div>
                </div>

                

                {tempAuthorName.trim() && (
                    <div className="eventform-section">
                        <label>Post-specific PFP URL <span className="form-optional">(optional)</span></label>
                        <input
                            type="url"
                            value={tempAuthorPfpUrl}
                            onChange={(e) => setTempAuthorPfpUrl(e.target.value)}
                            placeholder="https://..."
                        />
                        <div className="eventform-field-note">Leave blank to use the selected author's existing profile photo.</div>
                    </div>
                )}

                <div className="eventform-section">
                    <label>External Post URL</label>
                    <input
                        value={externalURL}
                        onChange={(e) => setExternalURL(e.target.value)}
                        onPaste={handlePostUrlPaste}
                    />
                    {platform === "ig" && contentType === "post" && externalURL.trim() && (
                        <div style={{ marginTop: 8 }}>
                            <button
                                type="button"
                                onClick={handleArchiveInstagramPost}
                                disabled={archiving}
                                className="form-secondary-button"
                            >
                                {archiving ? "Archiving from Instagram…" : "Download media to R2 & save caption"}
                            </button>
                            <div className="eventform-field-note">
                                Archives the saved Instagram URL. Save URL, author, or date changes first.
                            </div>
                            {archiveMessage && (
                                <div role="status" style={{ marginTop: 6, fontSize: "0.9rem" }}>{archiveMessage}</div>
                            )}
                        </div>
                    )}
                </div>

                <div className="eventform-section">
                    <label>Post-specific Author <span className="form-optional">(optional)</span></label>
                    <input
                        type="text"
                        value={tempAuthorName}
                        onChange={(e) => setTempAuthorName(e.target.value)}
                        placeholder="Display a different author on this post only"
                    />
                    <div className="eventform-field-note">This overrides the displayed name without adding an author to the directory.</div>
                </div>

                {platform === "ig" && contentType === "post" && externalURL.trim() && previewItems.some((item) => isFromR2(item.url)) && (
                    <div className="eventform-section">
                        <label>Displayed Instagram Source</label>
                        <select value={displaySource} onChange={(e) => setDisplaySource(e.target.value)}>
                            <option value="r2">Archived R2 media</option>
                            <option value="external">Original Instagram embed</option>
                        </select>
                        <div className="eventform-field-note">
                            Both sources remain saved. You can switch this later without re-uploading.
                        </div>
                    </div>
                )}

                <div className="eventform-section">
                    <label>External ID</label>
                    <input
                        value={externalId}
                        onChange={(e) => setExternalId(e.target.value)}
                    />
                </div>

                <div className="eventform-section">
                    <label>Caption</label>
                    <AutoResizeTextarea
                        rows={3}
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                    />
                </div>

                <div className="eventform-section">
                    <label>Caption Translation</label>
                    <AutoResizeTextarea
                        rows={3}
                        value={captionTranslation}
                        onChange={(e) => setCaptionTranslation(e.target.value)}
                    />
                </div>

                <div className="eventform-section">
                    <label>Translator's Note <span className="form-optional">(optional)</span></label>
                    <AutoResizeTextarea
                        value={captionTranslationNote}
                        onChange={(e) => setCaptionTranslationNote(e.target.value)}
                        placeholder="For example: slang, context, or nuance"
                        style={{ minHeight: 80 }}
                    />
                    <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                        <input
                            type="checkbox"
                            checked={showTranslationNote}
                            onChange={(e) => setShowTranslationNote(e.target.checked)}
                        />
                        Show translator's note
                    </label>
                </div>

                <div className="eventform-section">
                    <label>Related Event / Project <span className="form-optional">(optional)</span></label>
                    <AutoResizeTextarea
                        value={timelineContext}
                        onChange={(e) => setTimelineContext(e.target.value)}
                        placeholder="Explain what this post relates to. Add an event or project hashtag to link it."
                        style={{ minHeight: 72 }}
                    />
                    <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                        <input
                            type="checkbox"
                            checked={showTimelineContext}
                            onChange={(e) => setShowTimelineContext(e.target.checked)}
                        />
                        Show “Related Event / Project”
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                        <input
                            type="checkbox"
                            checked={showOnRelatedPage}
                            onChange={(e) => setShowOnRelatedPage(e.target.checked)}
                        />
                        Show post on related event page
                    </label>
                    <div className="eventform-field-note">The first checkbox controls the label on the post. The second controls whether the post appears on the related page.</div>
                </div>

                <div className="eventform-section">
                    {platform === "ig" && contentType !== "post" ? (
                        <>
                            <label>{contentType === "broadcast" ? "Channel Messages:" : "Story Items:"}</label>
                            <R2MediaUploader
                                ref={mediaUploaderRef}
                                multiple
                                author={authors.find((item) => item.id === Number(authorId))?.name || ""}
                                postedAt={postedAt}
                                mediaType={contentType === "broadcast" ? "bc" : "igs"}
                                sequenceStart={nextMediaSequence(mediaItems)}
                                onUploaded={(urls) => setMediaItems((items) => appendUploadedUrls(items, urls, emptyStoryItem))}
                            />
                            {mediaItems.map((item, i) => (
                                <div key={i} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10, marginBottom: 10 }}>
                                    <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                                        <MediaUrlField
                                            value={item.url}
                                            onChange={(e) => {
                                                const next = [...mediaItems];
                                                next[i] = { ...next[i], url: e.target.value };
                                                setMediaItems(next);
                                            }}
                                            onPaste={(e) => {
                                                const pastedUrl = e.clipboardData.getData("text");
                                                const detectedAuthor = detectMediaAuthor(pastedUrl, authors);
                                                if (detectedAuthor) setAuthorId(detectedAuthor.id);
                                                const detectedDate = detectMediaDate(pastedUrl);
                                                if (detectedDate) setPostedAt(detectedDate);
                                            }}
                                            placeholder={contentType === "broadcast" ? "Photo or screenshot URL" : `Media URL ${i + 1}`}
                                        />
                                        {isFromR2(item.url) && (
                                            <label
                                                className="r2-delete-toggle"
                                                title="Also delete this file from R2 when removed"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={item.deleteFromR2 || false}
                                                    onChange={(event) => {
                                                        const next = [...mediaItems];
                                                        next[i] = { ...next[i], deleteFromR2: event.target.checked };
                                                        setMediaItems(next);
                                                    }}
                                                />
                                                <span>R2</span>
                                            </label>
                                        )}
                                        <Button
                                            variant="danger"
                                            size="small"
                                            onClick={() => removeMediaItem(i)}
                                            className="form-remove-button"
                                            aria-label={`Remove media ${i + 1}`}
                                            title="Remove media"
                                        >
                                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                                <path d="M6 6l12 12M18 6L6 18" />
                                            </svg>
                                        </Button>
                                    </div>
                                    {item.deleteFromR2 && (
                                        <div className="r2-delete-warning">
                                            Warning: clicking X will permanently delete this file from R2 immediately.
                                        </div>
                                    )}
                                    {contentType === "broadcast" && item.url.trim() && (
                                        <select
                                            value={item.attachment_type || "screenshot"}
                                            onChange={(e) => {
                                                const next = [...mediaItems];
                                                next[i] = { ...next[i], attachment_type: e.target.value };
                                                setMediaItems(next);
                                            }}
                                            aria-label={`Attachment type for message ${i + 1}`}
                                            style={{ marginBottom: 6 }}
                                        >
                                            <option value="screenshot">Screenshot of message</option>
                                            <option value="photo">Photo included in message</option>
                                        </select>
                                    )}
                                    <AutoResizeTextarea
                                        value={item.text}
                                        onChange={(e) => {
                                            const next = [...mediaItems];
                                            next[i] = { ...next[i], text: e.target.value };
                                            setMediaItems(next);
                                        }}
                                        placeholder={contentType === "broadcast" ? "Message text" : "Enter text"}
                                        style={{ width: "100%", minHeight: 56, marginBottom: 4, boxSizing: "border-box" }}
                                    />
                                    <AutoResizeTextarea
                                        value={item.translation}
                                        onChange={(e) => {
                                            const next = [...mediaItems];
                                            next[i] = { ...next[i], translation: e.target.value };
                                            setMediaItems(next);
                                        }}
                                        placeholder="Enter a translation"
                                        style={{ width: "100%", minHeight: 56, marginBottom: 4, boxSizing: "border-box" }}
                                    />
                                    <AutoResizeTextarea
                                        value={item.note}
                                        onChange={(e) => {
                                            const next = [...mediaItems];
                                            next[i] = { ...next[i], note: e.target.value };
                                            setMediaItems(next);
                                        }}
                                        placeholder="Add translator's note"
                                        style={{ width: "100%", minHeight: 56, marginBottom: 4, boxSizing: "border-box" }}
                                    />
                                </div>
                            ))}
                            <Button
                                variant="add"
                                size="small"
                                onClick={() => addStoryItems(1)}
                                style={{ marginTop: 2 }}
                            >
                                + Add another {contentType === "broadcast" ? "message" : "story item"}
                            </Button>
                            {contentType === "story" && <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={storyItemQuantity}
                                    onChange={(e) => setStoryItemQuantity(e.target.value)}
                                    style={{ width: 90 }}
                                    aria-label="Story item quantity"
                                />
                                <Button
                                    variant="add"
                                    size="small"
                                    onClick={() => addStoryItems(storyItemQuantity)}
                                >
                                    + Add story items
                                </Button>
                                <button
                                    type="button"
                                    onClick={generateStoryItemUrls}
                                    style={{ fontSize: "0.85rem", cursor: "pointer" }}
                                >
                                    Generate story URLs
                                </button>
                            </div>}
                        </>
                    ) : (
                        <>
                            <label>Media URL</label>
                            <R2MediaUploader
                                ref={mediaUploaderRef}
                                author={authors.find((item) => item.id === Number(authorId))?.name || ""}
                                postedAt={postedAt}
                                mediaType={platform === "ig" ? "ig" : platform}
                                onUploaded={(urls) => setSingleMediaUrl(urls[0] || "")}
                            />
                            <input
                                value={mediaURL}
                                onChange={(e) => setSingleMediaUrl(e.target.value)}
                                onPaste={(e) => {
                                    const pastedUrl = e.clipboardData.getData("text");
                                    const detectedAuthor = detectMediaAuthor(pastedUrl, authors);
                                    if (detectedAuthor) setAuthorId(detectedAuthor.id);
                                    const detectedDate = detectMediaDate(pastedUrl);
                                    if (detectedDate) setPostedAt(detectedDate);
                                }}
                                placeholder="https://..."
                            />
                        </>
                    )}
                </div>

                <div className="eventform-section">
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
                        <input
                            type="checkbox"
                            checked={isVisible}
                            onChange={(e) => setIsVisible(e.target.checked)}
                        />
                        Show this post on the public timeline
                    </label>
                </div>

                <div className="eventform-section">
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, color: "#b00" }}>
                        <input
                            type="checkbox"
                            checked={isAdult}
                            onChange={(e) => setIsAdult(e.target.checked)}
                        />
                        🔞 Adult content (hides embed, shows link only)
                    </label>
                </div>

                <div className="eventform-section">
                    <Button type="submit" variant="save" size="large">Save Changes</Button>
                </div>

            </form>
        </div>
    );
}

class PreviewErrorBoundary extends Component<{ resetKey: string; children: ReactNode }, { failed: boolean }> {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidUpdate(previousProps: { resetKey: string }) {
        if (this.state.failed && previousProps.resetKey !== this.props.resetKey) {
            this.setState({ failed: false });
        }
    }

    componentDidCatch(error: unknown) {
        console.error("Post preview failed:", error);
    }

    render() {
        if (this.state.failed) {
            return (
                <div className="eventform-section" role="alert">
                    Preview unavailable. Your edits are still intact and can be saved.
                </div>
            );
        }
        return this.props.children;
    }
}

interface CompactPostPreviewProps {
    platform: string;
    contentType: string;
    externalURL: string;
    caption: string;
    previewItems: StoryItem[] | MediaItem[];
    displaySource: string;
    post: Post | null;
}

function CompactPostPreview({ platform, contentType, externalURL, caption, previewItems, displaySource, post }: CompactPostPreviewProps) {
    const hasExternal = !!externalURL.trim();
    const hasMedia = previewItems.length > 0;
    const primaryMediaUrl = previewItems[0]?.url || "";
    const isInstagram = platform === "ig" || platform === "instagram";
    const canEmbedExternal = hasExternal && !(
        isInstagram && (contentType !== "post" || isInstagramChannelUrl(externalURL))
    );
    const instagramAuthor = {
        author_id: post?.author_id,
        author_name: post?.author_name,
        author_photo: post?.author_photo,
        author_ig_pfp_url: post?.author_ig_pfp_url,
        author_instagram_url: post?.author_instagram_url,
    };

    if (!hasExternal && !hasMedia && !caption) return null;

    return (
        <div className="eventform-section edit-post-preview">
            <div className="edit-post-preview__header">
                <strong className="edit-post-preview__title">Current preview</strong>
                <span className="edit-post-preview__platform">{platform}</span>
            </div>

            {hasExternal && (
                <div className="edit-post-preview__external">
                    <a
                        href={externalURL}
                        target="_blank"
                        rel="noreferrer"
                        className="edit-post-preview__link"
                    >
                        {externalURL}
                    </a>
                    {canEmbedExternal && <div className="edit-post-social-preview">
                        {platform === "x" || platform === "twitter" ? (
                            <TweetEmbed url={externalURL} />
                        ) : platform === "tt" || platform === "tiktok" ? (
                            <TikTokEmbed external_url={externalURL} media_url={primaryMediaUrl} />
                        ) : (
                            <>
                                <div hidden={displaySource !== "external"}>
                                    <InstagramEmbed
                                        external_url={externalURL}
                                        display_source="external"
                                        content_type={contentType}
                                        caption={caption}
                                        {...instagramAuthor}
                                    />
                                </div>
                                <div hidden={displaySource !== "r2"}>
                                    <InstagramEmbed
                                        external_url={externalURL}
                                        media_url={previewItems.length === 1 ? primaryMediaUrl : ""}
                                        media_urls={previewItems.length > 1 ? previewItems : []}
                                        display_source="r2"
                                        content_type={contentType}
                                        caption={caption}
                                        {...instagramAuthor}
                                    />
                                </div>
                            </>
                        )}
                    </div>}
                </div>
            )}

            {hasMedia && (
                <div className="edit-post-preview__media-grid">
                    {previewItems.map((item, index) => (
                        <CompactMediaTile key={`${item.url}-${index}`} item={item} index={index} />
                    ))}
                </div>
            )}

            {caption && <div className="edit-post-preview__caption">{caption}</div>}
        </div>
    );
}

function CompactMediaTile({ item, index }: { item: StoryItem | MediaItem; index: number }) {
    const url = item.url.trim();
    const video = isVideo(url);
    const image = isImage(url);

    return (
        <div
            className="compact-media-tile"
            tabIndex={image || video ? 0 : undefined}
            aria-label={image || video ? `Preview media ${index + 1}` : undefined}
        >
            <div className="compact-media-thumbnail">
                {video ? (
                    <video src={url} className="compact-media-fill" muted playsInline preload="metadata" />
                ) : image ? (
                    <img src={url} alt="" className="compact-media-fill" loading="lazy" />
                ) : (
                    <div className="compact-media-fallback">Media</div>
                )}

                <span className="compact-media-index">{index + 1}</span>
            </div>

            {(image || video) && (
                <div className="compact-media-hover-preview" aria-hidden="true">
                    {video ? (
                        <video src={url} muted autoPlay loop playsInline preload="metadata" />
                    ) : (
                        <img src={url} alt="" loading="lazy" />
                    )}
                    <span>Media {index + 1}</span>
                </div>
            )}

            {(item.translation || item.note) && (
                <div className="compact-media-caption">{item.translation ? "translation" : "note"}</div>
            )}
        </div>
    );
}
