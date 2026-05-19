import { useEffect, useState } from "react";
import { getEvents } from "../api/eventsService";
import { Link } from "react-router-dom";
import { ROUTES } from "../routes";
import EventCard from "../components/EventCard";
import "../styles/Home.css";
import { EVENT_CATEGORIES } from "../constants/eventCategories";

export default function Events() {
    const [events, setEvents] = useState([]);

    const [sortOrder, setSortOrder] = useState("newest");
    const [keywordFilter, setKeywordFilter] = useState("");
    const [tagFilter, setTagFilter] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");

    const [page, setPage] = useState(1);
    const [jumpPage, setJumpPage] = useState("");
    const [lastPage, setLastPage] = useState(null);

    const LIMIT = 10;

    async function fetchBaseEvents(targetPage) {
        const res = await getEvents({
            limit: LIMIT,
            offset: (targetPage - 1) * LIMIT,
            sort: sortOrder,
            keyword: keywordFilter.trim() || undefined,
            tag: tagFilter.trim() || undefined,
            category: categoryFilter || undefined,
        });
        return res.data || [];
    }

    async function pageHasData(targetPage) {
        const base = await fetchBaseEvents(targetPage);
        return base.length > 0;
    }

    async function handleJump() {
        const num = Number(jumpPage);
        if (!num || num < 1) {
            alert("Enter a valid page number.");
            return;
        }

        // If we already know lastPage, clamp
        if (lastPage && num > lastPage) {
            setPage(lastPage);
            setJumpPage("");
            return;
        }

        try {
            const base = await fetchBaseEvents(num);
            if (base.length > 0) {
                setPage(num);
                setJumpPage("");
                return;
            }

            // Binary search last non-empty page in [1, num-1]
            const hasAny = await pageHasData(1);
            if (!hasAny) {
                setLastPage(1);
                setPage(1);
                setJumpPage("");
                return;
            }

            let lo = 1;
            let hi = num - 1;
            let ans = 1;

            while (lo <= hi) {
                const mid = Math.floor((lo + hi) / 2);
                // eslint-disable-next-line no-await-in-loop
                const ok = await pageHasData(mid);

                if (ok) {
                    ans = mid;
                    lo = mid + 1;
                } else {
                    hi = mid - 1;
                }
            }

            setLastPage(ans);
            setPage(ans);
            setJumpPage("");
        } catch (err) {
            console.error("Jump failed:", err);
            alert("Jump failed. Check console for details.");
        }
    }

    async function load() {
        try {
            const baseEvents = await fetchBaseEvents(page);

            // Discover last page when we naturally hit it
            if (baseEvents.length < LIMIT) setLastPage(page);

            setEvents(baseEvents);
        } catch (err) {
            console.error("Load events failed:", err);
            setEvents([]);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortOrder, keywordFilter, tagFilter, categoryFilter, page]);

    // Reset pagination knowledge on filter change
    useEffect(() => {
        setLastPage(null);
        setPage(1);
        setJumpPage("");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortOrder, keywordFilter, tagFilter, categoryFilter]);

    const nextDisabled = lastPage ? page >= lastPage : events.length < LIMIT;

    return (
        <div className="home-container">
            <div className="home-header">
                <h1 style={{ marginBottom: "0.2rem" }}>ViewMim</h1>
                <h1 style={{ marginTop: "0.2rem" }}>🤎Events🤍</h1>
                <p>Event timeline (fanmeets, shows, lives, etc.)</p>
                <small style={{ opacity: 0.7 }}>
                    ※ Click a badge to copy the Twitter search query (⚠️ be aware of Twitter's search limit) ※
                </small>
                <hr />
            </div>

            {/* Filters */}
            <div className="filter-bar" style={{ gap: 12 }}>
                <label>Keyword:</label>
                <input
                    value={keywordFilter}
                    onChange={(e) => setKeywordFilter(e.target.value)}
                    placeholder="e.g. fanmeet"
                    style={{ padding: "6px 8px" }}
                />

                <label>Tag:</label>
                <input
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                    placeholder="e.g. bkk"
                    style={{ padding: "6px 8px" }}
                />

                <label>Category:</label>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ padding: "6px 8px" }}>
                    <option value="">All</option>
                    {EVENT_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                </select>

                <label>Sort:</label>
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                </select>
            </div>

            {/* Events list */}
            <div className="timeline-container">
                {events.map((ev) => (
                    <EventCard key={ev.id} event={ev} />
                ))}
            </div>

            {/* Pagination + Jump */}
            <div
                className="pagination-bar"
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "10px",
                    marginTop: "20px",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <button
                        className="pagination-btn"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        ⬅️ Prev
                    </button>

                    <span>
                        Page {page}
                        {lastPage ? ` / ${lastPage}` : ""}
                    </span>

                    <button
                        className="pagination-btn"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={nextDisabled}
                    >
                        Next ➡️
                    </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>Jump to:</span>
                    <input
                        type="number"
                        min="1"
                        max={lastPage || undefined}
                        value={jumpPage}
                        onChange={(e) => setJumpPage(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleJump();
                        }}
                        onBlur={() => {
                            if (jumpPage) handleJump();
                        }}
                        style={{ width: "55px", padding: "4px", fontSize: "0.8rem" }}
                    />
                </div>
            </div>

            {/* Create Event button (admin only) */}
            {localStorage.getItem("jwt") && (
                <Link to={ROUTES.createEvent}>
                    <button className="fab-button">+</button>
                </Link>
            )}
        </div>
    );
}
