import { useState, useEffect } from "react";
import api from "../api/api";
import { useNavigate, useSearchParams } from "react-router-dom";

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
    const [mediaURL, setMediaURL] = useState("");

    // Author list from backend
    const [authors, setAuthors] = useState([]);
    const [author, setAuthor] = useState("");
    const [newAuthorName, setNewAuthorName] = useState("");
    const [newAuthorPhoto, setNewAuthorPhoto] = useState("");

    // Load authors on page mount
    useEffect(() => {
        async function loadAuthors() {
            const res = await api.get("/authors/");
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
        // normalize mobile subdomain if you want
        clean = clean.replace("https://m.tiktok.com", "https://www.tiktok.com");
        if (!clean.startsWith("http")) clean = "https://" + clean;
        return clean;
    };

    const extractTikTokVideoId = (url) => {
        if (!url) return "";
        // match .../video/<digits>
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

            // If user chose + Add New Author
            if (author === "__new__") {
                if (!newAuthorName.trim()) {
                    alert("Please enter the new author's name.");
                    return;
                }
                finalAuthor = newAuthorName.trim();
            }

            // Ensure this author exists
            const authorRes = await api.post("/authors/ensure", {
                name: finalAuthor,
                profile_photo_url:
                    author === "__new__" ? newAuthorPhoto || null : null,
            });
            const authorId = authorRes.data.id;

            // Clean + normalize URL
            let cleanURL = external_url;
            if (platform === "x") cleanURL = normalizeTweetURL(cleanURL);
            if (platform === "ig") cleanURL = normalizeInstagramURL(cleanURL);
            if (platform === "tt") cleanURL = normalizeTikTokURL(cleanURL);

            const external_id = extractExternalId(cleanURL, platform);


            // Create post
            await api.post("/posts/", {
                platform,
                external_url: cleanURL,
                external_id,
                author_id: authorId,
                caption,
                caption_translation: captionTranslation,
                media_url: mediaURL || null,
                posted_at,
                parent_id: parent_id || null,
            });

            navigate("/");
        } catch (err) {
            console.error("CreatePost error:", err);
            alert("Error creating post. Check console for details.");
        }
    };

    /** ---------------- RENDER UI ---------------- **/

    return (
        <div style={{ padding: 20 }}>
            <h2>{parent_id ? "Add Tweet Reply" : "Create New Post"}</h2>

            {parent_id && (
                <p style={{ color: "gray" }}>
                    Replying to Post ID: {parent_id}
                </p>
            )}

            <form onSubmit={submit}>
                {/* Platform */}
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

                <br />
                <br />

                {/* Author */}
                <label>Author:</label>
                <select
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                >
                    <option value="">-- select author --</option>

                    {authors.map((a) => (
                        <option key={a.id} value={a.name}>
                            {a.name}
                        </option>
                    ))}

                    <option value="__new__">+ Add New Author</option>
                </select>

                {author === "__new__" && (
                    <>
                        <br />
                        <br />

                        <label>New Author Name:</label>
                        <input
                            type="text"
                            value={newAuthorName}
                            onChange={(e) => setNewAuthorName(e.target.value)}
                            placeholder="Enter name"
                            style={{ width: "100%" }}
                        />

                        <br />
                        <br />

                        <label>Profile Photo URL (optional):</label>
                        <input
                            type="text"
                            value={newAuthorPhoto}
                            onChange={(e) => setNewAuthorPhoto(e.target.value)}
                            placeholder="https://..."
                            style={{ width: "100%" }}
                        />
                    </>
                )}

                <br />
                <br />

                {/* URL */}
                <label>Post URL:</label>
                <input
                    value={external_url}
                    onChange={(e) => setExternalURL(e.target.value)}
                    placeholder="Paste tweet or IG URL"
                    style={{ width: "100%" }}
                />

                <br />
                <br />

                <label>Caption / Tweet Text:</label>
                <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Optional original caption"
                    style={{ width: "100%", height: 80 }}
                />

                <br />
                <br />

                <label>Translation:</label>
                <textarea
                    value={captionTranslation}
                    onChange={(e) => setCaptionTranslation(e.target.value)}
                    placeholder="Optional translation"
                    style={{ width: "100%", height: 80 }}
                />

                <br />
                <br />

                <label>Media URL (optional):</label>
                <input
                    value={mediaURL}
                    onChange={(e) => setMediaURL(e.target.value)}
                    placeholder="Image / video URL"
                    style={{ width: "100%" }}
                />

                <br />
                <br />

                <label>Posted At:</label>
                <input
                    type="date"
                    value={posted_at}
                    onChange={(e) => setPostedAt(e.target.value)}
                />

                <br />
                <br />

                <button type="submit">
                    {parent_id ? "Save Reply" : "Save Post"}
                </button>
            </form>
        </div>
    );
}
