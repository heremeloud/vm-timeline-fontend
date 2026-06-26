import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getAuthors, updateAuthor } from "../api/authorsService";
import { deletePost, getAdminPosts, searchAdminPosts, updatePost } from "../api/postsService";
import { getAdminEvents, updateEvent } from "../api/eventsService";
import { getAdminProjects, updateProject } from "../api/projectsService";
import { getAdminTopics, updateTopic } from "../api/topicsService";
import { ROUTES } from "../routes";
import "../styles/EventForm.css";

const LIMIT = 25;
const TABS = ["posts", "events", "projects", "specials", "authors"];

function itemStatus(isVisible, extraVisible = true) {
    return isVisible && extraVisible ? "public" : "hidden";
}

export default function ManageDisplay() {
    const location = useLocation();
    const returnTo = `${location.pathname}${location.search}`;
    const [activeTab, setActiveTab] = useState("posts");
    const [authors, setAuthors] = useState([]);
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(1);
    const [platformFilter, setPlatformFilter] = useState("all");
    const [authorFilter, setAuthorFilter] = useState("all");
    const [postSearch, setPostSearch] = useState("");
    const [submittedPostSearch, setSubmittedPostSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [savingKey, setSavingKey] = useState("");

    const offset = (page - 1) * LIMIT;

    useEffect(() => {
        async function loadAuthors() {
            const res = await getAuthors();
            setAuthors(res.data || []);
        }
        loadAuthors();
    }, []);

    useEffect(() => {
        setPage(1);
    }, [activeTab, platformFilter, authorFilter, submittedPostSearch]);

    async function loadItems() {
        setLoading(true);

        if (activeTab === "posts") {
            const searchTerm = submittedPostSearch.trim();
            const res = searchTerm ? await searchAdminPosts({
                q: searchTerm,
                limit: LIMIT,
                offset,
                platform: platformFilter,
            }) : await getAdminPosts({
                limit: LIMIT,
                offset,
                sort: "newest",
                platform: platformFilter,
            });
            setItems(res.data || []);
        } else if (activeTab === "events") {
            const res = await getAdminEvents({ limit: LIMIT, offset, sort: "newest" });
            setItems(res.data || []);
        } else if (activeTab === "projects") {
            const res = await getAdminProjects({ limit: LIMIT, offset, sort: "newest" });
            setItems(res.data || []);
        } else if (activeTab === "specials") {
            const res = await getAdminTopics();
            setItems((res.data || []).slice(offset, offset + LIMIT));
        } else {
            setItems(authors);
        }

        setLoading(false);
    }

    useEffect(() => {
        loadItems();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, page, platformFilter, submittedPostSearch, authors.length]);

    const authorById = useMemo(() => {
        const map = new Map();
        authors.forEach((author) => map.set(author.id, author));
        return map;
    }, [authors]);

    const visibleItems = activeTab === "posts" && authorFilter !== "all"
        ? items.filter((post) => String(post.author_id || "") === authorFilter)
        : items;

    async function updateRow(type, id, data) {
        if (type === "posts") return updatePost(id, data);
        if (type === "events") return updateEvent(id, data);
        if (type === "projects") return updateProject(id, data);
        if (type === "specials") return updateTopic(id, data);
        return updateAuthor(id, data);
    }

    async function toggleVisibility(type, item) {
        const id = item.id;
        const key = `${type}-${id}`;
        const field = type === "authors" ? "show_on_timeline" : "is_visible";
        const nextValue = !item[field];

        setSavingKey(key);
        await updateRow(type, id, { [field]: nextValue });

        if (type === "authors") {
            setAuthors((current) =>
                current.map((author) =>
                    author.id === id ? { ...author, [field]: nextValue } : author
                )
            );
        }

        setItems((current) =>
            current.map((row) =>
                row.id === id ? { ...row, [field]: nextValue } : row
            )
        );
        setSavingKey("");
    }

    async function deletePostRow(post) {
        if (!confirm("Delete this post? This also deletes its replies/comments.")) return;

        const key = `posts-${post.id}`;
        setSavingKey(key);

        try {
            await deletePost(post.id);
            setItems((current) => current.filter((row) => row.id !== post.id));
        } catch (err) {
            console.error("Delete post failed:", err);
            alert("Delete failed: " + (err.response?.data?.detail || err.message));
        } finally {
            setSavingKey("");
        }
    }

    function submitPostSearch(e) {
        e.preventDefault();
        setSubmittedPostSearch(postSearch.trim());
    }

    function clearPostSearch() {
        setPostSearch("");
        setSubmittedPostSearch("");
    }

    const nextDisabled = visibleItems.length < LIMIT;
    const isSearchingPosts = activeTab === "posts" && submittedPostSearch.trim();

    return (
        <div className="eventform-container">
            <h2>Manage Display</h2>
            <p style={{ opacity: 0.75, marginTop: 0 }}>
                Control which saved content appears in public-facing lists.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: "1px solid rgba(0,0,0,0.15)",
                            cursor: "pointer",
                            background: activeTab === tab ? "#a67c52" : "#fff",
                            color: activeTab === tab ? "#fff" : "inherit",
                        }}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {activeTab === "posts" && (
                <section className="eventform-section eventform-form">
                    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                        <div>
                            <label>Platform</label>
                            <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}>
                                <option value="all">All</option>
                                <option value="ig">Instagram</option>
                                <option value="x">X</option>
                                <option value="tt">TikTok</option>
                            </select>
                        </div>
                        <div>
                            <label>Author</label>
                            <select value={authorFilter} onChange={(e) => setAuthorFilter(e.target.value)}>
                                <option value="all">All</option>
                                {authors.map((author) => (
                                    <option key={author.id} value={author.id}>{author.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <form onSubmit={submitPostSearch} style={{ display: "grid", gap: 8, marginTop: 12 }}>
                        <label>Search post and reply text</label>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <input
                                type="search"
                                value={postSearch}
                                onChange={(e) => setPostSearch(e.target.value)}
                                placeholder="Search captions, translations, replies, notes"
                            />
                            <button type="submit">Search</button>
                            {submittedPostSearch && (
                                <button type="button" onClick={clearPostSearch}>
                                    Clear
                                </button>
                            )}
                        </div>
                        {submittedPostSearch && (
                            <div style={{ fontSize: "0.85rem", opacity: 0.75 }}>
                                Showing matches for "{submittedPostSearch}"
                            </div>
                        )}
                    </form>
                </section>
            )}

            <section className="eventform-section eventform-form">
                <h3>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h3>

                {loading ? (
                    <p>Loading...</p>
                ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                        {visibleItems.map((item) => (
                            <DisplayRow
                                key={`${activeTab}-${item.result_id || item.id}`}
                                tab={activeTab}
                                item={item}
                                author={authorById.get(item.author_id)}
                                isSearchResult={!!isSearchingPosts}
                                saving={savingKey === `${activeTab}-${item.id}`}
                                returnTo={returnTo}
                                onToggle={() => toggleVisibility(activeTab, item)}
                                onDelete={activeTab === "posts" && !isSearchingPosts ? () => deletePostRow(item) : undefined}
                            />
                        ))}

                        {visibleItems.length === 0 && <p>No items found.</p>}
                    </div>
                )}

                {activeTab !== "authors" && (
                    <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "center", marginTop: 18 }}>
                        <button
                            type="button"
                            onClick={() => setPage((current) => Math.max(1, current - 1))}
                            disabled={page === 1}
                        >
                            Prev
                        </button>
                        <span>Page {page}</span>
                        <button
                            type="button"
                            onClick={() => setPage((current) => current + 1)}
                            disabled={nextDisabled}
                        >
                            Next
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
}

function DisplayRow({ tab, item, author, isSearchResult = false, saving, returnTo, onToggle, onDelete }) {
    const isAuthor = tab === "authors";
    const isReplySearchResult = tab === "posts" && isSearchResult && item.result_type !== "post";
    const canManageDisplay = !isReplySearchResult;
    const isVisible = isAuthor ? item.show_on_timeline : item.is_visible;
    const extraVisible = tab === "posts" && !isReplySearchResult ? !!author?.show_on_timeline : true;
    const status = itemStatus(isVisible, extraVisible);

    let title = item.title || item.name || item.author_name || item.original_title || `#${item.id}`;
    let meta = "";
    let editUrl = "";
    let appUrl = "";

    if (tab === "posts") {
        if (isSearchResult && item.result_type !== "post") {
            title = item.author_name || item.post_author_name || "Reply match";
            meta = `${item.result_type} - ${item.posted_at || "no date"} - ${item.match_text || "No text"}`;
            editUrl = ROUTES.editPost(item.target_post_id);
            appUrl = ROUTES.postDetail(item.target_post_id);
        } else {
            title = item.author_name || "Unknown author";
            meta = `${item.platform} - ${item.posted_at || "no date"} - ${item.caption || item.external_url || "No caption"}`;
            editUrl = ROUTES.editPost(item.target_post_id || item.id);
            appUrl = ROUTES.postDetail(item.target_post_id || item.id);
        }
    } else if (tab === "events") {
        meta = `${item.event_date || "no date"}${item.category ? ` - ${item.category}` : ""}`;
        editUrl = ROUTES.editEvent(item.id);
    } else if (tab === "projects") {
        meta = `${item.start_date || item.year || "no date"}${item.category ? ` - ${item.category}` : ""}`;
        editUrl = ROUTES.editProject(item.id);
    } else if (tab === "specials") {
        meta = `${item.start_date || "no start"}${item.end_date ? ` - ${item.end_date}` : ""}`;
        editUrl = ROUTES.editTopic(item.id);
    } else {
        title = item.name;
        meta = isVisible ? "allowed on timeline" : "hidden from timeline";
    }

    return (
        <div
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
                    <strong>{title}</strong>
                    <div style={{ fontSize: "0.9rem", opacity: 0.75, marginTop: 4 }}>{meta}</div>
                    {tab === "posts" && !isReplySearchResult && author && !author.show_on_timeline && (
                        <div style={{ fontSize: "0.82rem", color: "#9a3412", marginTop: 4 }}>
                            Author is hidden, so this post stays hidden publicly.
                        </div>
                    )}
                </div>

                <span style={{ whiteSpace: "nowrap", color: status === "public" ? "#2f7d32" : "#9a3412" }}>
                    {status}
                </span>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                {canManageDisplay && (
                    <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 0 }}>
                        <input
                            type="checkbox"
                            checked={!!isVisible}
                            disabled={saving}
                            onChange={onToggle}
                        />
                        {isAuthor ? "Author allowed" : "Visible"}
                    </label>
                )}

                {editUrl && <Link to={editUrl} state={{ returnTo }}>Edit</Link>}

                {appUrl && <Link to={appUrl}>View in app</Link>}

                {tab === "posts" && item.external_url && (
                    <a href={item.external_url} target="_blank" rel="noreferrer">Open source</a>
                )}

                {tab === "posts" && (
                    <button
                        type="button"
                        className="btn-delete"
                        disabled={saving}
                        onClick={onDelete}
                        style={{ display: onDelete ? undefined : "none" }}
                    >
                        Delete
                    </button>
                )}
            </div>
        </div>
    );
}
