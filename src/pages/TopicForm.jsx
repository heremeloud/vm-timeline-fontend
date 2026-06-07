import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createPost, getAdminPosts } from "../api/postsService";
import { ensureAuthor, getAuthors } from "../api/authorsService";
import { createTopic, getAdminTopic, updateTopic } from "../api/topicsService";
import { ROUTES } from "../routes";
import "../styles/EventForm.css";
import "../styles/Topics.css";

const emptyNewPost = {
    platform: "ig",
    author: "",
    newAuthorName: "",
    newAuthorPhoto: "",
    external_url: "",
    caption: "",
    caption_translation: "",
    caption_translation_note: "",
    media_url: "",
    posted_at: "",
    is_visible: false,
};

function createEmptyItem(sortOrder = 0) {
    return {
        source: "existing",
        post_id: "",
        newPost: { ...emptyNewPost },
        happened_at: "",
        label: "",
        note: "",
        show_replies: true,
        media_index: "",
        media_indices: [],
        sort_order: sortOrder,
    };
}

function postLabel(post) {
    const platform = post.platform === "ig" ? "IG" : post.platform === "tt" ? "TikTok" : "X";
    const date = post.posted_at || "no date";
    const text = post.caption || post.external_url || "no caption";
    return `#${post.id} ${platform} - ${post.author_name || "Unknown"} - ${date} - ${text.slice(0, 80)}`;
}

function normalizePostUrl(url, platform) {
    if (!url) return "";
    if (platform === "x") {
        return url
            .replace("https://x.com", "https://twitter.com")
            .replace("http://x.com", "https://twitter.com")
            .replace("https://www.x.com", "https://twitter.com");
    }
    if (platform === "ig") {
        let clean = url.split("?")[0];
        if (!clean.endsWith("/")) clean += "/";
        return clean.replace("https://instagram.com", "https://www.instagram.com");
    }
    if (platform === "tt") {
        let clean = url.trim().split("?")[0];
        clean = clean.replace("https://m.tiktok.com", "https://www.tiktok.com");
        if (!clean.startsWith("http")) clean = "https://" + clean;
        return clean;
    }
    return url;
}

function extractExternalId(url, platform) {
    if (!url) return "";
    if (platform === "ig") return url.split("/p/")?.[1]?.split("/")?.[0] || "";
    if (platform === "x") return url.split("/status/")?.[1]?.split("?")?.[0] || "";
    if (platform === "tt") return url.match(/\/video\/(\d+)/)?.[1] || "";
    return "";
}

function getDefaultApproxTime(post) {
    if (!post?.posted_at) return "";
    return `${post.posted_at.slice(0, 10)}T00:00`;
}

function slugify(value) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export default function TopicForm() {
    const { topicId } = useParams();
    const navigate = useNavigate();
    const isEdit = !!topicId;

    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [coverUrl, setCoverUrl] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [sortOrder, setSortOrder] = useState("");
    const [items, setItems] = useState([createEmptyItem()]);
    const [posts, setPosts] = useState([]);
    const [authors, setAuthors] = useState([]);
    const [loading, setLoading] = useState(isEdit);

    useEffect(() => {
        async function loadLists() {
            const [postsRes, authorsRes] = await Promise.all([
                getAdminPosts({ limit: 500, sort: "newest" }),
                getAuthors(),
            ]);
            setPosts(postsRes.data || []);
            setAuthors(authorsRes.data || []);
        }
        loadLists();
    }, []);

    useEffect(() => {
        if (!isEdit) return;

        async function loadTopic() {
            try {
                const res = await getAdminTopic(topicId);
                const topic = res.data.topic;
                setTitle(topic.title || "");
                setSlug(topic.slug || "");
                setDescription(topic.description || "");
                setCoverUrl(topic.cover_url || "");
                setStartDate(topic.start_date || "");
                setEndDate(topic.end_date || "");
                setSortOrder(topic.sort_order ?? topic.id ?? "");
                setItems(
                    topic.items?.length
                        ? topic.items.map((item, index) => ({
                            source: "existing",
                            post_id: item.post_id || "",
                            newPost: { ...emptyNewPost },
                            happened_at: item.happened_at || "",
                            label: item.label || "",
                            note: item.note || "",
                            show_replies: item.show_replies ?? true,
                            media_index: item.media_index ?? "",
                            media_indices: item.media_indices?.length
                                ? item.media_indices
                                : item.media_index !== null && item.media_index !== undefined
                                    ? [item.media_index]
                                    : [],
                            sort_order: item.sort_order ?? index,
                        }))
                        : [createEmptyItem()]
                );
            } catch (err) {
                console.error("Load special failed:", err);
                alert("Could not load special.");
            } finally {
                setLoading(false);
            }
        }

        loadTopic();
    }, [isEdit, topicId]);

    const postsById = useMemo(() => {
        const map = new Map();
        posts.forEach((post) => map.set(String(post.id), post));
        return map;
    }, [posts]);

    function updateItem(index, key, value) {
        setItems((current) =>
            current.map((item, i) =>
                i === index ? { ...item, [key]: value } : item
            )
        );
    }

    function updateNewPost(index, key, value) {
        setItems((current) =>
            current.map((item, i) =>
                i === index
                    ? { ...item, newPost: { ...item.newPost, [key]: value } }
                    : item
            )
        );
    }

    function selectExistingPost(index, postId) {
        const selectedPost = postsById.get(String(postId));
        setItems((current) =>
            current.map((item, i) => {
                if (i !== index) return item;

                const next = { ...item, post_id: postId };
                const hasDate = !!item.happened_at?.slice(0, 10);
                if (!hasDate) {
                    next.happened_at = getDefaultApproxTime(selectedPost);
                }
                return next;
            })
        );
    }

    function insertTimelineItem(index, placement) {
        setItems((current) => {
            const insertAt = placement === "above" ? index : index + 1;
            const next = [...current];
            next.splice(insertAt, 0, createEmptyItem(insertAt));
            return next.map((item, i) => ({ ...item, sort_order: i }));
        });
    }

    function moveTimelineItem(index, direction) {
        setItems((current) => {
            const target = index + direction;
            if (target < 0 || target >= current.length) return current;

            const next = [...current];
            const [item] = next.splice(index, 1);
            next.splice(target, 0, item);
            return next.map((row, i) => ({ ...row, sort_order: i }));
        });
    }

    function removeTimelineItem(index) {
        setItems((current) => {
            if (current.length === 1) return current;
            return current
                .filter((_, i) => i !== index)
                .map((item, i) => ({ ...item, sort_order: i }));
        });
    }

    async function createInlinePost(item) {
        const draft = item.newPost;
        let finalAuthor = draft.author;

        if (draft.author === "__new__") {
            if (!draft.newAuthorName.trim()) {
                throw new Error("Please enter the new author's name.");
            }
            finalAuthor = draft.newAuthorName.trim();
        }

        if (!finalAuthor) {
            throw new Error("Please choose an author for every new post.");
        }

        const authorRes = await ensureAuthor({
            name: finalAuthor,
            profile_photo_url: draft.author === "__new__" ? draft.newAuthorPhoto || null : null,
        });

        const cleanUrl = normalizePostUrl(draft.external_url, draft.platform);
        const externalId = extractExternalId(cleanUrl, draft.platform);
        const postedAt = draft.posted_at || item.happened_at?.slice(0, 10) || "";

        const postRes = await createPost({
            platform: draft.platform,
            external_url: cleanUrl,
            external_id: externalId,
            author_id: authorRes.data.id,
            caption: draft.caption,
            caption_translation: draft.caption_translation,
            caption_translation_note: draft.caption_translation_note.trim() || null,
            media_url: draft.media_url || null,
            media_urls_json: "[]",
            posted_at: postedAt,
            parent_id: null,
            is_visible: draft.is_visible,
        });

        return postRes.data.id;
    }

    async function submit(e) {
        e.preventDefault();


        try {
            const payloadItems = [];

            for (const [index, item] of items.entries()) {
                let postId = Number(item.post_id);

                if (item.source === "new") {
                    // eslint-disable-next-line no-await-in-loop
                    postId = await createInlinePost(item);
                }

                if (!postId) continue;

                payloadItems.push({
                    post_id: postId,
                    happened_at: item.happened_at.trim() || null,
                    label: item.label.trim() || null,
                    note: item.note.trim() || null,
                    show_replies: item.show_replies ?? true,
                    media_index: item.media_index === "" ? null : Number(item.media_index),
                    media_indices: item.media_indices || [],
                    sort_order: index,
                });
            }

            const payload = {
                title,
                slug: slug || null,
                description: description || null,
                cover_url: coverUrl || null,
                start_date: startDate || null,
                end_date: endDate || null,
                sort_order: sortOrder === "" ? null : Number(sortOrder),
                items: payloadItems,
            };

            const res = isEdit
                ? await updateTopic(topicId, payload)
                : await createTopic(payload);

            const savedTopicId = res.data?.slug || res.data?.topic?.slug || res.data?.id || res.data?.topic?.id || topicId;
            if (!savedTopicId) {
                navigate(ROUTES.topics);
                return;
            }

            navigate(ROUTES.topicDetail(savedTopicId));
        } catch (err) {
            console.error("Save special failed:", err);
            alert(err.message || "Could not save special.");
        }
    }

    if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

    return (
        <div className="eventform-container">
            <h2>{isEdit ? "Edit Special" : "Create Special"}</h2>

            <form className="eventform-form" onSubmit={submit}>
                <div className="eventform-section">
                    <label>Title</label>
                    <input
                        value={title}
                        onChange={(e) => {
                            const nextTitle = e.target.value;
                            setTitle(nextTitle);
                            if (!slug.trim()) setSlug(slugify(nextTitle));
                        }}
                        required
                    />
                </div>

                <div className="eventform-section">
                    <label>URL slug</label>
                    <input
                        value={slug}
                        onChange={(e) => setSlug(slugify(e.target.value))}
                        placeholder="viewmim-birthday-2026"
                    />
                    <small style={{ opacity: 0.7 }}>
                        Public URL: /specials/{slug || "your-special-slug"}
                    </small>
                </div>

                <div className="eventform-section">
                    <label>Cover URL</label>
                    <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." />
                </div>

                <div className="eventform-section">
                    <label>Special order</label>
                    <input
                        type="number"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        placeholder="Higher appears first"
                    />
                </div>

                <div className="eventform-section" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                    <div>
                        <label>Start date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>

                    <div>
                        <label>End date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>

                <div className="eventform-section">
                    <label>Description</label>
                    <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>

                <div className="eventform-section">
                    <h3>Mini Timeline</h3>
                    {items.map((item, index) => {
                        const selectedPost = postsById.get(String(item.post_id));
                        const draft = item.newPost || emptyNewPost;
                        const selectedPostMediaItems = selectedPost?.media_urls || [];
                        const canSelectStory =
                            (item.source || "existing") === "existing" &&
                            (selectedPost?.platform === "ig" || selectedPost?.platform === "instagram") &&
                            selectedPostMediaItems.length > 1;

                        return (
                            <div className="topic-item-row" key={index}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                                    <strong>Item {index + 1}</strong>
                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                        <button
                                            type="button"
                                            onClick={() => insertTimelineItem(index, "above")}
                                        >
                                            Insert above
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => insertTimelineItem(index, "below")}
                                        >
                                            Insert below
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => moveTimelineItem(index, -1)}
                                            disabled={index === 0}
                                        >
                                            Move up
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => moveTimelineItem(index, 1)}
                                            disabled={index === items.length - 1}
                                        >
                                            Move down
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label>Timeline item source</label>
                                    <select
                                        value={item.source || "existing"}
                                        onChange={(e) => updateItem(index, "source", e.target.value)}
                                    >
                                        <option value="existing">Existing saved post</option>
                                        <option value="new">Create new post here</option>
                                    </select>
                                </div>

                                {(item.source || "existing") === "existing" ? (
                                    <div>
                                        <label>Post</label>
                                        <select
                                            value={item.post_id}
                                            onChange={(e) => selectExistingPost(index, e.target.value)}
                                        >
                                            <option value="">Select saved post</option>
                                            {posts.map((post) => (
                                                <option key={post.id} value={post.id}>
                                                    {postLabel(post)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div style={{ display: "grid", gap: 10 }}>
                                        <div>
                                            <label>Platform</label>
                                            <select
                                                value={draft.platform}
                                                onChange={(e) => updateNewPost(index, "platform", e.target.value)}
                                            >
                                                <option value="ig">Instagram</option>
                                                <option value="x">X (Twitter)</option>
                                                <option value="tt">TikTok</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label>Author</label>
                                            <select
                                                value={draft.author}
                                                onChange={(e) => updateNewPost(index, "author", e.target.value)}
                                            >
                                                <option value="">Select author</option>
                                                {authors.map((author) => (
                                                    <option key={author.id} value={author.name}>
                                                        {author.name}
                                                    </option>
                                                ))}
                                                <option value="__new__">+ Add New Author</option>
                                            </select>
                                        </div>

                                        {draft.author === "__new__" && (
                                            <>
                                                <div>
                                                    <label>New author name</label>
                                                    <input
                                                        value={draft.newAuthorName}
                                                        onChange={(e) => updateNewPost(index, "newAuthorName", e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label>New author photo URL</label>
                                                    <input
                                                        value={draft.newAuthorPhoto}
                                                        onChange={(e) => updateNewPost(index, "newAuthorPhoto", e.target.value)}
                                                        placeholder="https://..."
                                                    />
                                                </div>
                                            </>
                                        )}

                                        <div>
                                            <label>Post URL</label>
                                            <input
                                                value={draft.external_url}
                                                onChange={(e) => updateNewPost(index, "external_url", e.target.value)}
                                                placeholder={draft.platform === "ig" ? "Leave blank for IG story/manual media" : "https://..."}
                                            />
                                        </div>

                                        <div>
                                            <label>Media URL</label>
                                            <input
                                                value={draft.media_url}
                                                onChange={(e) => updateNewPost(index, "media_url", e.target.value)}
                                                placeholder="Useful for IG story/manual media"
                                            />
                                        </div>

                                        <div>
                                            <label>Caption / text</label>
                                            <textarea
                                                rows={3}
                                                value={draft.caption}
                                                onChange={(e) => updateNewPost(index, "caption", e.target.value)}
                                            />
                                        </div>

                                        <div>
                                            <label>Translation</label>
                                            <textarea
                                                rows={3}
                                                value={draft.caption_translation}
                                                onChange={(e) => updateNewPost(index, "caption_translation", e.target.value)}
                                            />
                                        </div>

                                        <div>
                                            <label>Translator's note</label>
                                            <input
                                                value={draft.caption_translation_note}
                                                onChange={(e) => updateNewPost(index, "caption_translation_note", e.target.value)}
                                            />
                                        </div>

                                        <div>
                                            <label>Post date</label>
                                            <input
                                                type="date"
                                                value={draft.posted_at}
                                                onChange={(e) => updateNewPost(index, "posted_at", e.target.value)}
                                            />
                                        </div>

                                        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 0 }}>
                                            <input
                                                type="checkbox"
                                                checked={draft.is_visible}
                                                onChange={(e) => updateNewPost(index, "is_visible", e.target.checked)}
                                            />
                                            Also show this new post on the public timeline
                                        </label>
                                    </div>
                                )}

                                {canSelectStory && (
                                    <div>
                                        <label>Story display</label>
                                        <small style={{ display: "block", opacity: 0.7, marginBottom: 6 }}>
                                            Leave all unchecked to show all grouped stories.
                                        </small>
                                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const allIndexes = selectedPostMediaItems.map((_, mediaIndex) => mediaIndex);
                                                    updateItem(index, "media_indices", allIndexes);
                                                    updateItem(index, "media_index", "");
                                                }}
                                            >
                                                Select all
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    updateItem(index, "media_indices", []);
                                                    updateItem(index, "media_index", "");
                                                }}
                                            >
                                                Clear
                                            </button>
                                        </div>
                                        <div
                                            style={{
                                                display: "grid",
                                                gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
                                                gap: 6,
                                            }}
                                        >
                                            {selectedPostMediaItems.map((media, mediaIndex) => (
                                                <label
                                                    key={`${media.url || mediaIndex}-${mediaIndex}`}
                                                    style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 0, fontWeight: 400 }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={(item.media_indices || []).includes(mediaIndex)}
                                                        onChange={(e) => {
                                                            const current = item.media_indices || [];
                                                            const next = e.target.checked
                                                                ? [...current, mediaIndex].sort((a, b) => a - b)
                                                                : current.filter((value) => value !== mediaIndex);
                                                            updateItem(index, "media_indices", next);
                                                            updateItem(index, "media_index", next.length === 1 ? String(next[0]) : "");
                                                        }}
                                                    />
                                                    Story {mediaIndex + 1}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label>Approx. posting time</label>
                                    <input
                                        type="datetime-local"
                                        value={item.happened_at}
                                        onChange={(e) => updateItem(index, "happened_at", e.target.value)}
                                    />
                                    {selectedPost?.posted_at && (
                                        <small style={{ opacity: 0.68 }}>
                                            Post date: {selectedPost.posted_at}
                                        </small>
                                    )}
                                </div>

                                <div>
                                    <label>Timeline label</label>
                                    <input
                                        value={item.label}
                                        onChange={(e) => updateItem(index, "label", e.target.value)}
                                        placeholder="e.g. Mim replies, IG story, same event"
                                    />
                                </div>

                                <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 0 }}>
                                    <input
                                        type="checkbox"
                                        checked={item.show_replies ?? true}
                                        onChange={(e) => updateItem(index, "show_replies", e.target.checked)}
                                    />
                                    Show replies inside this mini timeline item
                                </label>

                                <div>
                                    <label>Note</label>
                                    <textarea
                                        rows={2}
                                        value={item.note}
                                        onChange={(e) => updateItem(index, "note", e.target.value)}
                                    />
                                </div>

                                <div style={{ display: "flex", gap: 8 }}>
                                    <button
                                        type="button"
                                        onClick={() => removeTimelineItem(index)}
                                        disabled={items.length === 1}
                                        className="btn-delete"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    <button
                        type="button"
                        onClick={() => setItems((current) => [...current, createEmptyItem(current.length)])}
                        style={{ marginTop: 12 }}
                    >
                        Add timeline item
                    </button>
                </div>

                <div className="eventform-section">
                    <button type="submit">Save Special</button>
                </div>
            </form>
        </div>
    );
}
