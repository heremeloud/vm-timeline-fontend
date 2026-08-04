import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getAuthors, updateAuthor } from "../api/authorsService";
import { deletePost, getAdminPosts, reorderPost, searchAdminPosts, updatePost } from "../api/postsService";
import { getAdminEvents, updateEvent } from "../api/eventsService";
import { getAdminProjects, updateProject } from "../api/projectsService";
import { getAdminTopics, updateTopic } from "../api/topicsService";
import { ROUTES } from "../routes";
import { formatEventDateRange } from "../utils/eventDateRange";
import { isVideo } from "../utils/media";
import TweetEmbed from "../components/TweetEmbed";
import InstagramEmbed from "../components/InstagramEmbed";
import TikTokEmbed from "../components/TikTokEmbed";
import "../styles/EventForm.css";

const LIMIT = 25;
const TABS = ["posts", "events", "projects", "specials", "authors"];
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function resolvePreviewUrl(url = "") {
    return url.startsWith("/static/") ? `${API_BASE}${url}` : url;
}

function itemStatus(isVisible, extraVisible = true) {
    return isVisible && extraVisible ? "public" : "hidden";
}

function postPlatformLabel(item) {
    const platform = item.platform || item.post_platform;
    const contentType = item.content_type || item.post_content_type;

    if (platform === "ig" || platform === "instagram") {
        if (contentType === "story") return "IGS";
        if (contentType === "broadcast") return "BC";
        return "IG";
    }
    if (platform === "x" || platform === "twitter") return "X";
    if (platform === "tt" || platform === "tiktok") return "TikTok";
    return platform || "Unknown";
}

function previewUrlForItem(tab, item, author) {
    if (tab === "posts") {
        const firstMedia = Array.isArray(item.media_urls) ? item.media_urls.find((media) => typeof media === "string" ? media : media?.url) : null;
        return (typeof firstMedia === "string" ? firstMedia : firstMedia?.url) || item.media_url || "";
    }
    if (tab === "events") return item.media_url || item.project_thumbnail_url || "";
    if (tab === "projects") return item.thumbnail_url || "";
    if (tab === "specials") return item.cover_url || "";
    return item.ig_pfp_url || "";
}

function ManageDisplayPreview({ url, title, tab, item }) {
    const [expanded, setExpanded] = useState(false);
    const [imageFailed, setImageFailed] = useState(false);
    const resolvedUrl = resolvePreviewUrl(url);
    const video = isVideo(resolvedUrl);
    const platform = item.platform || item.post_platform;
    const hasSocialPreview = tab === "posts" && !!item.external_url && ["ig", "instagram", "x", "twitter", "tt", "tiktok"].includes(platform);

    if ((!url || imageFailed) && !hasSocialPreview) return null;

    const platformLabel = platform === "x" || platform === "twitter"
        ? "X"
        : platform === "tt" || platform === "tiktok"
            ? "TikTok"
            : "IG";

    const socialEmbed = hasSocialPreview && expanded ? (
        platform === "x" || platform === "twitter" ? (
            <TweetEmbed url={item.external_url} />
        ) : platform === "tt" || platform === "tiktok" ? (
            <TikTokEmbed
                external_url={item.external_url}
                media_url={item.media_url}
                caption={item.caption}
                author_id={item.author_id}
                author_name={item.author_name}
                author_photo={item.author_photo}
            />
        ) : (
            <InstagramEmbed
                external_url={item.external_url}
                media_url={item.media_url}
                media_urls={item.media_urls || []}
                caption={item.caption}
                author_id={item.author_id}
                author_name={item.author_name}
                author_photo={item.author_photo}
                author_ig_pfp_url={item.author_ig_pfp_url}
                author_instagram_url={item.author_instagram_url}
            />
        )
    ) : null;

    return (
        <div
            className="manage-display-media-preview"
            tabIndex={0}
            aria-label={`Preview ${title}`}
            onMouseEnter={() => setExpanded(true)}
            onMouseLeave={() => setExpanded(false)}
            onFocus={() => setExpanded(true)}
            onBlur={() => setExpanded(false)}
        >
            {resolvedUrl && video ? (
                <video src={resolvedUrl} muted playsInline preload="metadata" />
            ) : resolvedUrl ? (
                <img
                    src={resolvedUrl}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={() => setImageFailed(true)}
                />
            ) : (
                <span className={`manage-display-platform-preview platform-${platformLabel.toLowerCase()}`}>{platformLabel}</span>
            )}
            {expanded && (
                <div className={`manage-display-hover-preview${socialEmbed ? " is-social" : ""}`}>
                    {socialEmbed || (video ? (
                        <video src={resolvedUrl} muted autoPlay loop playsInline preload="metadata" />
                    ) : (
                        <img src={resolvedUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function ManageDisplay() {
    const draggedPostIdRef = useRef(null);
    const dragTargetRef = useRef(null);
    const location = useLocation();
    const returnTo = `${location.pathname}${location.search}`;
    const [activeTab, setActiveTab] = useState("posts");
    const [authors, setAuthors] = useState([]);
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(1);
    const [jumpPage, setJumpPage] = useState("");
    const [sortOrder, setSortOrder] = useState("newest");
    const [platformFilter, setPlatformFilter] = useState("all");
    const [authorFilter, setAuthorFilter] = useState("all");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [postSearch, setPostSearch] = useState("");
    const [submittedPostSearch, setSubmittedPostSearch] = useState("");
    const [searchScopes, setSearchScopes] = useState({
        text: true,
        translations: true,
        notes: true,
        urls: true,
        replies: true,
    });
    const [loading, setLoading] = useState(true);
    const [savingKey, setSavingKey] = useState("");
    const [hasNextPage, setHasNextPage] = useState(false);
    const [lastPage, setLastPage] = useState(1);
    const [draggedPostId, setDraggedPostId] = useState(null);
    const [dragTarget, setDragTarget] = useState(null);
    const [loadedPreviousPosts, setLoadedPreviousPosts] = useState(false);
    const [loadedNextPosts, setLoadedNextPosts] = useState(false);
    const [loadingAdjacent, setLoadingAdjacent] = useState("");

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
        setJumpPage("");
    }, [activeTab, sortOrder, platformFilter, authorFilter, dateFrom, dateTo, submittedPostSearch, searchScopes]);

    async function loadItems() {
        setLoading(true);
        setHasNextPage(false);
        setLoadedPreviousPosts(false);
        setLoadedNextPosts(false);

        if (activeTab === "posts") {
            const searchTerm = submittedPostSearch.trim();
            const res = searchTerm ? await searchAdminPosts({
                q: searchTerm,
                limit: LIMIT + 1,
                offset,
                sort: sortOrder,
                platform: platformFilter,
                authorId: authorFilter,
                dateFrom,
                dateTo,
                searchScopes,
            }) : await getAdminPosts({
                limit: LIMIT + 1,
                offset,
                sort: sortOrder,
                platform: platformFilter,
                authorId: authorFilter,
                dateFrom,
                dateTo,
            });
            const rows = res.data || [];
            setHasNextPage(rows.length > LIMIT);
            setItems(rows.slice(0, LIMIT));
        } else if (activeTab === "events") {
            const res = await getAdminEvents({ limit: LIMIT + 1, offset, sort: sortOrder });
            const rows = res.data || [];
            setHasNextPage(rows.length > LIMIT);
            setItems(rows.slice(0, LIMIT));
        } else if (activeTab === "projects") {
            const res = await getAdminProjects({ limit: LIMIT + 1, offset, sort: sortOrder });
            const rows = res.data || [];
            setHasNextPage(rows.length > LIMIT);
            setItems(rows.slice(0, LIMIT));
        } else if (activeTab === "specials") {
            const res = await getAdminTopics();
            const allRows = res.data || [];
            const orderedRows = sortOrder === "oldest" ? [...allRows].reverse() : allRows;
            const rows = orderedRows.slice(offset, offset + LIMIT + 1);
            setHasNextPage(rows.length > LIMIT);
            setItems(rows.slice(0, LIMIT));
        } else {
            setItems(authors);
        }

        setLoading(false);
    }

    useEffect(() => {
        loadItems();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, page, sortOrder, platformFilter, authorFilter, dateFrom, dateTo, submittedPostSearch, searchScopes, authors.length]);

    useEffect(() => {
        let cancelled = false;

        async function loadLastPage() {
            let total = 0;
            if (activeTab === "posts") {
                const searchTerm = submittedPostSearch.trim();
                const res = searchTerm ? await searchAdminPosts({
                    q: searchTerm,
                    limit: 100000,
                    offset: 0,
                    sort: sortOrder,
                    platform: platformFilter,
                    authorId: authorFilter,
                    dateFrom,
                    dateTo,
                    searchScopes,
                }) : await getAdminPosts({
                    limit: 100000,
                    offset: 0,
                    sort: sortOrder,
                    platform: platformFilter,
                    authorId: authorFilter,
                    dateFrom,
                    dateTo,
                });
                total = (res.data || []).length;
            } else if (activeTab === "events") {
                const res = await getAdminEvents({ limit: 100000, offset: 0, sort: sortOrder });
                total = (res.data || []).length;
            } else if (activeTab === "projects") {
                const res = await getAdminProjects({ limit: 100000, offset: 0, sort: sortOrder });
                total = (res.data || []).length;
            } else if (activeTab === "specials") {
                const res = await getAdminTopics();
                total = (res.data || []).length;
            } else {
                total = authors.length;
            }

            if (!cancelled) setLastPage(Math.max(1, Math.ceil(total / LIMIT)));
        }

        loadLastPage().catch((err) => {
            console.error("Could not calculate the last Manage Display page:", err);
        });
        return () => {
            cancelled = true;
        };
    }, [activeTab, sortOrder, platformFilter, authorFilter, dateFrom, dateTo, submittedPostSearch, searchScopes, authors.length]);

    const authorById = useMemo(() => {
        const map = new Map();
        authors.forEach((author) => map.set(author.id, author));
        return map;
    }, [authors]);

    const visibleItems = items;

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
        if (!searchScopes.text && !searchScopes.translations && !searchScopes.notes && !searchScopes.urls) {
            alert("Select at least one search field.");
            return;
        }
        setSubmittedPostSearch(postSearch.trim());
    }

    function clearPostSearch() {
        setPostSearch("");
        setSubmittedPostSearch("");
    }

    async function movePost(targetPostId, position) {
        const activeDraggedPostId = draggedPostIdRef.current ?? draggedPostId;
        if (!activeDraggedPostId || activeDraggedPostId === targetPostId) return;

        const movedPostId = activeDraggedPostId;
        const previousItems = items;
        const movedSource = items.find((item) => item.id === movedPostId);
        const targetSource = items.find((item) => item.id === targetPostId);
        if (!movedSource || !targetSource || (movedSource.posted_at || "") !== (targetSource.posted_at || "")) {
            alert("Posts can only be reordered with other posts from the same date.");
            return;
        }
        const next = [...items];
        const fromIndex = next.findIndex((item) => item.id === movedPostId);
        if (fromIndex < 0) return;
        const [moved] = next.splice(fromIndex, 1);
        const targetIndex = next.findIndex((item) => item.id === targetPostId);
        if (targetIndex < 0) return;
        next.splice(position === "after" ? targetIndex + 1 : targetIndex, 0, moved);
        setItems(next);
        setSavingKey(`posts-${movedPostId}`);

        try {
            const storedPosition = sortOrder === "oldest"
                ? (position === "before" ? "after" : "before")
                : position;
            await reorderPost(movedPostId, targetPostId, storedPosition);
            await loadItems();
        } catch (err) {
            console.error("Reorder post failed:", err);
            setItems(previousItems);
            alert(err.response?.data?.detail || "Could not save the post order.");
        } finally {
            setSavingKey("");
        }
    }

    async function loadAdjacentPosts(direction) {
        if (activeTab !== "posts" || isSearchingPosts) return;
        const adjacentOffset = direction === "previous"
            ? Math.max(0, offset - 3)
            : offset + LIMIT;
        setLoadingAdjacent(direction);
        try {
            const res = await getAdminPosts({
                limit: 3,
                offset: adjacentOffset,
                sort: sortOrder,
                platform: platformFilter,
                authorId: authorFilter,
                dateFrom,
                dateTo,
            });
            const adjacent = res.data || [];
            setItems((current) => {
                const currentIds = new Set(current.map((item) => item.id));
                const uniqueAdjacent = adjacent.filter((item) => !currentIds.has(item.id));
                return direction === "previous"
                    ? [...uniqueAdjacent, ...current]
                    : [...current, ...uniqueAdjacent];
            });
            if (direction === "previous") setLoadedPreviousPosts(true);
            else setLoadedNextPosts(true);
        } catch (err) {
            console.error("Load adjacent posts failed:", err);
            alert(err.response?.data?.detail || "Could not load adjacent posts.");
        } finally {
            setLoadingAdjacent("");
        }
    }

    const nextDisabled = page >= lastPage || !hasNextPage;
    const isSearchingPosts = activeTab === "posts" && submittedPostSearch.trim();

    function jumpToPage() {
        const requestedPage = Math.floor(Number(jumpPage));
        if (!requestedPage || requestedPage < 1) {
            alert("Enter a valid page number.");
            return;
        }
        setPage(Math.min(requestedPage, lastPage));
        setJumpPage("");
    }

    function renderPaginationControls(position) {
        const inputId = `manage-display-page-jump-${position}`;
        return (
            <div className="manage-display-pagination">
                <div className="manage-display-page-controls">
                    <div className="manage-display-page-navigation">
                        <button
                            type="button"
                            onClick={() => setPage((current) => Math.max(1, current - 1))}
                            disabled={page === 1}
                        >
                            ‹ Prev
                        </button>
                        <strong>Page {page} / {lastPage}</strong>
                        <button
                            type="button"
                            onClick={() => setPage((current) => current + 1)}
                            disabled={nextDisabled}
                        >
                            Next ›
                        </button>
                    </div>
                    <div className="manage-display-page-jump">
                        <label htmlFor={inputId}>Jump to page</label>
                        <input
                            id={inputId}
                            type="number"
                            min="1"
                            max={lastPage}
                            value={jumpPage}
                            onChange={(e) => setJumpPage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") jumpToPage();
                            }}
                        />
                        <button type="button" onClick={jumpToPage}>Go</button>
                    </div>
                </div>
            </div>
        );
    }

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

            {activeTab !== "authors" && (
                <div className="eventform-section eventform-form" style={{ width: "min(100%, 240px)", marginTop: 14 }}>
                    <label>Sort</label>
                    <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                    </select>
                </div>
            )}

            {activeTab === "posts" && (
                <section className="eventform-section eventform-form">
                    <p style={{ marginTop: 0, color: "#77695e", fontSize: "0.88rem" }}>
                        Drag posts to reorder them within the same Posted At date. Dates always remain in chronological order.
                    </p>
                    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                        <div>
                            <label>Platform</label>
                            <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}>
                                <option value="all">All</option>
                                <option value="ig">All Instagram</option>
                                <option value="ig-post">Instagram Post</option>
                                <option value="igs">Instagram Story</option>
                                <option value="bc">Broadcast Channel</option>
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
                        <div className="manage-display-date-range">
                            <div>
                                <label>Start Date <span className="form-optional">(optional)</span></label>
                                <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} />
                            </div>
                            <div>
                                <label>End Date <span className="form-optional">(optional)</span></label>
                                <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} />
                            </div>
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
                        <div className="manage-display-search-scopes" aria-label="Search fields">
                            {[
                                ["text", "Captions / Text"],
                                ["translations", "Translations"],
                                ["notes", "Notes"],
                                ["urls", "URLs / Media"],
                                ["replies", "Include Replies"],
                            ].map(([key, label]) => (
                                <label className="manage-display-search-scope" key={key}>
                                    <input
                                        type="checkbox"
                                        checked={searchScopes[key]}
                                        onChange={(e) => setSearchScopes((current) => ({ ...current, [key]: e.target.checked }))}
                                    />
                                    <span>{label}</span>
                                </label>
                            ))}
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

                {activeTab !== "authors" && renderPaginationControls("top")}

                {activeTab === "posts" && !isSearchingPosts && page > 1 && !loadedPreviousPosts && (
                    <button
                        type="button"
                        className="manage-display-load-adjacent"
                        disabled={loadingAdjacent === "previous"}
                        onClick={() => loadAdjacentPosts("previous")}
                    >
                        {loadingAdjacent === "previous" ? "Loading..." : "Load previous 3 posts"}
                    </button>
                )}

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
                                canDrag={activeTab === "posts" && !isSearchingPosts}
                                isDragging={draggedPostId === item.id}
                                dragPosition={dragTarget?.id === item.id ? dragTarget.position : null}
                                onDragStart={(e) => {
                                    draggedPostIdRef.current = item.id;
                                    setDraggedPostId(item.id);
                                    e.dataTransfer.effectAllowed = "move";
                                    e.dataTransfer.setData("text/plain", String(item.id));
                                }}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    const activeDraggedPostId = draggedPostIdRef.current ?? draggedPostId;
                                    const draggedPost = items.find((row) => row.id === activeDraggedPostId);
                                    if (!draggedPost || (draggedPost.posted_at || "") !== (item.posted_at || "")) {
                                        dragTargetRef.current = null;
                                        setDragTarget(null);
                                        return;
                                    }
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const position = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
                                    const nextTarget = { id: item.id, position };
                                    dragTargetRef.current = nextTarget;
                                    setDragTarget(nextTarget);
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const activeTarget = dragTargetRef.current ?? dragTarget;
                                    if (activeTarget?.id === item.id) {
                                        movePost(item.id, activeTarget.position);
                                    }
                                    draggedPostIdRef.current = null;
                                    dragTargetRef.current = null;
                                    setDraggedPostId(null);
                                    setDragTarget(null);
                                }}
                                onDragEnd={() => {
                                    draggedPostIdRef.current = null;
                                    dragTargetRef.current = null;
                                    setDraggedPostId(null);
                                    setDragTarget(null);
                                }}
                            />
                        ))}

                        {visibleItems.length === 0 && <p>No items found.</p>}
                    </div>
                )}

                {activeTab === "posts" && !isSearchingPosts && hasNextPage && !loadedNextPosts && (
                    <button
                        type="button"
                        className="manage-display-load-adjacent"
                        disabled={loadingAdjacent === "next"}
                        onClick={() => loadAdjacentPosts("next")}
                    >
                        {loadingAdjacent === "next" ? "Loading..." : "Load next 3 posts"}
                    </button>
                )}

                {activeTab !== "authors" && (
                    renderPaginationControls("bottom")
                )}
            </section>
        </div>
    );
}

function DisplayRow({ tab, item, author, isSearchResult = false, saving, returnTo, onToggle, onDelete, canDrag = false, isDragging = false, dragPosition, onDragStart, onDragOver, onDrop, onDragEnd }) {
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
            meta = `${postPlatformLabel(item)} · ${item.result_type} - ${item.posted_at || "no date"} - ${item.match_text || "No text"}`;
            editUrl = ROUTES.editPost(item.target_post_id);
            appUrl = ROUTES.postDetail(item.target_post_id);
        } else {
            title = item.author_name || "Unknown author";
            meta = `${postPlatformLabel(item)} - ${item.posted_at || "no date"} - ${item.caption || item.match_text || item.external_url || "No caption"}`;
            editUrl = ROUTES.editPost(item.target_post_id || item.id);
            appUrl = ROUTES.postDetail(item.target_post_id || item.id);
        }
    } else if (tab === "events") {
        meta = `${formatEventDateRange(item, "no date")}${item.category ? ` - ${item.category}` : ""}`;
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

    const previewUrl = previewUrlForItem(tab, item, author);

    return (
        <div
            onDragOver={canDrag ? onDragOver : undefined}
            onDrop={canDrag ? onDrop : undefined}
            style={{
                border: "1px solid rgba(0, 0, 0, 0.15)",
                borderRadius: 8,
                padding: 12,
                display: "grid",
                gap: 8,
                position: "relative",
                paddingTop: canDrag ? 48 : 12,
                height: isDragging ? 58 : "auto",
                minHeight: isDragging ? 58 : undefined,
                overflow: isDragging ? "hidden" : "visible",
                opacity: isDragging ? 0.55 : 1,
                boxSizing: "border-box",
            }}
        >
            {dragPosition && !isDragging && (
                <div
                    aria-hidden="true"
                    style={{
                        position: "absolute",
                        left: 8,
                        right: 8,
                        [dragPosition === "before" ? "top" : "bottom"]: -10,
                        height: 4,
                        borderRadius: 999,
                        background: "#a76719",
                        boxShadow: "0 0 0 2px #fff8ef",
                        zIndex: 5,
                        pointerEvents: "none",
                    }}
                />
            )}
            {canDrag && (
                <div
                    draggable
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    title="Drag to change post display order"
                    aria-label="Drag to change post display order"
                    style={{
                        position: "absolute",
                        top: 10,
                        left: "50%",
                        transform: "translateX(-50%)",
                        cursor: "grab",
                        color: "#8a7768",
                        fontSize: "1.2rem",
                        lineHeight: 1,
                        letterSpacing: 3,
                        userSelect: "none",
                        padding: "4px 18px",
                        border: "1px solid rgba(138, 119, 104, 0.28)",
                        borderRadius: 999,
                        background: "rgba(255, 248, 239, 0.9)",
                        zIndex: 2,
                    }}
                >
                    ⋮⋮
                </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                <div className="manage-display-entry-summary">
                    <ManageDisplayPreview url={previewUrl} title={title} tab={tab} item={item} />
                    <div>
                        <strong>{title}</strong>
                        <div style={{ fontSize: "0.9rem", opacity: 0.75, marginTop: 4 }}>{meta}</div>
                        {tab === "posts" && !isReplySearchResult && author && !author.show_on_timeline && (
                            <div style={{ fontSize: "0.82rem", color: "#9a3412", marginTop: 4 }}>
                                Author is hidden, so this post stays hidden publicly.
                            </div>
                        )}
                    </div>
                </div>

                <span style={{ whiteSpace: "nowrap", color: status === "public" ? "#2f7d32" : "#9a3412" }}>
                    {status}
                </span>
            </div>

            <div className="manage-display-actions" style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                {canManageDisplay && (
                    <label className="manage-display-visibility-toggle" title={isVisible ? "Visible to the public" : "Hidden from the public"}>
                        <input
                            type="checkbox"
                            checked={!!isVisible}
                            disabled={saving}
                            onChange={onToggle}
                        />
                        <span>Visible</span>
                    </label>
                )}

                {editUrl && <Link to={editUrl} state={{ returnTo }} target="_blank" rel="noopener noreferrer">Edit</Link>}

                {appUrl && <Link to={appUrl} target="_blank" rel="noopener noreferrer">View in app</Link>}

                {tab === "posts" && item.external_url && (
                    <a href={item.external_url} target="_blank" rel="noreferrer">Open source</a>
                )}

                {tab === "posts" && (
                    <button
                        type="button"
                        className="btn-delete manage-display-delete"
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
