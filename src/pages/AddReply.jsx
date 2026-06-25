import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPost, createPost } from "../api/postsService";
import { createText } from "../api/textsService";
import { getAuthors, ensureAuthor } from "../api/authorsService";
import { ROUTES } from "../routes";
import "../styles/EventForm.css";

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

    const [authors, setAuthors] = useState([]);
    const [author, setAuthor] = useState("");
    const [newAuthorName, setNewAuthorName] = useState("");
    const [newAuthorPhoto, setNewAuthorPhoto] = useState("");
    const [newAuthorInstagramPhoto, setNewAuthorInstagramPhoto] = useState("");
    const [newAuthorTwitterPhoto, setNewAuthorTwitterPhoto] = useState("");
    const [newAuthorTikTokPhoto, setNewAuthorTikTokPhoto] = useState("");

    const [caption, setCaption] = useState("");
    const [translation, setTranslation] = useState("");
    const [translationNote, setTranslationNote] = useState("");
    const [mediaURL, setMediaURL] = useState("");
    const [postedAt, setPostedAt] = useState("");

    // Twitter-only
    const [tweetURL, setTweetURL] = useState("");

    useEffect(() => {
        async function load() {
            const aRes = await getAuthors();
            setAuthors(aRes.data);

            const res = await getPost(postId);
            const p = res.data.post;
            setParent(p);

            if (p?.posted_at) {
                setPostedAt(p.posted_at.split("T")[0]);
            }
        }
        load();
    }, [postId]);

    if (!parent) return <div>Loading...</div>;

    const isInstagram =
        parent.platform === "ig" || parent.platform === "instagram";
    const isTwitter = parent.platform === "x" || parent.platform === "twitter";
    const isTikTok = parent.platform === "tt" || parent.platform === "tiktok";

    async function submit(e) {
        e.preventDefault();

        let finalAuthor = author;

        if (author === "__new__") {
            if (!newAuthorName.trim()) {
                alert("Please enter the new author's name.");
                return;
            }
            finalAuthor = newAuthorName.trim();
        }

        if (!finalAuthor || !finalAuthor.trim()) {
            alert("Please select an author (or add a new one).");
            return;
        }

        const authorRes = await ensureAuthor({
            name: finalAuthor,
            profile_photo_url:
                author === "__new__" ? newAuthorPhoto || null : null,
            ig_pfp_url:
                author === "__new__" ? newAuthorInstagramPhoto || null : null,
            twitter_pfp_url:
                author === "__new__" ? newAuthorTwitterPhoto || null : null,
            tiktok_pfp_url:
                author === "__new__" ? newAuthorTikTokPhoto || null : null,
        });
        const authorId = authorRes.data.id;

        if (!postedAt.trim()) return alert("Date is required.");

        // -------------------- Instagram Reply --------------------
        if (isInstagram) {
            if (!caption.trim() && !mediaURL.trim())
                return alert("Instagram reply needs a caption or media URL.");

            await createText({
                post_id: Number(postId),
                type: "ig-reply",
                language: "th",
                content: caption || null,
                translation: translation.trim() || null,
                note: translationNote.trim() || null,
                media_url: mediaURL || null,
                author_id: authorId,
                posted_at: postedAt,
                source: "manual",
                parent_comment_id: null,
            });
        }

        // -------------------- TikTok Reply --------------------
        if (isTikTok) {
            if (!caption.trim() && !mediaURL.trim())
                return alert("TikTok reply needs a caption or media URL.");

            await createText({
                post_id: Number(postId),
                type: "tt-reply",
                language: "th",
                content: caption || null,
                translation: translation.trim() || null,
                note: translationNote.trim() || null,
                media_url: mediaURL || null,
                author_id: authorId,
                posted_at: postedAt,
                source: "manual",
                parent_comment_id: null,
            });
        }

        // -------------------- Twitter Reply --------------------
        if (isTwitter) {
            if (!caption.trim()) return alert("Tweet reply needs text.");
            if (!tweetURL.trim()) return alert("Tweet URL is required.");

            const normalizedURL = normalizeTweetURL(tweetURL);
            const external_id =
                tweetURL.split("/status/")[1]?.split("?")[0] || "";

            await createPost({
                platform: "x",
                external_url: normalizedURL,
                external_id,
                caption,
                caption_translation: translation || null,
                caption_translation_note: translationNote.trim() || null,
                media_url: mediaURL || null,
                author_id: authorId,
                posted_at: postedAt,
                parent_id: Number(postId),
            });
        }

        navigate(ROUTES.home);
    }

    const replyLabel = isInstagram
        ? "Instagram"
        : isTikTok
          ? "TikTok"
          : "Twitter";

    return (
        <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
            <h2>Add Reply ({replyLabel})</h2>

            <form className="eventform-form" onSubmit={submit}>

                <div className="eventform-section">
                    <label>Author:</label>
                    <select value={author} onChange={(e) => setAuthor(e.target.value)}>
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
                            <label>Twitter / X PFP URL (optional):</label>
                            <input
                                type="text"
                                value={newAuthorTwitterPhoto}
                                onChange={(e) => setNewAuthorTwitterPhoto(e.target.value)}
                                placeholder="https://..."
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
                    <label>Reply Date:</label>
                    <input
                        type="date"
                        value={postedAt}
                        onChange={(e) => setPostedAt(e.target.value)}
                        style={{ width: 180 }}
                    />
                </div>

                {/* IG UI */}
                {isInstagram && (
                    <>
                        <div className="eventform-section">
                            <label>IG Comment (caption): *</label>
                            <textarea
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                rows={4}
                            />
                        </div>

                        <div className="eventform-section">
                            <label>Optional Translation:</label>
                            <textarea
                                value={translation}
                                onChange={(e) => setTranslation(e.target.value)}
                                rows={4}
                            />
                        </div>

                        <div className="eventform-section">
                            <label>Translator's note (optional):</label>
                            <input
                                type="text"
                                value={translationNote}
                                onChange={(e) => setTranslationNote(e.target.value)}
                                placeholder="e.g. slang, context, nuance…"
                            />
                        </div>

                        <div className="eventform-section">
                            <label>Optional Media URL:</label>
                            <input
                                type="text"
                                value={mediaURL}
                                onChange={(e) => setMediaURL(e.target.value)}
                                placeholder="https://..."
                            />
                        </div>
                    </>
                )}

                {/* TikTok UI */}
                {isTikTok && (
                    <>
                        <div className="eventform-section">
                            <label>TikTok Reply (caption): *</label>
                            <textarea
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                rows={4}
                            />
                        </div>

                        <div className="eventform-section">
                            <label>Optional Translation:</label>
                            <textarea
                                value={translation}
                                onChange={(e) => setTranslation(e.target.value)}
                                rows={4}
                            />
                        </div>

                        <div className="eventform-section">
                            <label>Translator's note (optional):</label>
                            <input
                                type="text"
                                value={translationNote}
                                onChange={(e) => setTranslationNote(e.target.value)}
                                placeholder="e.g. slang, context, nuance…"
                            />
                        </div>

                        <div className="eventform-section">
                            <label>Optional Media URL:</label>
                            <input
                                type="text"
                                value={mediaURL}
                                onChange={(e) => setMediaURL(e.target.value)}
                                placeholder="https://..."
                            />
                        </div>
                    </>
                )}

                {/* Twitter UI */}
                {isTwitter && (
                    <>
                        <div className="eventform-section">
                            <label>Tweet URL: *</label>
                            <input
                                type="text"
                                value={tweetURL}
                                onChange={(e) => setTweetURL(e.target.value)}
                                placeholder="https://x.com/.../status/12345"
                            />
                        </div>

                        <div className="eventform-section">
                            <label>Tweet Text (caption): *</label>
                            <textarea
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                rows={4}
                            />
                        </div>

                        <div className="eventform-section">
                            <label>Optional Translation:</label>
                            <textarea
                                value={translation}
                                onChange={(e) => setTranslation(e.target.value)}
                                rows={4}
                            />
                        </div>

                        <div className="eventform-section">
                            <label>Translator's note (optional):</label>
                            <input
                                type="text"
                                value={translationNote}
                                onChange={(e) => setTranslationNote(e.target.value)}
                                placeholder="e.g. slang, context, nuance…"
                            />
                        </div>

                        <div className="eventform-section">
                            <label>Optional Media URL:</label>
                            <input
                                type="text"
                                value={mediaURL}
                                onChange={(e) => setMediaURL(e.target.value)}
                                placeholder="https://..."
                            />
                        </div>
                    </>
                )}

                <div className="eventform-section">
                    <button type="submit">Save Reply</button>
                </div>

            </form>
        </div>
    );
}
