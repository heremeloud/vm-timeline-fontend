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
    const [mediaURLs, setMediaURLs] = useState([""]);
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
            const parsed = p.media_urls && p.media_urls.length > 0
                ? p.media_urls
                : p.media_url
                    ? [p.media_url]
                    : [""];
            setMediaURLs(parsed);
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
        const filteredMediaURLs = isIGStory
            ? mediaURLs.map((u) => u.trim()).filter(Boolean)
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
            media_urls_json: JSON.stringify(filteredMediaURLs),
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
                            <label>Story Media URLs:</label>
                            {mediaURLs.map((url, i) => (
                                <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                                    <input
                                        value={url}
                                        onChange={(e) => {
                                            const next = [...mediaURLs];
                                            next[i] = e.target.value;
                                            setMediaURLs(next);
                                        }}
                                        placeholder={`Media URL #${i + 1}`}
                                        style={{ flex: 1 }}
                                    />
                                    {mediaURLs.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => setMediaURLs(mediaURLs.filter((_, j) => j !== i))}
                                            style={{ color: "red", background: "none", border: "1px solid red", borderRadius: 4, cursor: "pointer", padding: "0 8px" }}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => setMediaURLs([...mediaURLs, ""])}
                                style={{ fontSize: "0.85rem", marginTop: 2, cursor: "pointer" }}
                            >
                                + Add another media URL
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
