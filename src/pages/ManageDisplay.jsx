import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAuthors, updateAuthor } from "../api/authorsService";
import { getAdminPosts, updatePost } from "../api/postsService";
import { ROUTES } from "../routes";
import "../styles/EventForm.css";

export default function ManageDisplay() {
    const [authors, setAuthors] = useState([]);
    const [posts, setPosts] = useState([]);
    const [platformFilter, setPlatformFilter] = useState("all");
    const [authorFilter, setAuthorFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [savingKey, setSavingKey] = useState("");

    async function load() {
        setLoading(true);
        const [authorsRes, postsRes] = await Promise.all([
            getAuthors(),
            getAdminPosts({ limit: 250, sort: "newest", platform: platformFilter }),
        ]);
        setAuthors(authorsRes.data || []);
        setPosts(postsRes.data || []);
        setLoading(false);
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [platformFilter]);

    const authorById = useMemo(() => {
        const map = new Map();
        authors.forEach((author) => map.set(author.id, author));
        return map;
    }, [authors]);

    const filteredPosts = posts.filter((post) => {
        if (authorFilter === "all") return true;
        return String(post.author_id || "") === authorFilter;
    });

    async function toggleAuthor(author) {
        const key = `author-${author.id}`;
        setSavingKey(key);
        const nextValue = !author.show_on_timeline;

        await updateAuthor(author.id, { show_on_timeline: nextValue });

        setAuthors((current) =>
            current.map((item) =>
                item.id === author.id
                    ? { ...item, show_on_timeline: nextValue }
                    : item
            )
        );
        setSavingKey("");
    }

    async function togglePost(post) {
        const key = `post-${post.id}`;
        setSavingKey(key);
        const nextValue = !post.is_visible;

        await updatePost(post.id, { is_visible: nextValue });

        setPosts((current) =>
            current.map((item) =>
                item.id === post.id
                    ? { ...item, is_visible: nextValue }
                    : item
            )
        );
        setSavingKey("");
    }

    return (
        <div className="eventform-container">
            <h2>Manage Timeline Display</h2>

            <p style={{ opacity: 0.75, marginTop: 0 }}>
                Saved posts appear publicly only when both the author is allowed and the post is visible.
            </p>

            <section className="eventform-section eventform-form">
                <h3>Authors</h3>
                <div className="eventform-participants-box" style={{ maxHeight: 260 }}>
                    {authors.map((author) => (
                        <label className="eventform-participant-item" key={author.id}>
                            <input
                                type="checkbox"
                                checked={!!author.show_on_timeline}
                                disabled={savingKey === `author-${author.id}`}
                                onChange={() => toggleAuthor(author)}
                            />
                            <span>
                                {author.name}
                                <small style={{ marginLeft: 8, opacity: 0.65 }}>
                                    {author.show_on_timeline ? "allowed" : "hidden"}
                                </small>
                            </span>
                        </label>
                    ))}
                </div>
            </section>

            <section className="eventform-section eventform-form">
                <h3>Posts</h3>

                <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                    <div>
                        <label>Platform</label>
                        <select
                            value={platformFilter}
                            onChange={(e) => setPlatformFilter(e.target.value)}
                        >
                            <option value="all">All</option>
                            <option value="ig">Instagram</option>
                            <option value="x">X</option>
                            <option value="tt">TikTok</option>
                        </select>
                    </div>

                    <div>
                        <label>Author</label>
                        <select
                            value={authorFilter}
                            onChange={(e) => setAuthorFilter(e.target.value)}
                        >
                            <option value="all">All</option>
                            {authors.map((author) => (
                                <option key={author.id} value={author.id}>
                                    {author.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <p>Loading...</p>
                ) : (
                    <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                        {filteredPosts.map((post) => {
                            const author = authorById.get(post.author_id);
                            const canDisplay = !!post.is_visible && !!author?.show_on_timeline;

                            return (
                                <div
                                    key={post.id}
                                    style={{
                                        border: "1px solid rgba(0, 0, 0, 0.15)",
                                        borderRadius: 8,
                                        padding: 12,
                                        display: "grid",
                                        gap: 8,
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                                        <div>
                                            <strong>{post.author_name || "Unknown author"}</strong>
                                            <span style={{ marginLeft: 8, opacity: 0.65 }}>
                                                {post.platform} - {post.posted_at || "no date"}
                                            </span>
                                            <div style={{ fontSize: "0.9rem", opacity: 0.8, marginTop: 4 }}>
                                                {post.caption || post.external_url || "No caption"}
                                            </div>
                                        </div>

                                        <span style={{ whiteSpace: "nowrap", color: canDisplay ? "#2f7d32" : "#9a3412" }}>
                                            {canDisplay ? "public" : "hidden"}
                                        </span>
                                    </div>

                                    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                                        <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 0 }}>
                                            <input
                                                type="checkbox"
                                                checked={!!post.is_visible}
                                                disabled={savingKey === `post-${post.id}`}
                                                onChange={() => togglePost(post)}
                                            />
                                            Post visible
                                        </label>

                                        <Link to={ROUTES.editPost(post.id)}>Edit post</Link>

                                        {post.external_url && (
                                            <a href={post.external_url} target="_blank" rel="noreferrer">
                                                Open source
                                            </a>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {filteredPosts.length === 0 && <p>No posts found.</p>}
                    </div>
                )}
            </section>
        </div>
    );
}
