import { useEffect, useMemo, useState } from "react";
import "../styles/Home.css";
import { getAdminPosts, getPosts, getTimeline } from "../api/postsService";
import { getEventTagIndex } from "../api/eventsService";
import { ROUTES } from "../routes";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import PostCard from "../components/PostCard";
import { buildEventTagIndex } from "../utils/eventTagLinks";
import { FilterBar, FilterDivider, FilterField, FilterRow, FloatingActionButton, Pagination, Select } from "../ui";
import type { EventTagEntry, Post, TimelinePage } from "../types/models";
import { isAdminView } from "../utils/adminView";
import AuthorGroupFilters from "../components/AuthorGroupFilters";
import { hiddenAuthorCategories, readShownAuthorGroups, writeShownAuthorGroups } from "../utils/authorGroups";
import type { ShownAuthorGroups } from "../utils/authorGroups";

interface TimelineUrlState {
    platformFilter?: string;
    sortOrder?: string;
    page?: number;
    shownGroups?: ShownAuthorGroups;
}

export default function Home() {
    const navigate = useNavigate();
    const location = useLocation();
    const isAdmin = isAdminView();
    const [searchParams, setSearchParams] = useSearchParams();
    const [posts, setPosts] = useState<Post[]>([]);
    const [events, setEvents] = useState<EventTagEntry[]>([]);

    const [platformFilter, setPlatformFilter] = useState(
        searchParams.get("platform") || "all"
    );
    const [sortOrder, setSortOrder] = useState(
        searchParams.get("sort") || "newest"
    );
    const [shownGroups, setShownGroups] = useState(() => readShownAuthorGroups(searchParams));

    const [page, setPage] = useState(() =>
        Math.max(1, Number(searchParams.get("page")) || 1)
    );
    const [jumpPage, setJumpPage] = useState("");

    const [lastPage, setLastPage] = useState<number | null>(null); // discovered last page
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const LIMIT = 10;
    const eventTagIndex = useMemo(() => buildEventTagIndex(events), [events]);
    const timelineQuery = searchParams.toString();

    function createPostAtCurrentDate() {
        const viewportCenter = window.innerHeight / 2;
        const visiblePosts = [...document.querySelectorAll<HTMLElement>("[data-timeline-post-date]")]
            .map((element) => ({
                date: element.dataset.timelinePostDate,
                rect: element.getBoundingClientRect(),
            }))
            .filter(({ date, rect }) => date && rect.bottom > 0 && rect.top < window.innerHeight);

        const currentPost = visiblePosts.sort((a, b) => {
            const aCenter = (a.rect.top + a.rect.bottom) / 2;
            const bCenter = (b.rect.top + b.rect.bottom) / 2;
            return Math.abs(aCenter - viewportCenter) - Math.abs(bCenter - viewportCenter);
        })[0];

        navigate(ROUTES.createPost, {
            state: {
                defaultPostedAt: currentPost?.date?.slice(0, 10) || "",
                returnTo: `${location.pathname}${location.search}`,
            },
        });
    }

    // Header navigation and browser back/forward can change the URL without
    // remounting this page. Keep the active timeline state in sync with it.
    useEffect(() => {
        const nextParams = new URLSearchParams(timelineQuery);
        setPlatformFilter(nextParams.get("platform") || "all");
        setSortOrder(nextParams.get("sort") || "newest");
        setShownGroups(readShownAuthorGroups(nextParams));
        setPage(Math.max(1, Number(nextParams.get("page")) || 1));
        setLastPage(null);
        setJumpPage("");
    }, [timelineQuery]);

    function updateTimelineURL(next: TimelineUrlState = {}) {
        const nextPlatform = next.platformFilter ?? platformFilter;
        const nextSort = next.sortOrder ?? sortOrder;
        const nextPage = next.page ?? page;
        const nextShownGroups = next.shownGroups ?? shownGroups;
        const params = new URLSearchParams();

        if (nextPlatform !== "all") params.set("platform", nextPlatform);
        if (nextSort !== "newest") params.set("sort", nextSort);
        if (nextPage > 1) params.set("page", String(nextPage));
        writeShownAuthorGroups(params, nextShownGroups);

        setSearchParams(params, { replace: true });
    }

    function setTimelinePage(nextPage: number) {
        const normalizedPage = Math.max(1, Number(nextPage) || 1);
        setPage(normalizedPage);
        updateTimelineURL({ page: normalizedPage });
    }

    function changePlatformFilter(nextPlatform: string) {
        setPlatformFilter(nextPlatform);
        setLastPage(null);
        setJumpPage("");
        setPage(1);
        updateTimelineURL({ platformFilter: nextPlatform, page: 1 });
    }

    function changeSortOrder(nextSort: string) {
        setSortOrder(nextSort);
        setLastPage(null);
        setJumpPage("");
        setPage(1);
        updateTimelineURL({ sortOrder: nextSort, page: 1 });
    }

    function changeShownGroups(next: ShownAuthorGroups) {
        setShownGroups(next);
        setLastPage(null);
        setJumpPage("");
        setPage(1);
        updateTimelineURL({ shownGroups: next, page: 1 });
    }

    // Fetch ONLY the base posts for a page (no replies)
    async function fetchBasePosts(targetPage: number) {
        const params = {
            limit: LIMIT,
            offset: (targetPage - 1) * LIMIT,
            sort: sortOrder,
            platform: platformFilter,
        };
        const res = isAdmin
            ? await getAdminPosts({ ...params, hideAuthorCategories: hiddenAuthorCategories(shownGroups) })
            : await getPosts(params);
        return res.data || [];
    }

    // Check if a page has at least 1 post
    async function pageHasData(targetPage: number) {
        const base = await fetchBasePosts(targetPage);
        return base.length > 0;
    }

    // Jump handler that clamps to real last page by probing + binary search
    async function handleJump() {
        const num = Number(jumpPage);

        if (!num || num < 1) {
            alert("Enter a valid page number.");
            return;
        }

        // If we already know lastPage, clamp immediately
        if (lastPage && num > lastPage) {
            setTimelinePage(lastPage);
            setJumpPage("");
            return;
        }

        try {
            // 1) Probe requested page
            const base = await fetchBasePosts(num);

            if (base.length > 0) {
                setTimelinePage(num);
                setJumpPage("");
                return;
            }

            // 2) If empty, find the last non-empty page in [1, num-1] using binary search
            let lo = 1;
            let hi = num - 1;
            let ans = 1;

            // If even page 1 has no data, stay at 1
            const hasAny = await pageHasData(1);
            if (!hasAny) {
                setLastPage(1);
                setTimelinePage(1);
                setJumpPage("");
                return;
            }

            while (lo <= hi) {
                const mid = Math.floor((lo + hi) / 2);
                const ok = await pageHasData(mid);

                if (ok) {
                    ans = mid;
                    lo = mid + 1; // try higher pages
                } else {
                    hi = mid - 1; // go lower
                }
            }

            setLastPage(ans);
            setTimelinePage(ans);
            setJumpPage("");
        } catch (err) {
            console.error("Jump failed:", err);
            alert("Jump failed. Check console for details.");
        }
    }

    async function load() {
        try {
            let timeline: TimelinePage;
            if (isAdmin) {
                const res = await getAdminPosts({
                    limit: LIMIT + 1,
                    offset: (page - 1) * LIMIT,
                    sort: sortOrder,
                    platform: platformFilter,
                    hideAuthorCategories: hiddenAuthorCategories(shownGroups),
                });
                const rows = res.data || [];
                timeline = {
                    items: rows.slice(0, LIMIT),
                    has_more: rows.length > LIMIT,
                    last_updated: sortOrder === "newest" ? rows[0]?.posted_at : null,
                };
            } else {
                const res = await getTimeline({
                    limit: LIMIT,
                    offset: (page - 1) * LIMIT,
                    sort: sortOrder,
                    platform: platformFilter,
                });
                timeline = res.data;
            }
            const timelinePosts = timeline.items || [];

            // Discover last page when we hit it naturally
            if (!timeline.has_more) {
                setLastPage(page);
            }

            setPosts(timelinePosts);
            if (timeline.last_updated) {
                const raw = timeline.last_updated;
                const normalized = raw.includes("T") ? raw : `${raw}T00:00`;
                const date = new Date(normalized);
                setLastUpdated(date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));
            }
        } catch (err) {
            console.error("Load failed:", err);
            setPosts([]);
        }
    }

    // Event tags are used to turn matching post hashtags into Event Detail links.
    useEffect(() => {
        getEventTagIndex()
            .then((res) => setEvents(res.data || []))
            .catch((err) => {
                console.error("Event tags load failed:", err);
                setEvents([]);
            });
    }, []);

    // Load whenever page/filter/sort changes
    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [platformFilter, sortOrder, page, shownGroups]);

    useEffect(() => {
        const savedScrollY = sessionStorage.getItem("homeTimelineReturnScrollY");
        if (!savedScrollY || posts.length === 0) return;

        sessionStorage.removeItem("homeTimelineReturnScrollY");
        requestAnimationFrame(() => {
            window.scrollTo(0, Number(savedScrollY) || 0);
        });
    }, [posts]);

    const nextDisabled = lastPage ? page >= lastPage : posts.length < LIMIT;

    return (
        <div className="home-container">
            <div className="home-header">
                <h1 style={{ marginBottom: "0.05rem" }}>ViewMim Interaction</h1>
                <h1 style={{ marginTop: "0.05rem" }}>🤎Timeline🤍</h1>
                <p>Collecting ViewMim social media interactions</p>
                {lastUpdated && <p>Last update: {lastUpdated}</p>}
                <p><strong>99% of 2024 IGS are included
                    <br /> 
                    - 2025 IGS: work in progress -</strong></p>
                <small style={{ opacity: 0.7 }}>
                    ※ IG stories are included starting 2026 ※
                </small>
                <hr />
            </div>

            {/* Filters */}
            <FilterBar className="filter-bar--two-row">
                <FilterRow className="filter-row">
                    <FilterField label="Platform">
                    <Select
                        value={platformFilter}
                        onChange={(e) => changePlatformFilter(e.target.value)}
                    >
                        <option value="all">All</option>
                        <option value="ig">Instagram</option>
                        <option value="bc">Broadcast Channel</option>
                        <option value="x">X (Twitter)</option>
                        <option value="tt">TikTok</option>
                    </Select>
                    </FilterField>

                    <FilterDivider />

                    <FilterField label="Sort">
                    <Select
                        value={sortOrder}
                        onChange={(e) => changeSortOrder(e.target.value)}
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                    </Select>
                    </FilterField>
                </FilterRow>
                {isAdmin && (
                    <div className="timeline-author-filters">
                        <AuthorGroupFilters value={shownGroups} onChange={changeShownGroups} />
                    </div>
                )}
            </FilterBar>

            {/* Posts Page */}
            <div className="timeline-container">
                {posts.map((post) => (
                    <div key={post.id} data-timeline-post-date={post.posted_at || ""}>
                        <PostCard post={post} eventTagIndex={eventTagIndex} />
                    </div>
                ))}
            </div>

            <Pagination
                page={page}
                lastPage={lastPage}
                onPrevious={() => setTimelinePage(page - 1)}
                onNext={() => setTimelinePage(page + 1)}
                nextDisabled={nextDisabled}
                jumpValue={jumpPage}
                onJumpChange={setJumpPage}
                onJump={handleJump}
            />

            {/* Add Button */}
            {isAdmin && (
                <FloatingActionButton label="Create post at the current timeline date" onClick={createPostAtCurrentDate} />
            )}
        </div>
    );
}
