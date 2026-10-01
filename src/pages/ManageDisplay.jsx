import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getAuthors, updateAuthor } from "../api/authorsService";
import { countAdminPosts, countAdminPostSearch, deletePost, getAdminPosts, reorderPost, searchAdminPosts, updatePost } from "../api/postsService";
import { countAdminEvents, getAdminEvents, updateEvent } from "../api/eventsService";
import { createEventView, deleteEventView, getAdminEventViews, updateEventView } from "../api/eventViewsService";
import { createEventCategory, createEventSubcategory, deleteEventCategory, deleteEventSubcategory, updateEventCategory, updateEventSubcategory } from "../api/eventCategoriesService";
import { countAdminProjects, getAdminProjects, updateProject } from "../api/projectsService";
import { getAdminTopics, updateTopic } from "../api/topicsService";
import { ROUTES } from "../routes";
import { formatEventDateRange } from "../utils/eventDateRange";
import useEventCategories from "../hooks/useEventCategories";
import { isVideo } from "../utils/media";
import TweetEmbed from "../components/TweetEmbed";
import InstagramEmbed from "../components/InstagramEmbed";
import TikTokEmbed from "../components/TikTokEmbed";
import VisibilityToggle from "../components/VisibilityToggle";
import { Button, DragHandle, ToggleButton, ToggleGroup } from "../ui";
import "../styles/EventForm.css";

const LIMIT = 25;
const TABS = ["posts", "events", "event-settings", "projects", "specials", "authors"];
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function tabLabel(tab) {
    return tab === "event-settings" ? "Event Setup" : tab.charAt(0).toUpperCase() + tab.slice(1);
}

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

function previewUrlForItem(tab, item) {
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
                display_source={item.display_source}
                content_type={item.content_type || item.post_content_type}
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

        if (activeTab === "event-settings") {
            setItems([]);
        } else if (activeTab === "posts") {
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
            if (activeTab === "event-settings") {
                if (!cancelled) setLastPage(1);
                return;
            } else if (activeTab === "posts") {
                const searchTerm = submittedPostSearch.trim();
                const res = searchTerm ? await countAdminPostSearch({
                    q: searchTerm,
                    platform: platformFilter,
                    authorId: authorFilter,
                    dateFrom,
                    dateTo,
                    searchScopes,
                }) : await countAdminPosts({
                    platform: platformFilter,
                    authorId: authorFilter,
                    dateFrom,
                    dateTo,
                });
                total = res.data?.count || 0;
            } else if (activeTab === "events") {
                const res = await countAdminEvents();
                total = res.data?.count || 0;
            } else if (activeTab === "projects") {
                const res = await countAdminProjects();
                total = res.data?.count || 0;
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
            <div className={`pagination-bar pagination-bar--inline manage-display-pagination manage-display-pagination--${position}`}>
                    <div className="pagination-controls">
                        <button
                            type="button"
                            className="ui-button pagination-btn"
                            onClick={() => setPage((current) => Math.max(1, current - 1))}
                            disabled={page === 1}
                        >
                            ‹ Prev
                        </button>
                        <span>Page {page} / {lastPage}</span>
                        <button
                            type="button"
                            className="ui-button pagination-btn"
                            onClick={() => setPage((current) => current + 1)}
                            disabled={nextDisabled}
                        >
                            Next ›
                        </button>
                    </div>
                    <div className="pagination-jump">
                        <label className="pagination-jump-label" htmlFor={inputId}>Jump to:</label>
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
                            onBlur={() => {
                                if (jumpPage) jumpToPage();
                            }}
                            className="jump-to-input"
                        />
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

            <ToggleGroup className="manage-authors-filter-tabs" role="tablist" aria-label="Manage display section">
                {TABS.map((tab) => (
                    <ToggleButton
                        key={tab}
                        role="tab"
                        active={activeTab === tab}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tabLabel(tab)}
                    </ToggleButton>
                ))}
            </ToggleGroup>

            {activeTab !== "authors" && activeTab !== "event-settings" && (
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
                                <option value="temp">Temporary authors</option>
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
                                placeholder="Search authors, captions, translations, replies, notes"
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

            {activeTab === "event-settings" && <EventDisplaySettings />}

            {activeTab !== "event-settings" && <section className="eventform-section eventform-form">
                <h3>{tabLabel(activeTab)}</h3>

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
            </section>}
        </div>
    );
}

const EMPTY_EVENT_VIEW = {
    title: "",
    slug: "",
    is_visible: true,
    name_filter: "",
    category: "",
    subcategory: "",
    author: "",
    event_sort: "newest",
    view_mode: "list",
};

function EventCategoryManager({ categories, loading, reload }) {
    const [newCategory, setNewCategory] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [draggedId, setDraggedId] = useState(null);
    const [dropTarget, setDropTarget] = useState(null);
    const dialogRef = useRef(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (selectedCategoryId !== null) {
            if (!dialog.open) dialog.showModal();
        } else if (dialog.open) {
            dialog.close();
        }
    }, [selectedCategoryId]);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const handleClose = () => setSelectedCategoryId(null);
        dialog.addEventListener("close", handleClose);
        return () => dialog.removeEventListener("close", handleClose);
    }, []);

    async function run(action) {
        setSaving(true);
        setError("");
        try {
            await action();
            await reload();
            return true;
        } catch (err) {
            setError(err.response?.data?.detail || "Could not update event categories.");
            return false;
        } finally {
            setSaving(false);
        }
    }

    async function addCategory(e) {
        e.preventDefault();
        if (!newCategory.trim()) return;
        const saved = await run(() => createEventCategory({ name: newCategory }));
        if (saved) setNewCategory("");
    }

    async function removeCategory(category) {
        if (!confirm(`Delete the “${category.label}” category and its subcategories? Categories used by events cannot be deleted.`)) return;
        const removed = await run(() => deleteEventCategory(category.id));
        if (removed && selectedCategoryId === category.id) setSelectedCategoryId(null);
    }

    function dropCategory(targetId, position) {
        if (!draggedId || draggedId === targetId) return;
        const reordered = [...categories];
        const sourceIndex = reordered.findIndex((item) => item.id === draggedId);
        const [moved] = reordered.splice(sourceIndex, 1);
        let targetIndex = reordered.findIndex((item) => item.id === targetId);
        if (position === "after") targetIndex += 1;
        reordered.splice(targetIndex, 0, moved);
        run(() => Promise.all(reordered.map((item, index) =>
            item.sort_order === index ? Promise.resolve() : updateEventCategory(item.id, { sort_order: index })
        )));
        setDraggedId(null);
        setDropTarget(null);
    }

    return (
        <section className="eventform-section eventform-form">
            <h3 style={{ marginBottom: 4 }}>Event categories</h3>
            <p style={{ marginTop: 0, color: "#77695e", fontSize: "0.88rem" }}>
                Drag categories into their public order. Open one only when you need to edit it or manage its subcategories.
            </p>
            {error && <p role="alert" style={{ color: "#9a3412" }}>{error}</p>}
            <form className="event-setup-add-row" onSubmit={addCategory}>
                <label style={{ flex: "1 1 220px" }}>
                    New category
                    <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="e.g. Concert" />
                </label>
                <Button variant="add" size="large" className="event-setup-add-button" type="submit" disabled={saving || !newCategory.trim()}>+ Add category</Button>
            </form>
            <div className="manage-authors-list">
                {loading ? <p>Loading...</p> : categories.map((category) => {
                    const position = dropTarget?.id === category.id ? dropTarget.position : null;
                    return <div key={category.id || category.value}>
                        <div
                            className={`manage-authors-row${draggedId === category.id ? " is-dragging" : ""}`}
                            onDragOver={(event) => {
                                event.preventDefault();
                                const rect = event.currentTarget.getBoundingClientRect();
                                setDropTarget({ id: category.id, position: event.clientY < rect.top + rect.height / 2 ? "before" : "after" });
                            }}
                            onDrop={(event) => {
                                event.preventDefault();
                                dropCategory(category.id, dropTarget?.position || "before");
                            }}
                        >
                            {position && draggedId !== category.id && <div aria-hidden="true" style={{ position: "absolute", left: 8, right: 8, [position === "before" ? "top" : "bottom"]: -5, height: 4, borderRadius: 999, background: "#a76719", boxShadow: "0 0 0 2px #fff8ef", zIndex: 5, pointerEvents: "none" }} />}
                            <DragHandle
                                onDragStart={(event) => {
                                    setDraggedId(category.id);
                                    event.dataTransfer.effectAllowed = "move";
                                    event.dataTransfer.setData("text/plain", String(category.id));
                                }}
                                onDragEnd={() => { setDraggedId(null); setDropTarget(null); }}
                                label={`Drag ${category.label} to reorder`}
                            />
                            <div className="manage-authors-row-info">
                                <strong>{category.label}</strong>
                                <div className="manage-authors-row-sub">{category.subcategories?.length || 0} subcategories · stored as “{category.value}”</div>
                            </div>
                            <button type="button" className="manage-authors-row-edit" onClick={() => setSelectedCategoryId(category.id)}>Edit</button>
                            <Button variant="danger" size="small" disabled={saving} className="manage-display-delete" onClick={() => removeCategory(category)}>Delete</Button>
                        </div>
                    </div>;
                })}
            </div>

            <dialog
                ref={dialogRef}
                className="manage-authors-dialog"
                aria-labelledby="event-category-dialog-title"
                onClick={(event) => { if (event.target === dialogRef.current) dialogRef.current.close(); }}
            >
                <button type="button" className="manage-authors-dialog-close" aria-label="Close editor" onClick={() => dialogRef.current?.close()}>×</button>
                {categories.find((category) => category.id === selectedCategoryId) && (() => {
                    const category = categories.find((item) => item.id === selectedCategoryId);
                    return <>
                        <div className="manage-authors-dialog-header">
                            <div>
                                <h3 id="event-category-dialog-title">{category.label}</h3>
                                <span>Event category · {category.subcategories?.length || 0} subcategories</span>
                            </div>
                        </div>
                        {error && <p role="alert" style={{ color: "#9a3412" }}>{error}</p>}
                        <EventCategoryEditor key={`${category.id}-${category.value}-${category.label}`} category={category} saving={saving} run={run} />
                    </>;
                })()}
            </dialog>
        </section>
    );
}

function EventCategoryEditor({ category, saving, run }) {
    const [name, setName] = useState(category.value);
    const [label, setLabel] = useState(category.label);
    const [newSubcategory, setNewSubcategory] = useState("");
    const [editingSubcategoryId, setEditingSubcategoryId] = useState(null);
    const [draggedId, setDraggedId] = useState(null);
    const [dropTarget, setDropTarget] = useState(null);

    async function saveCategory() {
        await run(() => updateEventCategory(category.id, { name, label }));
    }

    async function addSubcategory(e) {
        e.preventDefault();
        if (!newSubcategory.trim()) return;
        const saved = await run(() => createEventSubcategory({ category_id: category.id, name: newSubcategory }));
        if (saved) setNewSubcategory("");
    }

    function dropSubcategory(targetId, position) {
        if (!draggedId || draggedId === targetId) return;
        const subcategories = category.subcategories || [];
        const reordered = [...subcategories];
        const sourceIndex = reordered.findIndex((item) => item.id === draggedId);
        const [moved] = reordered.splice(sourceIndex, 1);
        let targetIndex = reordered.findIndex((item) => item.id === targetId);
        if (position === "after") targetIndex += 1;
        reordered.splice(targetIndex, 0, moved);
        run(() => Promise.all(reordered.map((item, index) =>
            item.sort_order === index ? Promise.resolve() : updateEventSubcategory(item.id, { sort_order: index })
        )));
        setDraggedId(null);
        setDropTarget(null);
    }

    return (
        <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
            <strong>Category details</strong>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
                <label>
                    Stored name
                    <input value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <label>
                    Display label
                    <input value={label} onChange={(e) => setLabel(e.target.value)} />
                </label>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button type="button" disabled={saving || !name.trim()} onClick={saveCategory}>Save category</button>
            </div>

            <div style={{ borderTop: "1px solid rgba(0,0,0,.12)", paddingTop: 10 }}>
                <strong>Subcategories</strong>
                <div className="manage-authors-list">
                    {(category.subcategories || []).map((subcategory) => {
                        const editing = editingSubcategoryId === subcategory.id;
                        const position = dropTarget?.id === subcategory.id ? dropTarget.position : null;
                        return <div key={subcategory.id || subcategory.value}>
                            <div
                                className={`manage-authors-row${draggedId === subcategory.id ? " is-dragging" : ""}`}
                                onDragOver={(event) => {
                                    event.preventDefault();
                                    const rect = event.currentTarget.getBoundingClientRect();
                                    setDropTarget({ id: subcategory.id, position: event.clientY < rect.top + rect.height / 2 ? "before" : "after" });
                                }}
                                onDrop={(event) => {
                                    event.preventDefault();
                                    dropSubcategory(subcategory.id, dropTarget?.position || "before");
                                }}
                            >
                                {position && draggedId !== subcategory.id && <div aria-hidden="true" style={{ position: "absolute", left: 8, right: 8, [position === "before" ? "top" : "bottom"]: -5, height: 4, borderRadius: 999, background: "#a76719", boxShadow: "0 0 0 2px #fff8ef", zIndex: 5, pointerEvents: "none" }} />}
                                <DragHandle
                                    onDragStart={(event) => {
                                        setDraggedId(subcategory.id);
                                        event.dataTransfer.effectAllowed = "move";
                                        event.dataTransfer.setData("text/plain", String(subcategory.id));
                                    }}
                                    onDragEnd={() => { setDraggedId(null); setDropTarget(null); }}
                                    label={`Drag ${subcategory.label} to reorder`}
                                />
                                <div className="manage-authors-row-info">
                                    <strong>{subcategory.label}</strong>
                                    <div className="manage-authors-row-sub">stored as “{subcategory.value}”</div>
                                </div>
                                <button type="button" className="manage-authors-row-edit" onClick={() => setEditingSubcategoryId(editing ? null : subcategory.id)}>{editing ? "Close" : "Edit"}</button>
                                <Button variant="danger" size="small" disabled={saving} className="manage-display-delete" onClick={async () => {
                                    if (!confirm(`Delete the “${subcategory.label}” subcategory? Subcategories used by events cannot be deleted.`)) return;
                                    const removed = await run(() => deleteEventSubcategory(subcategory.id));
                                    if (removed) setEditingSubcategoryId(null);
                                }}>Delete</Button>
                            </div>
                            {editing && <EventSubcategoryEditor key={`${subcategory.id}-${subcategory.value}-${subcategory.label}`} subcategory={subcategory} saving={saving} run={run} />}
                        </div>;
                    })}
                    {(category.subcategories || []).length === 0 && <span style={{ opacity: 0.7 }}>No subcategories.</span>}
                </div>
                <form className="event-setup-add-row event-setup-add-row--subcategory" onSubmit={addSubcategory}>
                    <label style={{ flex: "1 1 220px" }}>
                        New subcategory
                        <input value={newSubcategory} onChange={(e) => setNewSubcategory(e.target.value)} placeholder="e.g. Fan meeting" />
                    </label>
                    <Button variant="add" size="large" className="event-setup-add-button" type="submit" disabled={saving || !newSubcategory.trim()}>+ Add subcategory</Button>
                </form>
            </div>
        </div>
    );
}

function EventSubcategoryEditor({ subcategory, saving, run }) {
    const [name, setName] = useState(subcategory.value);
    const [label, setLabel] = useState(subcategory.label);

    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, alignItems: "end", padding: "8px 12px" }}>
            <label>
                Stored name
                <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
                Display label
                <input value={label} onChange={(e) => setLabel(e.target.value)} />
            </label>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                <button type="button" disabled={saving || !name.trim()} onClick={() => run(() => updateEventSubcategory(subcategory.id, { name, label }))}>Save</button>
            </div>
        </div>
    );
}

function eventViewSlug(value) {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function EventDisplaySettings() {
    const { categories, loading, reload } = useEventCategories();
    return (
        <>
            <EventCategoryManager categories={categories} loading={loading} reload={reload} />
            <FilteredEventPages categories={categories} />
        </>
    );
}

function FilteredEventPages({ categories }) {
    const [views, setViews] = useState([]);
    const [draft, setDraft] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [draggedId, setDraggedId] = useState(null);
    const [dropTarget, setDropTarget] = useState(null);
    const dialogRef = useRef(null);

    async function loadViews() {
        setLoading(true);
        try {
            const res = await getAdminEventViews();
            setViews(res.data || []);
        } catch (err) {
            setError(err.response?.data?.detail || "Could not load filtered event pages.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadViews();
    }, []);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (draft) {
            if (!dialog.open) dialog.showModal();
        } else if (dialog.open) {
            dialog.close();
        }
    }, [draft]);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const handleClose = () => {
            setDraft(null);
            setEditingId(null);
        };
        dialog.addEventListener("close", handleClose);
        return () => dialog.removeEventListener("close", handleClose);
    }, []);

    function startCreate() {
        setEditingId(null);
        setDraft({ ...EMPTY_EVENT_VIEW });
        setError("");
    }

    function startEdit(view) {
        setEditingId(view.id);
        setDraft({
            ...EMPTY_EVENT_VIEW,
            ...view,
            name_filter: view.name_filter || "",
            category: view.category || "",
            subcategory: view.subcategory || "",
            author: view.author || "",
        });
        setError("");
    }

    function updateDraft(field, value) {
        setDraft((current) => {
            const next = { ...current, [field]: value };
            if (field === "category") next.subcategory = "";
            return next;
        });
    }

    async function saveView(e) {
        e.preventDefault();
        setSaving(true);
        setError("");
        try {
            const payload = {
                ...draft,
                title: draft.title.trim(),
                slug: eventViewSlug(draft.slug),
                name_filter: draft.name_filter?.trim() || null,
                category: draft.category || null,
                subcategory: draft.subcategory || null,
                author: draft.author || null,
            };
            if (editingId) await updateEventView(editingId, payload);
            else await createEventView(payload);
            setDraft(null);
            setEditingId(null);
            await loadViews();
        } catch (err) {
            setError(err.response?.data?.detail || "Could not save the filtered event page.");
        } finally {
            setSaving(false);
        }
    }

    async function removeView(view) {
        if (!confirm(`Delete the filtered event page “${view.title}”?`)) return;
        setError("");
        try {
            await deleteEventView(view.id);
            setViews((current) => current.filter((item) => item.id !== view.id));
            if (editingId === view.id) {
                setEditingId(null);
                setDraft(null);
            }
        } catch (err) {
            setError(err.response?.data?.detail || "Could not delete the filtered event page.");
        }
    }

    async function dropView(targetId, position) {
        if (!draggedId || draggedId === targetId) return;
        const reordered = [...views];
        const sourceIndex = reordered.findIndex((item) => item.id === draggedId);
        if (sourceIndex < 0) return;
        const [moved] = reordered.splice(sourceIndex, 1);
        let targetIndex = reordered.findIndex((item) => item.id === targetId);
        if (position === "after") targetIndex += 1;
        reordered.splice(targetIndex, 0, moved);
        setViews(reordered.map((item, index) => ({ ...item, sort_order: index })));
        setSaving(true);
        setError("");
        try {
            await Promise.all(reordered.map((item, index) =>
                item.sort_order === index ? Promise.resolve() : updateEventView(item.id, { sort_order: index })
            ));
            await loadViews();
        } catch (err) {
            setError(err.response?.data?.detail || "Could not reorder filtered event pages.");
            await loadViews();
        } finally {
            setSaving(false);
            setDraggedId(null);
            setDropTarget(null);
        }
    }

    return (
        <section className="eventform-section eventform-form">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div>
                    <h3 style={{ marginBottom: 4 }}>Filtered event pages</h3>
                    <p style={{ margin: 0, color: "#77695e", fontSize: "0.88rem" }}>
                        Give a saved combination of event filters its own public URL.
                    </p>
                </div>
                {!draft && <Button variant="add" size="small" onClick={startCreate}>+ Add page</Button>}
            </div>

            {error && <p role="alert" style={{ color: "#9a3412" }}>{error}</p>}

            <dialog
                ref={dialogRef}
                className="manage-authors-dialog"
                aria-labelledby="filtered-event-page-dialog-title"
                onClick={(event) => { if (event.target === dialogRef.current) dialogRef.current.close(); }}
            >
                <button type="button" className="manage-authors-dialog-close" aria-label="Close editor" onClick={() => dialogRef.current?.close()}>×</button>
                {draft && <>
                    <div className="manage-authors-dialog-header">
                        <div>
                            <h3 id="filtered-event-page-dialog-title">{editingId ? draft.title || "Edit event page" : "New filtered event page"}</h3>
                            <span>Public event URL and default filters</span>
                        </div>
                    </div>
                    {error && <p role="alert" style={{ color: "#9a3412" }}>{error}</p>}
                <form onSubmit={saveView} style={{ display: "grid", gap: 12, marginTop: 16 }}>
                    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                        <label>
                            Page name <span className="form-required">*</span>
                            <input
                                required
                                value={draft.title}
                                onChange={(e) => {
                                    const title = e.target.value;
                                    setDraft((current) => ({
                                        ...current,
                                        title,
                                        slug: editingId || current.slug ? current.slug : eventViewSlug(title),
                                    }));
                                }}
                                placeholder="ViewMim fan events"
                            />
                        </label>
                        <label>
                            Slug <span className="form-required">*</span>
                            <input required value={draft.slug} onChange={(e) => updateDraft("slug", eventViewSlug(e.target.value))} placeholder="viewmim-fan-events" />
                            <small>Public URL: /events/view/{draft.slug || "your-slug"}</small>
                        </label>
                        <label>
                            Search text
                            <input value={draft.name_filter} onChange={(e) => updateDraft("name_filter", e.target.value)} placeholder="Name, #, or keyword" />
                        </label>
                        <label>
                            Artist
                            <select value={draft.author} onChange={(e) => updateDraft("author", e.target.value)}>
                                <option value="">All</option>
                                <option value="viewmim">ViewMim</option>
                                <option value="view">View</option>
                                <option value="mim">Mim</option>
                                <option value="vimmy">Vimmy</option>
                            </select>
                        </label>
                        <label>
                            Category
                            <select value={draft.category} onChange={(e) => updateDraft("category", e.target.value)}>
                                <option value="">All</option>
                                {categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
                            </select>
                        </label>
                        <label>
                            Subcategory
                            <select value={draft.subcategory} disabled={!draft.category} onChange={(e) => updateDraft("subcategory", e.target.value)}>
                                <option value="">All</option>
                                {(categories.find((category) => category.value === draft.category)?.subcategories || []).map((subcategory) => (
                                    <option key={subcategory.value} value={subcategory.value}>{subcategory.label}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Default sort
                            <select value={draft.event_sort} onChange={(e) => updateDraft("event_sort", e.target.value)}>
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                            </select>
                        </label>
                        <label>
                            Default view
                            <select value={draft.view_mode} onChange={(e) => updateDraft("view_mode", e.target.value)}>
                                <option value="list">List</option>
                                <option value="calendar">Calendar</option>
                            </select>
                        </label>
                    </div>
                    <VisibilityToggle
                        className="manage-display-public-toggle"
                        checked={!!draft.is_visible}
                        disabled={saving}
                        onChange={(e) => updateDraft("is_visible", e.target.checked)}
                        label="Public"
                    />
                    <div className="manage-authors-dialog-actions">
                        <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save page"}</button>
                        <button type="button" disabled={saving} onClick={() => dialogRef.current?.close()}>Cancel</button>
                    </div>
                </form>
                </>}
            </dialog>

            <div className="manage-authors-list">
                {loading ? <p>Loading...</p> : views.map((view) => {
                    const position = dropTarget?.id === view.id ? dropTarget.position : null;
                    return <div
                        key={view.id}
                        className={`manage-authors-row${draggedId === view.id ? " is-dragging" : ""}`}
                        onDragOver={(event) => {
                            event.preventDefault();
                            const rect = event.currentTarget.getBoundingClientRect();
                            setDropTarget({ id: view.id, position: event.clientY < rect.top + rect.height / 2 ? "before" : "after" });
                        }}
                        onDrop={(event) => {
                            event.preventDefault();
                            dropView(view.id, dropTarget?.position || "before");
                        }}
                    >
                        {position && draggedId !== view.id && <div aria-hidden="true" style={{ position: "absolute", left: 8, right: 8, [position === "before" ? "top" : "bottom"]: -5, height: 4, borderRadius: 999, background: "#a76719", boxShadow: "0 0 0 2px #fff8ef", zIndex: 5, pointerEvents: "none" }} />}
                        <DragHandle
                            disabled={saving}
                            onDragStart={(event) => {
                                setDraggedId(view.id);
                                event.dataTransfer.effectAllowed = "move";
                                event.dataTransfer.setData("text/plain", String(view.id));
                            }}
                            onDragEnd={() => { setDraggedId(null); setDropTarget(null); }}
                            label={`Drag ${view.title} to reorder`}
                        />
                        <div className="manage-authors-row-info">
                            <strong>{view.title}</strong>
                            <div className="manage-authors-row-sub">/events/view/{view.slug}</div>
                        </div>
                        <span style={{ whiteSpace: "nowrap", color: view.is_visible ? "#2f7d32" : "#9a3412" }}>{view.is_visible ? "public" : "hidden"}</span>
                        {view.is_visible && <Link to={ROUTES.eventView(view.slug)} target="_blank" rel="noopener noreferrer">View</Link>}
                        <button type="button" className="manage-authors-row-edit" onClick={() => startEdit(view)}>Edit</button>
                        <Button variant="danger" size="small" className="manage-display-delete" onClick={() => removeView(view)}>Delete</Button>
                    </div>;
                })}
                {!loading && views.length === 0 && !draft && <p>No filtered event pages yet.</p>}
            </div>
        </section>
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

    const previewUrl = previewUrlForItem(tab, item);

    return (
        <div
            className="manage-display-card"
            onDragOver={canDrag ? onDragOver : undefined}
            onDrop={canDrag ? onDrop : undefined}
            style={{
                border: "1px solid rgba(0, 0, 0, 0.15)",
                borderRadius: 8,
                paddingTop: 12,
                paddingRight: 12,
                paddingBottom: 12,
                paddingLeft: canDrag ? 92 : 12,
                display: "grid",
                gap: 8,
                position: "relative",
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
                <DragHandle
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    label="Drag to change post display order"
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: 14,
                        transform: "translateY(-50%)",
                        cursor: "grab",
                        zIndex: 2,
                    }}
                />
            )}
            <div className="manage-display-card-header" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                <div className="manage-display-entry-summary">
                    <ManageDisplayPreview url={previewUrl} title={title} tab={tab} item={item} />
                    <div>
                        <strong>{title}</strong>
                        <div className="manage-display-entry-meta" style={{ fontSize: "0.9rem", opacity: 0.75, marginTop: 4 }}>{meta}</div>
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
                    <VisibilityToggle
                        className="manage-display-public-toggle"
                        checked={!!isVisible}
                        disabled={saving}
                        onChange={onToggle}
                        label="Public"
                    />
                )}

                {editUrl && <Link to={editUrl} state={{ returnTo }} target="_blank" rel="noopener noreferrer">Edit</Link>}

                {appUrl && <Link to={appUrl} target="_blank" rel="noopener noreferrer">View in app</Link>}

                {tab === "posts" && item.external_url && (
                    <a href={item.external_url} target="_blank" rel="noreferrer">Open source</a>
                )}

                {tab === "posts" && (
                    <Button
                        variant="danger"
                        size="small"
                        className="manage-display-delete"
                        disabled={saving}
                        onClick={onDelete}
                        style={{ display: onDelete ? undefined : "none" }}
                    >
                        Delete
                    </Button>
                )}
            </div>
        </div>
    );
}
