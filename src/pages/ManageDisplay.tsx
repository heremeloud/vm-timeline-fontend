import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent, FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { getAuthors } from "../api/authorsService";
import { countAdminPosts, countAdminPostSearch, deletePost, getAdminPosts, reorderPost, searchAdminPosts, updatePost } from "../api/postsService";
import { countAdminEvents, getAdminEvents, updateEvent } from "../api/eventsService";
import { createEventView, deleteEventView, getAdminEventViews, updateEventView } from "../api/eventViewsService";
import { createEventCategory, createEventSubcategory, deleteEventCategory, deleteEventSubcategory, updateEventCategory, updateEventSubcategory } from "../api/eventCategoriesService";
import { countAdminProjects, getAdminProjects, updateProject } from "../api/projectsService";
import { getAdminTopics, updateTopic } from "../api/topicsService";
import { ROUTES } from "../routes";
import { formatEventDateRange } from "../utils/eventDateRange";
import useEventCategories from "../hooks/useEventCategories";
import useModalDialog from "../hooks/useModalDialog";
import { isVideo } from "../utils/media";
import TweetEmbed from "../components/TweetEmbed";
import InstagramEmbed from "../components/InstagramEmbed";
import TikTokEmbed from "../components/TikTokEmbed";
import VisibilityToggle from "../components/VisibilityToggle";
import { Button, DragHandle, DropIndicator, Pagination, ToggleButton, ToggleGroup } from "../ui";
import { errorDetail } from "../utils/errors";
import AuthorGroupFilters from "../components/AuthorGroupFilters";
import { defaultShownAuthorGroups, hiddenAuthorCategories } from "../utils/authorGroups";
import { slugify } from "../utils/slugify";
import { resolvePhotoUrl } from "../utils/media";
import type { SearchScopes } from "../api/postsService";
import type { Author, EventCategoryOption, EventSubcategoryOption, EventView, Id, MediaItem } from "../types/models";
import "../styles/EventForm.css";

const LIMIT = 25;
const TABS = ["posts", "events", "event-settings", "projects", "specials"] as const;

type Tab = (typeof TABS)[number];
type DropPosition = "before" | "after";
type DragTargetState = { id: Id; position: DropPosition };

/**
 * One row of any Manage Display tab. The tabs list different record types
 * (posts, events, projects, specials), so only the fields this screen
 * reads are modelled, and all of them are optional apart from `id`.
 */
interface DisplayItem {
    id: Id;
    /** Search results: the matched post or reply, and the post it belongs to. */
    result_id?: string | number;
    result_type?: string;
    target_post_id?: Id;
    match_text?: string | null;
    post_author_name?: string | null;
    post_platform?: string;
    post_content_type?: string;
    platform?: string;
    content_type?: string;
    external_url?: string | null;
    media_url?: string | null;
    media_urls?: Array<MediaItem | string>;
    caption?: string | null;
    display_source?: string;
    posted_at?: string | null;
    author_id?: Id | null;
    author_name?: string | null;
    author_photo?: string | null;
    author_ig_pfp_url?: string | null;
    author_instagram_url?: string | null;
    title?: string;
    name?: string;
    original_title?: string | null;
    category?: string | null;
    year?: number | null;
    start_date?: string | null;
    end_date?: string | null;
    event_date?: string | null;
    dates?: string[];
    project_thumbnail_url?: string | null;
    thumbnail_url?: string | null;
    cover_url?: string | null;
    is_visible?: boolean;
}

type VisibilityPatch = { is_visible?: boolean };

/** Event categories as saved by the API; settings screens only ever see saved rows with ids. */
type SavedSubcategory = EventSubcategoryOption & { id: Id };
type SavedCategory = Omit<EventCategoryOption, "id" | "subcategories"> & { id: Id; subcategories: SavedSubcategory[] };

type ReloadFn = () => Promise<void> | void;
type RunFn = (action: () => Promise<unknown>) => Promise<boolean>;

function tabLabel(tab: string) {
    return tab === "event-settings" ? "Event Setup" : tab.charAt(0).toUpperCase() + tab.slice(1);
}

function resolvePreviewUrl(url = "") {
    return resolvePhotoUrl(url) ?? "";
}

function itemStatus(isVisible: boolean | undefined, extraVisible = true) {
    return isVisible && extraVisible ? "public" : "hidden";
}

function postPlatformLabel(item: DisplayItem) {
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

function previewUrlForItem(tab: Tab, item: DisplayItem) {
    if (tab === "posts") {
        const firstMedia = Array.isArray(item.media_urls) ? item.media_urls.find((media) => typeof media === "string" ? media : media?.url) : undefined;
        return (typeof firstMedia === "string" ? firstMedia : firstMedia?.url) || item.media_url || "";
    }
    if (tab === "events") return item.media_url || item.project_thumbnail_url || "";
    if (tab === "projects") return item.thumbnail_url || "";
    return item.cover_url || "";
}

function ManageDisplayPreview({ url, title, tab, item }: { url: string; title: string; tab: Tab; item: DisplayItem }) {
    const [expanded, setExpanded] = useState(false);
    const [imageFailed, setImageFailed] = useState(false);
    const resolvedUrl = resolvePreviewUrl(url);
    const video = isVideo(resolvedUrl);
    const platform = item.platform || item.post_platform;
    const hasSocialPreview = tab === "posts" && !!item.external_url && ["ig", "instagram", "x", "twitter", "tt", "tiktok"].includes(platform ?? "");

    if ((!url || imageFailed) && !hasSocialPreview) return null;

    const platformLabel = platform === "x" || platform === "twitter"
        ? "X"
        : platform === "tt" || platform === "tiktok"
            ? "TikTok"
            : "IG";

    const socialEmbed = hasSocialPreview && expanded ? (
        platform === "x" || platform === "twitter" ? (
            <TweetEmbed url={item.external_url ?? ""} />
        ) : platform === "tt" || platform === "tiktok" ? (
            <TikTokEmbed external_url={item.external_url} media_url={item.media_url} />
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
    const draggedPostIdRef = useRef<Id | null>(null);
    const dragTargetRef = useRef<DragTargetState | null>(null);
    const location = useLocation();
    const returnTo = `${location.pathname}${location.search}`;
    const [activeTab, setActiveTab] = useState<Tab>("posts");
    const [authors, setAuthors] = useState<Author[]>([]);
    const [items, setItems] = useState<DisplayItem[]>([]);
    const [page, setPage] = useState(1);
    const [jumpPage, setJumpPage] = useState("");
    const [sortOrder, setSortOrder] = useState("newest");
    const [platformFilter, setPlatformFilter] = useState("all");
    const [authorFilter, setAuthorFilter] = useState("all");
    const [shownGroups, setShownGroups] = useState(defaultShownAuthorGroups);
    const hideAuthorCategories = useMemo(() => hiddenAuthorCategories(shownGroups), [shownGroups]);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [postSearch, setPostSearch] = useState("");
    const [submittedPostSearch, setSubmittedPostSearch] = useState("");
    const [searchScopes, setSearchScopes] = useState<SearchScopes>({
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
    const [draggedPostId, setDraggedPostId] = useState<Id | null>(null);
    const [dragTarget, setDragTarget] = useState<DragTargetState | null>(null);
    const [loadedPreviousPosts, setLoadedPreviousPosts] = useState(false);
    const [loadedNextPosts, setLoadedNextPosts] = useState(false);
    const [loadingAdjacent, setLoadingAdjacent] = useState<"previous" | "next" | "">("");

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
    }, [activeTab, sortOrder, platformFilter, authorFilter, hideAuthorCategories, dateFrom, dateTo, submittedPostSearch, searchScopes]);

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
                hideAuthorCategories,
                dateFrom,
                dateTo,
                searchScopes,
            }) : await getAdminPosts({
                limit: LIMIT + 1,
                offset,
                sort: sortOrder,
                platform: platformFilter,
                authorId: authorFilter,
                hideAuthorCategories,
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
        }

        setLoading(false);
    }

    useEffect(() => {
        loadItems();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, page, sortOrder, platformFilter, authorFilter, hideAuthorCategories, dateFrom, dateTo, submittedPostSearch, searchScopes]);

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
                    hideAuthorCategories,
                    dateFrom,
                    dateTo,
                    searchScopes,
                }) : await countAdminPosts({
                    platform: platformFilter,
                    authorId: authorFilter,
                    hideAuthorCategories,
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
            }

            if (!cancelled) setLastPage(Math.max(1, Math.ceil(total / LIMIT)));
        }

        loadLastPage().catch((err) => {
            console.error("Could not calculate the last Manage Display page:", err);
        });
        return () => {
            cancelled = true;
        };
    }, [activeTab, sortOrder, platformFilter, authorFilter, hideAuthorCategories, dateFrom, dateTo, submittedPostSearch, searchScopes]);

    const authorById = useMemo(() => {
        const map = new Map<Id, Author>();
        authors.forEach((author) => map.set(author.id, author));
        return map;
    }, [authors]);

    const visibleItems = items;

    async function updateRow(type: Tab, id: Id, data: VisibilityPatch) {
        if (type === "posts") return updatePost(id, data);
        if (type === "events") return updateEvent(id, data);
        if (type === "projects") return updateProject(id, data);
        return updateTopic(id, data);
    }

    async function toggleVisibility(type: Tab, item: DisplayItem) {
        const id = item.id;
        const key = `${type}-${id}`;
        const patch: VisibilityPatch = { is_visible: !item.is_visible };

        setSavingKey(key);
        await updateRow(type, id, patch);

        setItems((current) =>
            current.map((row) =>
                row.id === id ? { ...row, ...patch } : row
            )
        );
        setSavingKey("");
    }

    async function deletePostRow(post: DisplayItem) {
        if (!confirm("Delete this post? This also deletes its replies/comments.")) return;

        const key = `posts-${post.id}`;
        setSavingKey(key);

        try {
            await deletePost(post.id);
            setItems((current) => current.filter((row) => row.id !== post.id));
        } catch (err) {
            console.error("Delete post failed:", err);
            alert("Delete failed: " + errorDetail(err, err instanceof Error ? err.message : "Unknown error"));
        } finally {
            setSavingKey("");
        }
    }

    function submitPostSearch(e: FormEvent<HTMLFormElement>) {
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

    async function movePost(targetPostId: Id, position: DropPosition) {
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
            alert(errorDetail(err, "Could not save the post order."));
        } finally {
            setSavingKey("");
        }
    }

    async function loadAdjacentPosts(direction: "previous" | "next") {
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
                hideAuthorCategories,
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
            alert(errorDetail(err, "Could not load adjacent posts."));
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

    function renderPaginationControls(position: "top" | "bottom") {
        return (
            <Pagination
                inline
                className={`manage-display-pagination manage-display-pagination--${position}`}
                page={page}
                lastPage={lastPage}
                onPrevious={() => setPage((current) => Math.max(1, current - 1))}
                onNext={() => setPage((current) => current + 1)}
                nextDisabled={nextDisabled}
                jumpValue={jumpPage}
                onJumpChange={setJumpPage}
                onJump={jumpToPage}
            />
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

            {activeTab !== "event-settings" && (
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

                    <div style={{ marginTop: 12 }}>
                        <label>Show posts by</label>
                        <AuthorGroupFilters allTypes value={shownGroups} onChange={setShownGroups} />
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
                            {([
                                ["text", "Captions / Text"],
                                ["translations", "Translations"],
                                ["notes", "Notes"],
                                ["urls", "URLs / Media"],
                                ["replies", "Include Replies"],
                            ] as [keyof SearchScopes, string][]).map(([key, label]) => (
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

                {renderPaginationControls("top")}

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
                                author={item.author_id != null ? authorById.get(item.author_id) : undefined}
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
                                    e.dataTransfer.effectAllowed = "move";
                                    e.dataTransfer.setData("text/plain", String(item.id));
                                    // Shrinking the card inside dragstart makes Chrome cancel the drag, so style it afterwards.
                                    setTimeout(() => {
                                        if (draggedPostIdRef.current === item.id) setDraggedPostId(item.id);
                                    }, 0);
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
                                    const position: DropPosition = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
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

                {renderPaginationControls("bottom")}
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

interface EventCategoryManagerProps {
    categories: SavedCategory[];
    loading: boolean;
    reload: ReloadFn;
}

function EventCategoryManager({ categories, loading, reload }: EventCategoryManagerProps) {
    const [newCategory, setNewCategory] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState<Id | null>(null);
    const [draggedId, setDraggedId] = useState<Id | null>(null);
    const [dropTarget, setDropTarget] = useState<DragTargetState | null>(null);
    const dialogRef = useModalDialog(selectedCategoryId !== null, () => setSelectedCategoryId(null));
    const selectedCategory = categories.find((category) => category.id === selectedCategoryId);

    const run: RunFn = async (action) => {
        setSaving(true);
        setError("");
        try {
            await action();
            await reload();
            return true;
        } catch (err) {
            setError(errorDetail(err, "Could not update event categories."));
            return false;
        } finally {
            setSaving(false);
        }
    };

    async function addCategory(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!newCategory.trim()) return;
        const saved = await run(() => createEventCategory({ name: newCategory }));
        if (saved) setNewCategory("");
    }

    async function removeCategory(category: SavedCategory) {
        if (!confirm(`Delete the “${category.label}” category and its subcategories? Categories used by events cannot be deleted.`)) return;
        const removed = await run(() => deleteEventCategory(category.id));
        if (removed && selectedCategoryId === category.id) setSelectedCategoryId(null);
    }

    function dropCategory(targetId: Id, position: DropPosition) {
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
                            {position && draggedId !== category.id && <DropIndicator position={position} compact />}
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
                                <div className="manage-authors-row-sub">
                                    {category.subcategories?.length || 0} subcategories · stored as “{category.value}”
                                    {category.is_default ? " · default for event forms" : ""}
                                </div>
                            </div>
                            <label className="event-category-default-choice">
                                <input
                                    type="radio"
                                    name="default-event-category"
                                    checked={category.is_default}
                                    disabled={saving}
                                    onChange={() => {
                                        if (!category.is_default) void run(() => updateEventCategory(category.id, { is_default: true }));
                                    }}
                                />
                                Default
                            </label>
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
                {selectedCategory && (() => {
                    const category = selectedCategory;
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

function EventCategoryEditor({ category, saving, run }: { category: SavedCategory; saving: boolean; run: RunFn }) {
    const [name, setName] = useState(category.value);
    const [label, setLabel] = useState(category.label);
    const [newSubcategory, setNewSubcategory] = useState("");
    const [editingSubcategoryId, setEditingSubcategoryId] = useState<Id | null>(null);
    const [draggedId, setDraggedId] = useState<Id | null>(null);
    const [dropTarget, setDropTarget] = useState<DragTargetState | null>(null);

    async function saveCategory() {
        await run(() => updateEventCategory(category.id, { name, label }));
    }

    async function addSubcategory(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!newSubcategory.trim()) return;
        const saved = await run(() => createEventSubcategory({ category_id: category.id, name: newSubcategory }));
        if (saved) setNewSubcategory("");
    }

    function dropSubcategory(targetId: Id, position: DropPosition) {
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
                                {position && draggedId !== subcategory.id && <DropIndicator position={position} compact />}
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

function EventSubcategoryEditor({ subcategory, saving, run }: { subcategory: SavedSubcategory; saving: boolean; run: RunFn }) {
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

function EventDisplaySettings() {
    const { categories: loaded, loading, reload } = useEventCategories();
    // The setup screens only edit rows the API has saved, which always carry ids.
    const categories = loaded as SavedCategory[];
    return (
        <>
            <EventCategoryManager categories={categories} loading={loading} reload={reload} />
            <FilteredEventPages categories={categories} />
        </>
    );
}

type EventViewDraft = Omit<EventView, "id" | "sort_order"> & { id?: Id; sort_order?: number };

function FilteredEventPages({ categories }: { categories: SavedCategory[] }) {
    const [views, setViews] = useState<EventView[]>([]);
    const [draft, setDraft] = useState<EventViewDraft | null>(null);
    const [editingId, setEditingId] = useState<Id | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [draggedId, setDraggedId] = useState<Id | null>(null);
    const [dropTarget, setDropTarget] = useState<DragTargetState | null>(null);
    const dialogRef = useModalDialog(draft !== null, () => {
        setDraft(null);
        setEditingId(null);
    });

    async function loadViews() {
        setLoading(true);
        try {
            const res = await getAdminEventViews();
            setViews(res.data || []);
        } catch (err) {
            setError(errorDetail(err, "Could not load filtered event pages."));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadViews();
    }, []);

    function startCreate() {
        setEditingId(null);
        setDraft({ ...EMPTY_EVENT_VIEW });
        setError("");
    }

    function startEdit(view: EventView) {
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

    function updateDraft<K extends keyof EventViewDraft>(field: K, value: EventViewDraft[K]) {
        setDraft((current) => {
            if (!current) return current;
            const next = { ...current, [field]: value };
            if (field === "category") next.subcategory = "";
            return next;
        });
    }

    async function saveView(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);
        setError("");
        try {
            if (!draft) return;
            const payload = {
                ...draft,
                title: draft.title.trim(),
                slug: slugify(draft.slug),
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
            setError(errorDetail(err, "Could not save the filtered event page."));
        } finally {
            setSaving(false);
        }
    }

    async function removeView(view: EventView) {
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
            setError(errorDetail(err, "Could not delete the filtered event page."));
        }
    }

    async function dropView(targetId: Id, position: DropPosition) {
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
            setError(errorDetail(err, "Could not reorder filtered event pages."));
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
                                    setDraft((current) => current && ({
                                        ...current,
                                        title,
                                        slug: editingId || current.slug ? current.slug : slugify(title),
                                    }));
                                }}
                                placeholder="ViewMim fan events"
                            />
                        </label>
                        <label>
                            Slug <span className="form-required">*</span>
                            <input required value={draft.slug} onChange={(e) => updateDraft("slug", slugify(e.target.value))} placeholder="viewmim-fan-events" />
                            <small>Public URL: /events/view/{draft.slug || "your-slug"}</small>
                        </label>
                        <label>
                            Search text
                            <input value={draft.name_filter ?? ""} onChange={(e) => updateDraft("name_filter", e.target.value)} placeholder="Name, #, or keyword" />
                        </label>
                        <label>
                            Artist
                            <select value={draft.author ?? ""} onChange={(e) => updateDraft("author", e.target.value)}>
                                <option value="">All</option>
                                <option value="viewmim">ViewMim</option>
                                <option value="view">View</option>
                                <option value="mim">Mim</option>
                                <option value="vimmy">Vimmy</option>
                            </select>
                        </label>
                        <label>
                            Category
                            <select value={draft.category ?? ""} onChange={(e) => updateDraft("category", e.target.value)}>
                                <option value="">All</option>
                                {categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
                            </select>
                        </label>
                        <label>
                            Subcategory
                            <select value={draft.subcategory ?? ""} disabled={!draft.category} onChange={(e) => updateDraft("subcategory", e.target.value)}>
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
                        {position && draggedId !== view.id && <DropIndicator position={position} compact />}
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

interface DisplayRowProps {
    tab: Tab;
    item: DisplayItem;
    author?: Author;
    isSearchResult?: boolean;
    saving: boolean;
    returnTo: string;
    onToggle: () => void;
    onDelete?: () => void;
    canDrag?: boolean;
    isDragging?: boolean;
    dragPosition?: DropPosition | null;
    onDragStart: (event: DragEvent<HTMLButtonElement>) => void;
    onDragOver: (event: DragEvent<HTMLDivElement>) => void;
    onDrop: (event: DragEvent<HTMLDivElement>) => void;
    onDragEnd: () => void;
}

function DisplayRow({ tab, item, author, isSearchResult = false, saving, returnTo, onToggle, onDelete, canDrag = false, isDragging = false, dragPosition, onDragStart, onDragOver, onDrop, onDragEnd }: DisplayRowProps) {
    const isReplySearchResult = tab === "posts" && isSearchResult && item.result_type !== "post";
    const canManageDisplay = !isReplySearchResult;
    const isVisible = item.is_visible;
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
            editUrl = ROUTES.editPost(item.target_post_id ?? item.id);
            appUrl = ROUTES.postDetail(item.target_post_id ?? item.id);
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
        title = item.name ?? "";
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
