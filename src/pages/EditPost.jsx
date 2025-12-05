import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/api";

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
    const [mediaURL, setMediaURL] = useState("");
    const [postedAt, setPostedAt] = useState("");

    // -----------------------------
    // URL NORMALIZATION HELPERS
    // -----------------------------
    const normalizeInstagramURL = (url) => {
        if (!url) return "";
        let clean = url.split("?")[0];
        if (!clean.endsWith("/")) clean += "/";
        return clean.replace("https://instagram.com", "https://www.instagram.com");
    };

    const normalizeTwitterURL = (url) => {
        if (!url) return "";
        return url
            .replace("https://x.com", "https://twitter.com")
            .replace("http://x.com", "https://twitter.com")
            .replace("https://www.x.com", "https://twitter.com");
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

        return "";
    };

    // -----------------------------
    // LOAD POST + AUTHORS
    // -----------------------------
    useEffect(() => {
        async function load() {
            // Load authors
            const aRes = await api.get("/authors/");
            setAuthors(aRes.data);

            // Load post
            const res = await api.get(`/posts/${postId}`);
            const p = res.data.post;

            setPost(p);
            setPlatform(p.platform);
            setAuthorId(p.author_id || "");
            setExternalURL(p.external_url || "");
            setExternalId(p.external_id || "");
            setCaption(p.caption || "");
            setCaptionTranslation(p.caption_translation || "");
            setMediaURL(p.media_url || "");
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
    async function saveChanges() {
        let newURL = externalURL;

        if (platform === "ig") {
            newURL = normalizeInstagramURL(newURL);
        } else {
            newURL = normalizeTwitterURL(newURL);
        }

        const newId = extractExternalId(newURL, platform);

        await api.patch(`/posts/${postId}`, {
            platform,
            author_id: authorId,   // IMPORTANT FIX
            external_url: newURL,
            external_id: newId,
            caption,
            caption_translation: captionTranslation,
            media_url: mediaURL || null,
            posted_at: postedAt,
        });

        navigate("/");
    }

    // -----------------------------
    // RENDER
    // -----------------------------
    return (
        <div style={{ padding: 20 }}>
            <h2>Edit Post #{postId}</h2>

            {/* PLATFORM */}
            <label>Platform:</label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
                <option value="ig">Instagram</option>
                <option value="x">Twitter</option>
            </select>

            <br /><br />

            {/* AUTHOR */}
            <label>Author:</label>
            <select
                value={authorId}
                onChange={(e) => setAuthorId(Number(e.target.value))}
            >
                <option value="">-- select author --</option>
                {authors.map((a) => (
                    <option key={a.id} value={a.id}>
                        {a.name}
                    </option>
                ))}
            </select>

            <br /><br />

            {/* EXTERNAL URL */}
            <label>External URL:</label>
            <input
                value={externalURL}
                onChange={(e) => setExternalURL(e.target.value)}
                style={{ width: "100%" }}
            />

            <br /><br />

            {/* EXTERNAL ID */}
            <label>External ID:</label>
            <input
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
                style={{ width: "100%" }}
            />

            <br /><br />

            {/* CAPTION */}
            <label>Caption:</label>
            <textarea
                rows={3}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                style={{ width: "100%" }}
            />

            <br /><br />

            {/* TRANSLATION */}
            <label>Caption Translation:</label>
            <textarea
                rows={3}
                value={captionTranslation}
                onChange={(e) => setCaptionTranslation(e.target.value)}
                style={{ width: "100%" }}
            />

            <br /><br />

            {/* MEDIA */}
            <label>Media URL:</label>
            <input
                value={mediaURL}
                onChange={(e) => setMediaURL(e.target.value)}
                placeholder="https://..."
                style={{ width: "100%" }}
            />

            <br /><br />

            {/* DATE */}
            <label>Posted At:</label>
            <input
                type="date"
                value={postedAt}
                onChange={(e) => setPostedAt(e.target.value)}
            />

            <br /><br />

            <button onClick={saveChanges} style={{ padding: "8px 16px" }}>
                Save Changes
            </button>
        </div>
    );
}
