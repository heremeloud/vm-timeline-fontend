import { useState, useEffect } from "react";
import { createPost } from "../api/postsService";
import { getAuthors, ensureAuthor } from "../api/authorsService";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "../routes";
import "../styles/EventForm.css";

export default function CreatePost() {
    const navigate = useNavigate();
    const [params] = useSearchParams();

    // If this is a reply page: /create-post?parent=3
    const parent_id = params.get("parent")
        ? Number(params.get("parent"))
        : null;

    // platform: ig or x
    const [platform, setPlatform] = useState("ig");

    // form fields
    const [external_url, setExternalURL] = useState("");
    const [posted_at, setPostedAt] = useState("");

    const [caption, setCaption] = useState("");
    const [captionTranslation, setCaptionTranslation] = useState("");
    const [captionTranslationNote, setCaptionTranslationNote] = useState("");
    const [mediaURL, setMediaURL] = useState("");
    // Multiple media items for IG stories: [{url, text, translation, note}]
    const [mediaItems, setMediaItems] = useState([{ url: "", text: "", translation: "", note: "" }]);

    // Author list from backend
    const [authors, setAuthors] = useState([]);
    const [author, setAuthor] = useState("");
    const [newAuthorName, setNewAuthorName] = useState("");
    const [newAuthorPhoto, setNewAuthorPhoto] = useState("");

    // Load authors on page mount
    useEffect(() => {
        async function loadAuthors() {
            const res = await getAuthors();
            setAuthors(res.data);
        }
        loadAuthors();
    }, []);

    /** Normalize URLs **/

    const normalizeTweetURL = (url) => {
        if (!url) return "";
        return url
            .replace("https://x.com", "https://twitter.com")
            .replace("http://x.com", "https://twitter.com")
            .replace("https://www.x.com", "https://twitter.com");
    };

    const normalizeInstagramURL = (url) => {
        if (!url) return "";
        let clean = url.split("?")[0];
        if (!clean.endsWith("/")) clean += "/";
        clean = clean.replace(
            "https://instagram.com",
            "https://www.instagram.com",
        );
        return clean;
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

    // If this is a reply → force platform = x
    useEffect(() => {
        if (parent_id) setPlatform("x");
    }, [parent_id]);

    /** ---------------- SUBMIT ---------------- **/

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
            });
            const authorId = authorRes.data.id;

            let cleanURL = external_url;
            if (platform === "x") cleanURL = normalizeTweetURL(cleanURL);
            if (platform === "ig") cleanURL = normalizeInstagramURL(cleanURL);
            if (platform === "tt") cleanURL = normalizeTikTokURL(cleanURL);

            const external_id = extractExternalId(cleanURL, platform);

            const isIGStory = platform === "ig" && !cleanURL;
            const finalMediaUrl = isIGStory ? null : (mediaURL || null);
            const filteredMediaItems = isIGStory
                ? mediaItems
                    .map((item) => ({ ...item, url: item.url.trim() }))
                    .filter((item) => item.url)
                    .map((item) => ({
                        url: item.url,
                        text: item.text.trim() || null,
                        translation: item.translation.trim() || null,
                        note: item.note.trim() || null,
                    }))
                : [];

            await createPost({
                platform,
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
                    </>
                )}

                <div className="eventform-section">
                    <label>Post URL:</label>
                    <input
                        value={external_url}
                        onChange={(e) => setExternalURL(e.target.value)}
                        placeholder="Paste tweet or IG URL"
                    />
                </div>

                <div className="eventform-section">
                    <label>Caption / Tweet Text:</label>
                    <textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Optional original caption"
                        style={{ minHeight: 80 }}
                    />
                </div>

                <div className="eventform-section">
                    <label>Translation:</label>
                    <textarea
                        value={captionTranslation}
                        onChange={(e) => setCaptionTranslation(e.target.value)}
                        placeholder="Optional translation"
                        style={{ minHeight: 80 }}
                    />
                </div>

                <div className="eventform-section">
                    <label>Translator's note (optional):</label>
                    <input
                        type="text"
                        value={captionTranslationNote}
                        onChange={(e) => setCaptionTranslationNote(e.target.value)}
                        placeholder="e.g. slang, context, nuance…"
                    />
                </div>

                <div className="eventform-section">
                    {/* IG story: multi-item list with optional text/translation/note per item */}
                    {platform === "ig" && !external_url.trim() ? (
                        <>
                            <label>Story Items:</label>
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
                                            placeholder={`Media URL #${i + 1}`}
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
                                    <textarea
                                        value={item.text}
                                        onChange={(e) => {
                                            const next = [...mediaItems];
                                            next[i] = { ...next[i], text: e.target.value };
                                            setMediaItems(next);
                                        }}
                                        placeholder="Text (optional)"
                                        rows={2}
                                        style={{ width: "100%", marginBottom: 4, boxSizing: "border-box" }}
                                    />
                                    <textarea
                                        value={item.translation}
                                        onChange={(e) => {
                                            const next = [...mediaItems];
                                            next[i] = { ...next[i], translation: e.target.value };
                                            setMediaItems(next);
                                        }}
                                        placeholder="Translation (optional)"
                                        rows={2}
                                        style={{ width: "100%", marginBottom: 4, boxSizing: "border-box" }}
                                    />
                                    <input
                                        value={item.note}
                                        onChange={(e) => {
                                            const next = [...mediaItems];
                                            next[i] = { ...next[i], note: e.target.value };
                                            setMediaItems(next);
                                        }}
                                        placeholder="Translator's note (optional)"
                                        style={{ width: "100%", boxSizing: "border-box" }}
                                    />
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => setMediaItems([...mediaItems, { url: "", text: "", translation: "", note: "" }])}
                                style={{ fontSize: "0.85rem", marginTop: 2, cursor: "pointer" }}
                            >
                                + Add another story item
                            </button>
                        </>
                    ) : (
                        <>
                            <label>Media URL (optional):</label>
                            <input
                                value={mediaURL}
                                onChange={(e) => setMediaURL(e.target.value)}
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
                    <button type="submit">
                        {parent_id ? "Save Reply" : "Save Post"}
                    </button>
                </div>

            </form>
        </div>
    );
}
