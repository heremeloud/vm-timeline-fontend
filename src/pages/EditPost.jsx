import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getAdminPost, updatePost } from "../api/postsService";
import { getAuthors } from "../api/authorsService";
import { ROUTES } from "../routes";
import { isImage, isVideo } from "../utils/media";
import AutoResizeTextarea from "../components/AutoResizeTextarea";
import R2MediaUploader from "../components/R2MediaUploader";
import MediaUrlField from "../components/MediaUrlField";
import InstagramEmbed from "../components/InstagramEmbed";
import TikTokEmbed from "../components/TikTokEmbed";
import TweetEmbed from "../components/TweetEmbed";
import { deleteMediaObject } from "../api/mediaService";
import { bangkokDateTimeToUtc, cleanPastedPostUrl, detectMediaAuthor, detectMediaDate, detectPostDateTime, extractTikTokPostId, isInstagramChannelUrl, normalizePostUrl, utcToBangkokDateTime } from "../utils/postUrls";
import { isFromR2 } from "../utils/media";
import "../styles/EventForm.css";

const emptyStoryItem = () => ({ url: "", text: "", translation: "", note: "", attachment_type: "screenshot", deleteFromR2: false });

const appendUploadedUrls = (items, urls) => {
    const next = [...items];
    urls.forEach((url) => {
        const emptyIndex = next.findIndex((item) => !item.url.trim());
        if (emptyIndex >= 0) next[emptyIndex] = { ...next[emptyIndex], url };
        else next.push({ ...emptyStoryItem(), url });
    });
    return next;
};

const getStoryItemCount = (quantity) =>
    Math.min(100, Math.max(1, Math.floor(Number(quantity) || 1)));

const getLocalToday = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60 * 1000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const getSequentialStoryUrl = (url, offset) => {
    const cleanUrl = url.trim();
    const match = cleanUrl.match(/^(.*?)(\d+)(\.[^/.?#]+)([?#].*)?$/);
    if (!match) return "";

    const [, prefix, numberText, extension, suffix = ""] = match;
    const nextNumber = String(Number(numberText) + offset).padStart(numberText.length, "0");
    return `${prefix}${nextNumber}${extension}${suffix}`;
};

export default function EditPost() {
    const { postId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const returnTo = location.state?.returnTo;
    const mediaUploaderRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [post, setPost] = useState(null);

    // Author list
    const [authors, setAuthors] = useState([]);

    // Form fields
    const [platform, setPlatform] = useState("ig");
    const [contentType, setContentType] = useState("story");
    const [authorId, setAuthorId] = useState("");
    const [externalURL, setExternalURL] = useState("");
    const [externalId, setExternalId] = useState("");
    const [caption, setCaption] = useState("");
    const [captionTranslation, setCaptionTranslation] = useState("");
    const [captionTranslationNote, setCaptionTranslationNote] = useState("");
    const [timelineContext, setTimelineContext] = useState("");
    const [showTimelineContext, setShowTimelineContext] = useState(true);
    const [showTranslationNote, setShowTranslationNote] = useState(true);
    const [mediaURL, setMediaURL] = useState("");
    const [mediaItems, setMediaItems] = useState([emptyStoryItem()]);
    const [storyItemQuantity, setStoryItemQuantity] = useState(10);
    const [postedAt, setPostedAt] = useState("");
    const [postedTime, setPostedTime] = useState("");
    const [postedAtIsEstimated, setPostedAtIsEstimated] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const [isAdult, setIsAdult] = useState(false);
    const supportsExactPostTime = platform !== "ig" || contentType === "post";

    // -----------------------------
    // URL NORMALIZATION HELPERS
    // -----------------------------
    const normalizeInstagramURL = (url) => {
        return normalizePostUrl(url, "ig");
    };

    const normalizeTikTokURL = (url) => {
        if (!url) return "";
        let clean = url.trim().split("?")[0];
        clean = clean.replace("https://m.tiktok.com", "https://www.tiktok.com");
        if (!clean.startsWith("http")) clean = "https://" + clean;
        return clean;
    };

    const extractExternalId = (url, platform) => {
        if (!url) return "";
        if (platform === "ig") {
            const channelMatch = url.match(/\/channel\/[^/]+\/([^/?#]+)/i);
            if (channelMatch) return channelMatch[1];
            const parts = url.split("/p/");
            return parts?.[1]?.split("/")[0] || "";
        }
        if (platform === "x") {
            const parts = url.split("/status/");
            return parts?.[1]?.split("?")[0] || "";
        }
        if (platform === "tt") {
            return extractTikTokPostId(url);
        }
        return "";
    };

    // -----------------------------
    // LOAD POST + AUTHORS
    // -----------------------------
    useEffect(() => {
        async function load() {
            const aRes = await getAuthors();
            setAuthors(aRes.data);

            const res = await getAdminPost(postId);
            const p = res.data.post;

            setPost(p);
            setPlatform(p.platform);
            setContentType(p.content_type || (p.platform === "ig" && !p.external_url ? "story" : "post"));
            setAuthorId(p.author_id || "");
            setExternalURL(p.external_url || "");
            setExternalId(p.external_id || "");
            setCaption(p.caption || "");
            setCaptionTranslation(p.caption_translation || "");
            setCaptionTranslationNote(p.caption_translation_note || "");
            setTimelineContext(p.timeline_context || "");
            setShowTimelineContext(p.show_timeline_context ?? true);
            setShowTranslationNote(p.show_translation_note ?? true);
            setMediaURL(p.media_url || "");
            // media_urls is now an array of objects {url, text, translation, note}
            const parsed = p.media_urls && p.media_urls.length > 0
                ? p.media_urls.map((item) =>
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

    const previewItems = platform === "ig" && contentType !== "post"
        ? mediaItems.filter((item) => item.url.trim())
        : mediaURL.trim()
            ? [{ url: mediaURL.trim(), text: "", translation: "", note: "" }]
            : [];

    // -----------------------------
    // SAVE CHANGES
    // -----------------------------
    const addStoryItems = (quantity) => {
        const count = getStoryItemCount(quantity);
        setMediaItems((items) => [
            ...items,
            ...Array.from({ length: count }, emptyStoryItem),
        ]);
    };

    const removeMediaItem = async (index) => {
        const item = mediaItems[index];
        if (!item) return;

        if (item.deleteFromR2 && item.url.trim()) {
            const confirmed = window.confirm("Permanently delete this file from R2 now? This cannot be undone.");
            if (!confirmed) return;

            try {
                await deleteMediaObject(item.url.trim());
            } catch (error) {
                alert(error.response?.data?.detail || "Could not delete the file from R2.");
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

    const handlePostUrlPaste = (e) => {
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

    async function saveChanges(e) {
        e.preventDefault();
        let newURL = externalURL;

        if (platform === "ig") newURL = normalizeInstagramURL(newURL);
        else if (platform === "x") newURL = normalizePostUrl(newURL, platform);
        else if (platform === "tt") newURL = normalizeTikTokURL(newURL);

        const isIGCollection = platform === "ig" && contentType !== "post";
        let newlyUploadedUrls = [];
        try {
            newlyUploadedUrls = await mediaUploaderRef.current?.uploadPending() || [];
        } catch (uploadError) {
            alert(uploadError.response?.data?.detail || uploadError.message || "Media upload failed. The post was not saved.");
            return;
        }

        const effectiveMediaItems = isIGCollection
            ? appendUploadedUrls(mediaItems, newlyUploadedUrls)
            : mediaItems;
        const newId = extractExternalId(newURL, platform);
        const filteredMediaItems = isIGCollection
            ? effectiveMediaItems
                .map((item) => ({ ...item, url: item.url.trim() }))
                .filter((item) => item.url || (contentType === "broadcast" && (item.text.trim() || item.translation.trim() || item.note.trim())))
                .map((item) => ({
                    url: item.url,
                    text: item.text.trim() || null,
                    translation: item.translation.trim() || null,
                    note: item.note.trim() || null,
                    attachment_type: contentType === "broadcast" ? item.attachment_type || "screenshot" : null,
                }))
            : [];

        await updatePost(postId, {
            platform,
            content_type: platform === "ig" ? contentType : "post",
            author_id: authorId,
            external_url: newURL,
            external_id: newId,
            caption,
            caption_translation: captionTranslation,
            caption_translation_note: captionTranslationNote.trim() || null,
            timeline_context: timelineContext.trim() || null,
            show_timeline_context: showTimelineContext,
            show_translation_note: showTranslationNote,
            media_url: isIGCollection ? null : (newlyUploadedUrls[0] || mediaURL || null),
            media_urls_json: JSON.stringify(filteredMediaItems),
            posted_at: postedAt,
            posted_at_utc: supportsExactPostTime ? bangkokDateTimeToUtc(postedAt, postedTime) : null,
            posted_at_is_estimated: supportsExactPostTime && postedAtIsEstimated,
            is_visible: isVisible,
            is_adult: isAdult,
        });

        navigate(returnTo || ROUTES.postDetail(postId), { replace: true });
    }

    // -----------------------------
    // RENDER
    // -----------------------------
    return (
        <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
            <h2>Edit Post #{postId}</h2>

            <CompactPostPreview
                platform={platform}
                contentType={contentType}
                externalURL={externalURL}
                caption={caption}
                previewItems={previewItems}
                post={post}
            />

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
                        <label>Author <span className="form-required">*</span></label>
                        <select value={authorId} onChange={(e) => setAuthorId(Number(e.target.value))}>
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

                <div className="eventform-section">
                    <label>External URL</label>
                    <input
                        value={externalURL}
                        onChange={(e) => setExternalURL(e.target.value)}
                        onPaste={handlePostUrlPaste}
                    />
                </div>

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
                    <label>About This Post <span className="form-optional">(optional)</span></label>
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
                        Show “About this post”
                    </label>
                    <div className="eventform-field-note">Shown as curator-provided context, separate from the author's original caption.</div>
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
                                sequenceStart={mediaItems.filter((item) => item.url.trim()).length + 1}
                                onUploaded={(urls) => setMediaItems((items) => appendUploadedUrls(items, urls))}
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
                                        <button
                                            type="button"
                                            onClick={() => removeMediaItem(i)}
                                            className="form-remove-button"
                                            aria-label={`Remove media ${i + 1}`}
                                            title="Remove media"
                                        >
                                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                                <path d="M6 6l12 12M18 6L6 18" />
                                            </svg>
                                        </button>
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
                            <button
                                type="button"
                                onClick={() => addStoryItems(1)}
                                style={{ fontSize: "0.85rem", marginTop: 2, cursor: "pointer" }}
                            >
                                + Add another {contentType === "broadcast" ? "message" : "story item"}
                            </button>
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
                                <button
                                    type="button"
                                    onClick={() => addStoryItems(storyItemQuantity)}
                                    style={{ fontSize: "0.85rem", cursor: "pointer" }}
                                >
                                    + Add story items
                                </button>
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
                                onUploaded={(urls) => setMediaURL(urls[0] || "")}
                            />
                            <input
                                value={mediaURL}
                                onChange={(e) => setMediaURL(e.target.value)}
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
                    <button type="submit" className="form-primary-submit">Save Changes</button>
                </div>

            </form>
        </div>
    );
}

function CompactPostPreview({ platform, contentType, externalURL, caption, previewItems, post }) {
    const hasExternal = !!externalURL.trim();
    const hasMedia = previewItems.length > 0;
    const primaryMediaUrl = previewItems[0]?.url || "";
    const isInstagram = platform === "ig" || platform === "instagram";
    const canEmbedExternal = hasExternal && !(
        isInstagram && (contentType !== "post" || isInstagramChannelUrl(externalURL))
    );

    if (!hasExternal && !hasMedia && !caption) return null;

    return (
        <div
            className="eventform-section"
            style={{
                border: "1px solid rgba(0,0,0,0.14)",
                borderRadius: 8,
                padding: 12,
                background: "#fff",
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <strong style={{ fontSize: "0.95rem" }}>Current preview</strong>
                <span style={{ fontSize: "0.82rem", opacity: 0.65 }}>{platform}</span>
            </div>

            {hasExternal && (
                <div style={{ marginTop: 8, minWidth: 0 }}>
                    <a
                        href={externalURL}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: "block", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.86rem" }}
                    >
                        {externalURL}
                    </a>
                    {canEmbedExternal && <div className="edit-post-social-preview">
                        {platform === "x" || platform === "twitter" ? (
                            <TweetEmbed url={externalURL} />
                        ) : platform === "tt" || platform === "tiktok" ? (
                            <TikTokEmbed
                                external_url={externalURL}
                                media_url={primaryMediaUrl}
                                caption={caption}
                                author_id={post?.author_id}
                                author_name={post?.author_name}
                                author_photo={post?.author_photo}
                            />
                        ) : (
                            <InstagramEmbed
                                external_url={externalURL}
                                media_url={previewItems.length === 1 ? primaryMediaUrl : ""}
                                media_urls={previewItems.length > 1 ? previewItems : []}
                                caption={caption}
                                author_id={post?.author_id}
                                author_name={post?.author_name}
                                author_photo={post?.author_photo}
                                author_ig_pfp_url={post?.author_ig_pfp_url}
                                author_instagram_url={post?.author_instagram_url}
                            />
                        )}
                    </div>}
                </div>
            )}

            {hasMedia && (
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(82px, 1fr))",
                        gap: 8,
                        marginTop: 10,
                    }}
                >
                    {previewItems.map((item, index) => (
                        <CompactMediaTile key={`${item.url}-${index}`} item={item} index={index} />
                    ))}
                </div>
            )}

            {caption && (
                <div
                    style={{
                        marginTop: 10,
                        fontSize: "0.86rem",
                        opacity: 0.78,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    {caption}
                </div>
            )}
        </div>
    );
}

function CompactMediaTile({ item, index }) {
    const url = item.url.trim();
    const video = isVideo(url);
    const image = isImage(url);

    return (
        <div
            className="compact-media-tile"
            style={{ minWidth: 0 }}
            tabIndex={image || video ? 0 : undefined}
            aria-label={image || video ? `Preview media ${index + 1}` : undefined}
        >
            <div
                className="compact-media-thumbnail"
                style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "1 / 1",
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "#f4f4f4",
                    border: "1px solid rgba(0,0,0,0.08)",
                }}
            >
                {video ? (
                    <video
                        src={url}
                        muted
                        playsInline
                        preload="metadata"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                ) : image ? (
                    <img
                        src={url}
                        alt=""
                        loading="lazy"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                ) : (
                    <div style={{ padding: 8, fontSize: "0.72rem", wordBreak: "break-word" }}>Media</div>
                )}

                <span
                    style={{
                        position: "absolute",
                        left: 6,
                        top: 6,
                        borderRadius: 999,
                        padding: "2px 6px",
                        background: "rgba(0,0,0,0.62)",
                        color: "#fff",
                        fontSize: "0.7rem",
                    }}
                >
                    {index + 1}
                </span>
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
                <div style={{ marginTop: 4, fontSize: "0.72rem", opacity: 0.7 }}>
                    {item.translation ? "translation" : "note"}
                </div>
            )}
        </div>
    );
}
