import { useState, useEffect } from "react";
import { createPost } from "../api/postsService";
import { getAuthors, ensureAuthor } from "../api/authorsService";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "../routes";
import AutoResizeTextarea from "../components/AutoResizeTextarea";
import { cleanPastedPostUrl, detectMediaAuthor, detectMediaDate, normalizePostUrl } from "../utils/postUrls";
import { isFromR2 } from "../utils/media";
import "../styles/EventForm.css";

const emptyStoryItem = () => ({ url: "", text: "", translation: "", note: "", attachment_type: "screenshot" });

const getStoryItemCount = (quantity) =>
    Math.min(100, Math.max(1, Math.floor(Number(quantity) || 1)));

const getSequentialStoryUrl = (url, offset) => {
    const cleanUrl = url.trim();
    const match = cleanUrl.match(/^(.*?)(\d+)(\.[^/.?#]+)([?#].*)?$/);
    if (!match) return "";

    const [, prefix, numberText, extension, suffix = ""] = match;
    const nextNumber = String(Number(numberText) + offset).padStart(numberText.length, "0");
    return `${prefix}${nextNumber}${extension}${suffix}`;
};

export default function CreatePost() {
    const navigate = useNavigate();
    const [params] = useSearchParams();

    // If this is a reply page: /create-post?parent=3
    const parent_id = params.get("parent")
        ? Number(params.get("parent"))
        : null;

    // platform: ig or x
    const [platform, setPlatform] = useState(parent_id ? "x" : "ig");
    const [contentType, setContentType] = useState("post");

    // form fields
    const [external_url, setExternalURL] = useState("");
    const [posted_at, setPostedAt] = useState("");

    const [caption, setCaption] = useState("");
    const [captionTranslation, setCaptionTranslation] = useState("");
    const [captionTranslationNote, setCaptionTranslationNote] = useState("");
    const [mediaURL, setMediaURL] = useState("");
    const [isVisible, setIsVisible] = useState(true);
    const [isAdult, setIsAdult] = useState(false);
    // Multiple media items for IG stories: [{url, text, translation, note}]
    const [mediaItems, setMediaItems] = useState([emptyStoryItem()]);
    const [storyItemQuantity, setStoryItemQuantity] = useState(10);

    // Author list from backend
    const [authors, setAuthors] = useState([]);
    const [author, setAuthor] = useState("");
    const [newAuthorName, setNewAuthorName] = useState("");
    const [newAuthorPhoto, setNewAuthorPhoto] = useState("");
    const [newAuthorInstagramURL, setNewAuthorInstagramURL] = useState("");
    const [newAuthorInstagramPhoto, setNewAuthorInstagramPhoto] = useState("");
    const [newAuthorTwitterURL, setNewAuthorTwitterURL] = useState("");
    const [newAuthorTwitterPhoto, setNewAuthorTwitterPhoto] = useState("");
    const [newAuthorTikTokPhoto, setNewAuthorTikTokPhoto] = useState("");

    // Load authors on page mount
    useEffect(() => {
        async function loadAuthors() {
            const res = await getAuthors();
            setAuthors(res.data);
        }
        loadAuthors();
    }, []);

    /** Normalize URLs **/

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

    const extractTikTokVideoId = (url) => {
        if (!url) return "";
        const m = url.match(/\/video\/(\d+)/);
        return m?.[1] || "";
    };

    /** Extract tweet ID or IG shortcode **/

    const extractExternalId = (url, platform) => {
        if (!url) return "";

        if (platform === "ig") {
            const parts = url.split("/p/");
            if (parts.length > 1) return parts[1].split("/")[0];
            return "";
        }

        if (platform === "x") {
            const parts = url.split("/status/");
            if (parts.length > 1) return parts[1].split("?")[0];
            return "";
        }

        if (platform === "tt") {
            return extractTikTokVideoId(url);
        }

        return "";
    };

    /** ---------------- SUBMIT ---------------- **/

    const addStoryItems = (quantity) => {
        const count = getStoryItemCount(quantity);
        setMediaItems((items) => [
            ...items,
            ...Array.from({ length: count }, emptyStoryItem),
        ]);
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
                (detectedAuthor) => setAuthor(detectedAuthor.name),
            );
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
        if (detectedAuthor) setAuthor(detectedAuthor.name);
        const detectedDate = detectMediaDate(pastedUrl);
        if (detectedDate) setPostedAt(detectedDate);
    };

    const submit = async (e) => {
        e.preventDefault();
        try {
            let finalAuthor = author;

            if (author === "__new__") {
                if (!newAuthorName.trim()) {
                    alert("Please enter the new author's name.");
                    return;
                }
                finalAuthor = newAuthorName.trim();
            }

            const authorRes = await ensureAuthor({
                name: finalAuthor,
                profile_photo_url:
                    author === "__new__" ? newAuthorPhoto || null : null,
                ig_pfp_url:
                    author === "__new__" ? newAuthorInstagramPhoto || null : null,
                instagram_url:
                    author === "__new__" ? newAuthorInstagramURL || null : null,
                twitter_pfp_url:
                    author === "__new__" ? newAuthorTwitterPhoto || null : null,
                twitter_url:
                    author === "__new__" ? newAuthorTwitterURL || null : null,
                tiktok_pfp_url:
                    author === "__new__" ? newAuthorTikTokPhoto || null : null,
            });
            const authorId = authorRes.data.id;

            let cleanURL = external_url;
            if (platform === "x") cleanURL = normalizePostUrl(cleanURL, platform);
            if (platform === "ig") cleanURL = normalizeInstagramURL(cleanURL);
            if (platform === "tt") cleanURL = normalizeTikTokURL(cleanURL);

            const external_id = extractExternalId(cleanURL, platform);

            const isIGCollection = platform === "ig" && contentType !== "post";
            const finalMediaUrl = isIGCollection ? null : (mediaURL || null);
            const filteredMediaItems = isIGCollection
                ? mediaItems
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

            await createPost({
                platform,
                content_type: platform === "ig" ? contentType : "post",
                external_url: cleanURL,
                external_id,
                author_id: authorId,
                caption,
                caption_translation: captionTranslation,
                caption_translation_note: captionTranslationNote.trim() || null,
                media_url: finalMediaUrl,
                media_urls_json: JSON.stringify(filteredMediaItems),
                posted_at,
                parent_id: parent_id || null,
                is_visible: isVisible,
                is_adult: isAdult,
            });

            navigate(ROUTES.home);
        } catch (err) {
            console.error("CreatePost error:", err);
            alert("Error creating post. Check console for details.");
        }
    };

    /** ---------------- RENDER UI ---------------- **/

    return (
        <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
            <h2>{parent_id ? "Add Tweet Reply" : "Create New Post"}</h2>

            {parent_id && (
                <p style={{ color: "gray" }}>Replying to Post ID: {parent_id}</p>
            )}

            <form className="eventform-form" onSubmit={submit}>

                <div className="eventform-section">
                    <label>Platform:</label>
                    <select
                        value={platform}
                        disabled={!!parent_id}
                        onChange={(e) => setPlatform(e.target.value)}
                    >
                        <option value="ig">Instagram</option>
                        <option value="x">X (Twitter)</option>
                        <option value="tt">TikTok</option>
                    </select>
                </div>

                {platform === "ig" && !parent_id && (
                    <div className="eventform-section">
                        <label>Instagram content type:</label>
                        <select value={contentType} onChange={(e) => {
                            const next = e.target.value;
                            setContentType(next);
                            if (next !== "post") setExternalURL("");
                        }}>
                            <option value="post">Post / Reel</option>
                            <option value="story">Story</option>
                            <option value="broadcast">Broadcast channel</option>
                        </select>
                    </div>
                )}

                <div className="eventform-section">
                    <label>Author:</label>
                    <select
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                    >
                        <option value="">-- select author --</option>
                        {authors.map((a) => (
                            <option key={a.id} value={a.name}>{a.name}</option>
                        ))}
                        <option value="__new__">+ Add New Author</option>
                    </select>
                </div>

                {author === "__new__" && (
                    <>
                        <div className="eventform-section">
                            <label>New Author Name:</label>
                            <input
                                type="text"
                                value={newAuthorName}
                                onChange={(e) => setNewAuthorName(e.target.value)}
                                placeholder="Enter name"
                            />
                        </div>

                        <div className="eventform-section">
                            <label>Profile Photo URL (optional):</label>
                            <input
                                type="text"
                                value={newAuthorPhoto}
                                onChange={(e) => setNewAuthorPhoto(e.target.value)}
                                placeholder="https://..."
                            />
                        </div>

                        <div className="eventform-section">
                            <label>Instagram PFP URL (optional):</label>
                            <input
                                type="text"
                                value={newAuthorInstagramPhoto}
                                onChange={(e) => setNewAuthorInstagramPhoto(e.target.value)}
                                placeholder="https://..."
                            />
                        </div>

                        <div className="eventform-section">
                            <label>Instagram URL (optional):</label>
                            <input
                                type="text"
                                value={newAuthorInstagramURL}
                                onChange={(e) => setNewAuthorInstagramURL(e.target.value)}
                                placeholder="https://instagram.com/..."
                            />
                        </div>

                        <div className="eventform-section">
                            <label>Twitter / X PFP URL (optional):</label>
                            <input
                                type="text"
                                value={newAuthorTwitterPhoto}
                                onChange={(e) => setNewAuthorTwitterPhoto(e.target.value)}
                                placeholder="https://..."
                            />
                        </div>

                        <div className="eventform-section">
                            <label>Twitter / X URL (optional):</label>
                            <input
                                type="text"
                                value={newAuthorTwitterURL}
                                onChange={(e) => setNewAuthorTwitterURL(e.target.value)}
                                placeholder="https://x.com/..."
                            />
                        </div>

                        <div className="eventform-section">
                            <label>TikTok PFP URL (optional):</label>
                            <input
                                type="text"
                                value={newAuthorTikTokPhoto}
                                onChange={(e) => setNewAuthorTikTokPhoto(e.target.value)}
                                placeholder="https://..."
                            />
                        </div>
                    </>
                )}

                <div className="eventform-section">
                    <label>Post URL:</label>
                    <input
                        value={external_url}
                        onChange={(e) => setExternalURL(e.target.value)}
                        onPaste={handlePostUrlPaste}
                        placeholder="Paste tweet or IG URL"
                    />
                </div>

                <div className="eventform-section">
                    <label>Caption / Tweet Text:</label>
                    <AutoResizeTextarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Optional original caption"
                        style={{ minHeight: 80 }}
                    />
                </div>

                <div className="eventform-section">
                    <label>Translation:</label>
                    <AutoResizeTextarea
                        value={captionTranslation}
                        onChange={(e) => setCaptionTranslation(e.target.value)}
                        placeholder="Optional translation"
                        style={{ minHeight: 80 }}
                    />
                </div>

                <div className="eventform-section">
                    <label>Translator's note (optional):</label>
                    <AutoResizeTextarea
                        value={captionTranslationNote}
                        onChange={(e) => setCaptionTranslationNote(e.target.value)}
                        placeholder="e.g. slang, context, nuance…"
                        style={{ minHeight: 80 }}
                    />
                </div>

                <div className="eventform-section">
                    {/* IG story: multi-item list with optional text/translation/note per item */}
                    {platform === "ig" && contentType !== "post" ? (
                        <>
                            <label>{contentType === "broadcast" ? "Channel Messages:" : "Story Items:"}</label>
                            {mediaItems.map((item, i) => (
                                <div key={i} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10, marginBottom: 10 }}>
                                    <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                                        <input
                                            value={item.url}
                                            onChange={(e) => {
                                                const next = [...mediaItems];
                                                next[i] = { ...next[i], url: e.target.value };
                                                setMediaItems(next);
                                            }}
                                            onPaste={(e) => {
                                                const pastedUrl = e.clipboardData.getData("text");
                                                const detectedAuthor = detectMediaAuthor(pastedUrl, authors);
                                                if (detectedAuthor) setAuthor(detectedAuthor.name);
                                                const detectedDate = detectMediaDate(pastedUrl);
                                                if (detectedDate) setPostedAt(detectedDate);
                                            }}
                                            placeholder={contentType === "broadcast" ? "Photo or screenshot URL (optional)" : `Media URL #${i + 1}`}
                                            style={{ flex: 1 }}
                                        />
                                        {mediaItems.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => setMediaItems(mediaItems.filter((_, j) => j !== i))}
                                                style={{ color: "red", background: "none", border: "1px solid red", borderRadius: 4, cursor: "pointer", padding: "0 8px" }}
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
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
                                        placeholder={contentType === "broadcast" ? "Message text" : "Text (optional)"}
                                        style={{ width: "100%", minHeight: 56, marginBottom: 4, boxSizing: "border-box" }}
                                    />
                                    <AutoResizeTextarea
                                        value={item.translation}
                                        onChange={(e) => {
                                            const next = [...mediaItems];
                                            next[i] = { ...next[i], translation: e.target.value };
                                            setMediaItems(next);
                                        }}
                                        placeholder="Translation (optional)"
                                        style={{ width: "100%", minHeight: 56, marginBottom: 4, boxSizing: "border-box" }}
                                    />
                                    <AutoResizeTextarea
                                        value={item.note}
                                        onChange={(e) => {
                                            const next = [...mediaItems];
                                            next[i] = { ...next[i], note: e.target.value };
                                            setMediaItems(next);
                                        }}
                                        placeholder="Translator's note (optional)"
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
                            <label>Media URL (optional):</label>
                            <input
                                value={mediaURL}
                                onChange={(e) => setMediaURL(e.target.value)}
                                onPaste={(e) => {
                                    const pastedUrl = e.clipboardData.getData("text");
                                    const detectedAuthor = detectMediaAuthor(pastedUrl, authors);
                                    if (detectedAuthor) setAuthor(detectedAuthor.name);
                                    const detectedDate = detectMediaDate(pastedUrl);
                                    if (detectedDate) setPostedAt(detectedDate);
                                }}
                                placeholder="Image / video URL"
                            />
                        </>
                    )}
                </div>

                <div className="eventform-section">
                    <label>Posted At:</label>
                    <input
                        type="date"
                        value={posted_at}
                        onChange={(e) => setPostedAt(e.target.value)}
                        style={{ width: 180 }}
                    />
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
                    <small style={{ opacity: 0.7 }}>
                        New authors are hidden until you allow them at /manage-display.
                    </small>
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
                    <button type="submit">
                        {parent_id ? "Save Reply" : "Save Post"}
                    </button>
                </div>

            </form>
        </div>
    );
}
