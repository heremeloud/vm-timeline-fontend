import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPost, updatePost } from "../api/postsService";
import { getAuthors } from "../api/authorsService";
import { ROUTES } from "../routes";
import "../styles/EventForm.css";

export default function EditPost() {
    const { postId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [post, setPost] = useState(null);

    // Author list
    const [authors, setAuthors] = useState([]);

    // Form fields
    const [platform, setPlatform] = useState("ig");
    const [authorId, setAuthorId] = useState("");
    const [externalURL, setExternalURL] = useState("");
    const [externalId, setExternalId] = useState("");
    const [caption, setCaption] = useState("");
    const [captionTranslation, setCaptionTranslation] = useState("");
    const [captionTranslationNote, setCaptionTranslationNote] = useState("");
    const [mediaURL, setMediaURL] = useState("");
    const [mediaItems, setMediaItems] = useState([{ url: "", text: "", translation: "", note: "" }]);
    const [postedAt, setPostedAt] = useState("");

    // -----------------------------
    // URL NORMALIZATION HELPERS
    // -----------------------------
    const normalizeInstagramURL = (url) => {
        if (!url) return "";
        let clean = url.split("?")[0];
        if (!clean.endsWith("/")) clean += "/";
        return clean.replace(
            "https://instagram.com",
            "https://www.instagram.com",
        );
    };

    const normalizeTwitterURL = (url) => {
        if (!url) return "";
        return url
            .replace("https://x.com", "https://twitter.com")
            .replace("http://x.com", "https://twitter.com")
            .replace("https://www.x.com", "https://twitter.com");
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
            const parts = url.split("/p/");
            return parts?.[1]?.split("/")[0] || "";
        }
        if (platform === "x") {
            const parts = url.split("/status/");
            return parts?.[1]?.split("?")[0] || "";
        }
        if (platform === "tt") {
            const m = url.match(/\/video\/(\d+)/);
            return m?.[1] || "";
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

            const res = await getPost(postId);
            const p = res.data.post;

            setPost(p);
            setPlatform(p.platform);
            setAuthorId(p.author_id || "");
            setExternalURL(p.external_url || "");
            setExternalId(p.external_id || "");
            setCaption(p.caption || "");
            setCaptionTranslation(p.caption_translation || "");
            setCaptionTranslationNote(p.caption_translation_note || "");
            setMediaURL(p.media_url || "");
            // media_urls is now an array of objects {url, text, translation, note}
            const parsed = p.media_urls && p.media_urls.length > 0
                ? p.media_urls.map((item) =>
                    typeof item === "string"
                        ? { url: item, text: "", translation: "", note: "" }
                        : { url: item.url || "", text: item.text || "", translation: item.translation || "", note: item.note || "" }
                )
                : p.media_url
                    ? [{ url: p.media_url, text: "", translation: "", note: "" }]
                    : [{ url: "", text: "", translation: "", note: "" }];
            setMediaItems(parsed);
            setPostedAt(p.posted_at || "");

            setLoading(false);
        }
        load();
    }, [postId]);

    if (loading) return <div>Loading...</div>;
    if (!post) return <div>Post not found</div>;

    // -----------------------------
    // SAVE CHANGES
    // -----------------------------
    async function saveChanges(e) {
        e.preventDefault();
        let newURL = externalURL;

        if (platform === "ig") newURL = normalizeInstagramURL(newURL);
        else if (platform === "x") newURL = normalizeTwitterURL(newURL);
        else if (platform === "tt") newURL = normalizeTikTokURL(newURL);

        const newId = extractExternalId(newURL, platform);
        const isIGStory = platform === "ig" && !newURL.trim();
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

        await updatePost(postId, {
            platform,
            author_id: authorId,
            external_url: newURL,
            external_id: newId,
            caption,
            caption_translation: captionTranslation,
            caption_translation_note: captionTranslationNote.trim() || null,
            media_url: isIGStory ? null : (mediaURL || null),
            media_urls_json: JSON.stringify(filteredMediaItems),
            posted_at: postedAt,
        });

        navigate(ROUTES.home);
    }

    // -----------------------------
    // RENDER
    // -----------------------------
    return (
        <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
            <h2>Edit Post #{postId}</h2>

            <form className="eventform-form" onSubmit={saveChanges}>

                <div className="eventform-section">
                    <label>Platform:</label>
                    <select
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value)}
                    >
                        <option value="ig">Instagram</option>
                        <option value="x">Twitter</option>
                        <option value="tt">TikTok</option>
                    </select>
                </div>

                <div className="eventform-section">
                    <label>Author:</label>
                    <select
                        value={authorId}
                        onChange={(e) => setAuthorId(Number(e.target.value))}
                    >
                        <option value="">-- select author --</option>
                        {authors.map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                    </select>
                </div>

                <div className="eventform-section">
                    <label>External URL:</label>
                    <input
                        value={externalURL}
                        onChange={(e) => setExternalURL(e.target.value)}
                    />
                </div>

                <div className="eventform-section">
                    <label>External ID:</label>
                    <input
                        value={externalId}
                        onChange={(e) => setExternalId(e.target.value)}
                    />
                </div>

                <div className="eventform-section">
                    <label>Caption:</label>
                    <textarea
                        rows={3}
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                    />
                </div>

                <div className="eventform-section">
                    <label>Caption Translation:</label>
                    <textarea
                        rows={3}
                        value={captionTranslation}
                        onChange={(e) => setCaptionTranslation(e.target.value)}
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
                    {platform === "ig" && !externalURL.trim() ? (
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
                            <label>Media URL:</label>
                            <input
                                value={mediaURL}
                                onChange={(e) => setMediaURL(e.target.value)}
                                placeholder="https://..."
                            />
                        </>
                    )}
                </div>

                <div className="eventform-section">
                    <label>Posted At:</label>
                    <input
                        type="date"
                        value={postedAt}
                        onChange={(e) => setPostedAt(e.target.value)}
                        style={{ width: 180 }}
                    />
                </div>

                <div className="eventform-section">
                    <button type="submit">Save Changes</button>
                </div>

            </form>
        </div>
    );
}
