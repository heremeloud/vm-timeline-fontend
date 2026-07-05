import { useCallback, useEffect, useRef, useState } from "react";
import { getEvents } from "../api/eventsService";
import { Link, useSearchParams } from "react-router-dom";
import { ROUTES } from "../routes";
import EventCard from "../components/EventCard";
import "../styles/Home.css";
import { EVENT_CATEGORIES } from "../constants/eventCategories";
import { getEventStartDate } from "../utils/eventDateRange";

const CALENDAR_LIMIT = 500;
const LIMIT = 10;

function padDatePart(value) {
    return String(value).padStart(2, "0");
}

function formatDateKey(date) {
    return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDateKey(key) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || "");
    if (!match) return null;
    const [, y, m, d] = match;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
}

function addMonths(date, amount) {
    const next = new Date(date);
    const originalDay = next.getDate();
    next.setDate(1);
    next.setMonth(next.getMonth() + amount);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(originalDay, lastDay));
    next.setHours(0, 0, 0, 0);
    return next;
}

function formatShortDate(date) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatWindowLabel(startDate, endDate) {
    return `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`;
}

function formatDayLabel(date) {
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function calendarGridBounds(startDate, endDate) {
    const first = new Date(startDate);
    first.setDate(first.getDate() - first.getDay());

    const last = new Date(endDate);
    last.setDate(last.getDate() + (6 - last.getDay()));

    return { first, last };
}

function buildCalendarDays(startDate, endDate) {
    const { first, last } = calendarGridBounds(startDate, endDate);

    const days = [];
    for (let cursor = new Date(first); cursor <= last; cursor.setDate(cursor.getDate() + 1)) {
        days.push(new Date(cursor));
    }
    return days;
}

function eventOverlapsDay(event, dayKey) {
    const start = getEventStartDate(event);
    const end = event?.end_date || start;
    return start && start <= dayKey && end >= dayKey;
}

export default function Events() {
    const [searchParams, setSearchParams] = useSearchParams();

    const [events, setEvents] = useState([]);

    const [viewMode, setViewMode] = useState(() =>
        searchParams.get("view") === "calendar" ? "calendar" : "list"
    );
    const [sortOrder, setSortOrder] = useState("newest");
    const [nameFilter, setNameFilter] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [authorFilter, setAuthorFilter] = useState("");
    const [calendarStart, setCalendarStart] = useState(
        () => parseDateKey(searchParams.get("month")) || startOfDay(new Date())
    );

    // Keep the URL in sync with the calendar view so navigating away (e.g. to
    // an event/project detail page) and back restores the same month + view.
    useEffect(() => {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                if (viewMode === "calendar") {
                    next.set("view", "calendar");
                    next.set("month", formatDateKey(calendarStart));
                } else {
                    next.delete("view");
                    next.delete("month");
                }
                return next;
            },
            { replace: true }
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewMode, calendarStart]);

    const [page, setPage] = useState(1);
    const [jumpPage, setJumpPage] = useState("");
    const [lastPage, setLastPage] = useState(null);

    const requestIdRef = useRef(0);

    const fetchBaseEvents = useCallback(async (targetPage) => {
        const res = await getEvents({
            limit: LIMIT,
            offset: (targetPage - 1) * LIMIT,
            sort: sortOrder,
            name: nameFilter.trim() || undefined,
            category: categoryFilter || undefined,
            author: authorFilter || undefined,
        });
        return res.data || [];
    }, [sortOrder, nameFilter, categoryFilter, authorFilter]);

    const fetchCalendarEvents = useCallback(async () => {
        const rangeEnd = addMonths(calendarStart, 1);
        // Fetch the full padded grid (including the leading/trailing days from
        // adjacent months that fill out the first/last weeks), not just the
        // exact month window, so events on those visible padding days show up.
        const { first, last } = calendarGridBounds(calendarStart, rangeEnd);
        const res = await getEvents({
            limit: CALENDAR_LIMIT,
            offset: 0,
            sort: "oldest",
            name: nameFilter.trim() || undefined,
            category: categoryFilter || undefined,
            author: authorFilter || undefined,
            visibleStart: formatDateKey(first),
            visibleEnd: formatDateKey(last),
        });
        return res.data || [];
    }, [calendarStart, nameFilter, categoryFilter, authorFilter]);

    const pageHasData = useCallback(async (targetPage) => {
        const base = await fetchBaseEvents(targetPage);
        return base.length > 0;
    }, [fetchBaseEvents]);

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

    const load = useCallback(async () => {
        const requestId = ++requestIdRef.current;

        // Clear stale events immediately so switching months/pages never
        // briefly shows the previous window's events on the new dates.
        setEvents([]);

        try {
            if (viewMode === "calendar") {
                const calendarEvents = await fetchCalendarEvents();
                if (requestIdRef.current === requestId) setEvents(calendarEvents);
                return;
            }

            const baseEvents = await fetchBaseEvents(page);
            if (requestIdRef.current !== requestId) return;

            // Discover last page when we naturally hit it
            if (baseEvents.length < LIMIT) setLastPage(page);

            setEvents(baseEvents);
        } catch (err) {
            console.error("Load events failed:", err);
            if (requestIdRef.current === requestId) setEvents([]);
        }
    }, [viewMode, fetchCalendarEvents, fetchBaseEvents, page]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, [load]);

    // Reset pagination knowledge on filter change
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLastPage(null);
        setPage(1);
        setJumpPage("");
    }, [sortOrder, nameFilter, categoryFilter, authorFilter]);

    const nextDisabled = lastPage ? page >= lastPage : events.length < LIMIT;
    const calendarEnd = addMonths(calendarStart, 1);
    const visibleDayKeys = new Set(buildCalendarDays(calendarStart, calendarEnd).map(formatDateKey));
    const eventsByDay = events.reduce((acc, ev) => {
        visibleDayKeys.forEach((dayKey) => {
            if (!eventOverlapsDay(ev, dayKey)) return;
            if (!acc[dayKey]) acc[dayKey] = [];
            acc[dayKey].push(ev);
        });
        return acc;
    }, {});

    return (
        <div className="home-container">
            <div className="home-header">
                <h1 style={{ marginBottom: "0.2rem" }}>ViewMim</h1>
                <h1 style={{ marginTop: "0.2rem" }}>🤎Events🤍</h1>
                <p>Event timeline (fanmeets, shows, lives, etc.)</p>
                <p><strong>- solo events in 2025: work in progress - </strong></p>
                <small style={{ opacity: 0.7 }}>
                    ※ Click a badge to copy the Twitter search query ※
                    <br />
                    (⚠️ be aware of Twitter's search limit) 
                </small>
                <hr />
            </div>

            <div className="events-view-toggle" aria-label="Events view">
                <button
                    type="button"
                    className={viewMode === "list" ? "active" : ""}
                    onClick={() => setViewMode("list")}
                >
                    List
                </button>
                <button
                    type="button"
                    className={viewMode === "calendar" ? "active" : ""}
                    onClick={() => setViewMode("calendar")}
                >
                    Calendar
                </button>
            </div>

            {/* Filters */}
            <div className="filter-bar filter-bar--two-row filter-bar--events">
                <div className="filter-row">
                    <div className="filter-group">
                        <label>Event Name</label>
                        <input
                            type="text"
                            value={nameFilter}
                            onChange={(e) => setNameFilter(e.target.value)}
                            placeholder="Search…"
                        />
                    </div>

                    <div className="filter-divider" />

                    <div className="filter-group">
                        <label>Artist</label>
                        <select value={authorFilter} onChange={(e) => setAuthorFilter(e.target.value)}>
                            <option value="">All</option>
                            <option value="viewmim">ViewMim</option>
                            <option value="view">View</option>
                            <option value="mim">Mim</option>
                        </select>
                    </div>
                </div>

                <div className="filter-row">
                    <div className="filter-group">
                        <label>Category</label>
                        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                            <option value="">All</option>
                            {EVENT_CATEGORIES.map((c) => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-divider" />

                    <div className="filter-group">
                        <label>Sort</label>
                        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                        </select>
                    </div>
                </div>
            </div>

            {viewMode === "calendar" ? (
                <div className="events-calendar">
                    <div className="events-calendar-toolbar">
                        <button
                            type="button"
                            className="pagination-btn"
                            onClick={() => setCalendarStart((date) => addMonths(date, -1))}
                        >
                            Prev Month
                        </button>
                        <div className="events-calendar-title">
                            {formatWindowLabel(calendarStart, calendarEnd)}
                        </div>
                        <button
                            type="button"
                            className="pagination-btn"
                            onClick={() => setCalendarStart((date) => addMonths(date, 1))}
                        >
                            Next Month
                        </button>
                    </div>

                    <div className="events-calendar-grid">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
                            <div key={dayName} className="events-calendar-weekday">{dayName}</div>
                        ))}

                        {buildCalendarDays(calendarStart, calendarEnd).map((day) => {
                            const dayKey = formatDateKey(day);
                            const dayEvents = eventsByDay[dayKey] || [];
                            const isInWindow = day >= calendarStart && day <= calendarEnd;

                            return (
                                <div
                                    key={dayKey}
                                    className={`events-calendar-day${isInWindow ? "" : " outside"}${dayEvents.length ? " has-events" : " no-events"}`}
                                >
                                    <div className="events-calendar-date">
                                        <span className="events-calendar-date-day">{day.getDate()}</span>
                                        <span className="events-calendar-date-full">{formatDayLabel(day)}</span>
                                    </div>
                                    <div className="events-calendar-items">
                                        {dayEvents.slice(0, 3).map((ev) => (
                                            <Link
                                                key={`${dayKey}-${ev.id}`}
                                                to={ROUTES.eventDetail(ev.id)}
                                                className="events-calendar-event"
                                            >
                                                {ev.category && (
                                                    <span className="events-calendar-event-category">
                                                        {ev.category.toUpperCase()}
                                                    </span>
                                                )}
                                                {(ev.media_url || ev.project_thumbnail_url) && (
                                                    <img
                                                        src={ev.media_url || ev.project_thumbnail_url}
                                                        alt=""
                                                        className="events-calendar-thumb"
                                                        style={{
                                                            objectPosition: ev.media_url
                                                                ? `${ev.media_focal_x ?? 50}% ${ev.media_focal_y ?? 50}%`
                                                                : `${ev.project_thumbnail_focal_x ?? 50}% ${ev.project_thumbnail_focal_y ?? 50}%`,
                                                        }}
                                                    />
                                                )}
                                                <span className="events-calendar-event-title">{ev.name}</span>
                                            </Link>
                                        ))}
                                        {dayEvents.length > 3 && (
                                            <div className="events-calendar-more">
                                                +{dayEvents.length - 3} more
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <>
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
                                Prev
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
                                Next
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
                                className="jump-to-input"
                            />
                        </div>
                    </div>
                </>
            )}

            {/* Create Event button (admin only) */}
            {localStorage.getItem("jwt") && (
                <Link to={ROUTES.createEvent}>
                    <button className="fab-button">+</button>
                </Link>
            )}
        </div>
    );
}
