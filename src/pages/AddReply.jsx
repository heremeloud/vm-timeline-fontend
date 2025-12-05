import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/api";

// Normalize X → Twitter canonical URL
function normalizeTweetURL(url) {
    if (!url) return "";

    if (!url.startsWith("http")) {
        url = "https://" + url;
    }

    url = url.replace("x.com", "twitter.com");

    const match = url.match(/twitter\.com\/([^/]+)\/status\/(\d+)/);
    if (!match) return url;

    return `https://twitter.com/${match[1]}/status/${match[2]}`;
}

export default function AddReply() {
    const { postId } = useParams();
    const navigate = useNavigate();

    const [parent, setParent] = useState(null);

    // ---------------------------
    // AUTHOR LOGIC
    // ---------------------------
    const [authors, setAuthors] = useState([]);
    const [author, setAuthor] = useState("");
    const [newAuthorName, setNewAuthorName] = useState("");
    const [newAuthorPhoto, setNewAuthorPhoto] = useState("");

    // Shared fields
    const [caption, setCaption] = useState("");
    const [translation, setTranslation] = useState("");
    const [mediaURL, setMediaURL] = useState("");
    const [postedAt, setPostedAt] = useState("");

    // Twitter-only
    const [tweetURL, setTweetURL] = useState("");

    // ---------------------------------------
    // LOAD PARENT + AUTHORS
    // ---------------------------------------
    useEffect(() => {
        async function load() {
            const aRes = await api.get("/authors/");
            setAuthors(aRes.data);

            const res = await api.get(`/posts/${postId}`);
            const p = res.data.post;
            setParent(p);

            if (p?.posted_at) {
                setPostedAt(p.posted_at.split("T")[0]);
            }
        }
        load();
    }, [postId]);

    if (!parent) return <div>Loading...</div>;

    const isInstagram = parent.platform === "ig" || parent.platform === "instagram";
    const isTwitter = parent.platform === "x" || parent.platform === "twitter";

    // ---------------------------------------
    // SUBMIT
    // ---------------------------------------
    async function submit() {
        // determine final author name
        let finalAuthor = author;

        if (author === "__new__") {
            if (!newAuthorName.trim()) {
                alert("Please enter the new author's name.");
                return;
            }
            finalAuthor = newAuthorName.trim();
        }

        // create / ensure author exists
        const authorRes = await api.post("/authors/ensure", {
            name: finalAuthor,
            profile_photo_url: author === "__new__" ? newAuthorPhoto || null : null,
        });
        const authorId = authorRes.data.id;

        // -------------------- Instagram Reply --------------------
        if (isInstagram) {
            if (!caption.trim()) return alert("Instagram reply needs a caption.");
            if (!postedAt.trim()) return alert("Date is required.");

            // Step 1: main TH comment
            const mainRes = await api.post("/texts/", {
                post_id: Number(postId),
                type: "ig-reply",
                language: "th",
                content: caption,
                media_url: mediaURL || null,
                author_id: authorId,
                posted_at: postedAt,
                source: "manual",
                parent_comment_id: null,
            });

            const parentCommentId = mainRes.data.id;

            // Step 2: optional translation
            if (translation.trim()) {
                await api.post("/texts/", {
                    post_id: Number(postId),
                    type: "ig-translation",
                    language: "en",
                    content: translation,
                    media_url: null,
                    author_id: authorId,
                    posted_at: postedAt,
                    source: "manual",
                    parent_comment_id: parentCommentId,
                });
            }
        }

        // -------------------- Twitter Reply --------------------
        if (isTwitter) {
            if (!caption.trim()) return alert("Tweet reply needs text.");
            if (!tweetURL.trim()) return alert("Tweet URL is required.");
            if (!postedAt.trim()) return alert("Date is required.");

            const normalizedURL = normalizeTweetURL(tweetURL);
            const external_id =
                tweetURL.split("/status/")[1]?.split("?")[0] || "";

            await api.post("/posts/", {
                platform: "x",
                external_url: normalizedURL,
                external_id,
                caption,
                caption_translation: translation || null,
                media_url: mediaURL || null,
                author_id: authorId,
                posted_at: postedAt,
                parent_id: Number(postId),
            });
        }

        navigate("/");
    }

    // ---------------------------------------
    // RENDER UI
    // ---------------------------------------
    return (
        <div style={{ padding: 20 }}>
            <h2>Add Reply ({isInstagram ? "Instagram" : "Twitter"})</h2>

            {/* AUTHOR */}
            <label>Author:</label>
            <select value={author} onChange={(e) => setAuthor(e.target.value)}>
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
                    <br /><br />

                    <label>New Author Name:</label>
                    <input
                        type="text"
                        value={newAuthorName}
                        onChange={(e) => setNewAuthorName(e.target.value)}
                        placeholder="Enter name"
                        style={{ width: "100%" }}
                    />

                    <br /><br />

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

            <br /><br />

            {/* DATE */}
            <label>Reply Date:</label>
            <input
                type="date"
                value={postedAt}
                onChange={(e) => setPostedAt(e.target.value)}
            />

            <br /><br />

            {/* IG UI */}
            {isInstagram && (
                <>
                    <label>IG Comment (caption): *</label>
                    <textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        rows={4}
                        style={{ width: "100%" }}
                    />
                    <br /><br />

                    <label>Optional Translation:</label>
                    <textarea
                        value={translation}
                        onChange={(e) => setTranslation(e.target.value)}
                        rows={4}
                        style={{ width: "100%" }}
                    />
                    <br /><br />

                    <label>Optional Media URL:</label>
                    <input
                        type="text"
                        value={mediaURL}
                        onChange={(e) => setMediaURL(e.target.value)}
                        placeholder="https://..."
                        style={{ width: "100%" }}
                    />
                </>
            )}

            {/* TWITTER UI */}
            {isTwitter && (
                <>
                    <label>Tweet URL: *</label>
                    <input
                        type="text"
                        value={tweetURL}
                        onChange={(e) => setTweetURL(e.target.value)}
                        placeholder="https://x.com/.../status/12345"
                        style={{ width: "100%" }}
                    />
                    <br /><br />

                    <label>Tweet Text (caption): *</label>
                    <textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        rows={4}
                        style={{ width: "100%" }}
                    />
                    <br /><br />

                    <label>Optional Translation:</label>
                    <textarea
                        value={translation}
                        onChange={(e) => setTranslation(e.target.value)}
                        rows={4}
                        style={{ width: "100%" }}
                    />
                    <br /><br />

                    <label>Optional Media URL:</label>
                    <input
                        type="text"
                        value={mediaURL}
                        onChange={(e) => setMediaURL(e.target.value)}
                        placeholder="https://..."
                        style={{ width: "100%" }}
                    />
                </>
            )}

            <br /><br />

            <button onClick={submit}>Save Reply</button>
        </div>
    );
}
