import { getEventPhotoForDate } from "../utils/eventPhotos";
import { useCallback, useEffect, useRef, useState } from "react";
import { getAdminEvents, getEvents } from "../api/eventsService";
import { getEventView } from "../api/eventViewsService";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ROUTES } from "../routes";
import EventCard from "../components/EventCard";
import EventViewNavigation from "../components/EventViewNavigation";
import "../styles/Home.css";
import useEventCategories from "../hooks/useEventCategories";
import { getEventStartDate } from "../utils/eventDateRange";
import { FilterBar, FilterDivider, FilterField, FilterRow, Select, TextInput, ToggleButton, ToggleGroup } from "../ui";

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
    if (event?.dates?.length) return event.dates.includes(dayKey);
    const start = getEventStartDate(event);
    const end = event?.end_date || start;
    return start && start <= dayKey && end >= dayKey;
}

export default function Events() {
    const { eventViewSlug } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const isAdmin = !!localStorage.getItem("jwt");
    const { categories: eventCategories } = useEventCategories();
    const [savedView, setSavedView] = useState(null);
    const [savedViewLoading, setSavedViewLoading] = useState(!!eventViewSlug);
    const [savedViewError, setSavedViewError] = useState("");

    const [events, setEvents] = useState([]);

    const [viewMode, setViewMode] = useState(() =>
        searchParams.get("view") === "calendar" ? "calendar" : "list"
    );
    const [sortOrder, setSortOrder] = useState(() => searchParams.get("sort") === "oldest" ? "oldest" : "newest");
    const [nameInput, setNameInput] = useState(() => searchParams.get("q") || "");
    const [nameFilter, setNameFilter] = useState(() => searchParams.get("q") || "");
    const [categoryFilter, setCategoryFilter] = useState(() => searchParams.get("category") || "");
    const [subcategoryFilter, setSubcategoryFilter] = useState(() => searchParams.get("subcategory") || "");
    const [authorFilter, setAuthorFilter] = useState(() => searchParams.get("author") || "");
    const [calendarStart, setCalendarStart] = useState(
        () => parseDateKey(searchParams.get("month")) || startOfDay(new Date())
    );

    const [page, setPage] = useState(() =>
        Math.max(1, Number(searchParams.get("page")) || 1)
    );

    useEffect(() => {
        if (!eventViewSlug) {
            setSavedView(null);
            setSavedViewError("");
            setSavedViewLoading(false);
            const nextName = searchParams.get("q") || "";
            setNameInput(nextName);
            setNameFilter(nextName);
            setCategoryFilter(searchParams.get("category") || "");
            setSubcategoryFilter(searchParams.get("subcategory") || "");
            setAuthorFilter(searchParams.get("author") || "");
            setSortOrder(searchParams.get("sort") === "oldest" ? "oldest" : "newest");
            setViewMode(searchParams.get("view") === "calendar" ? "calendar" : "list");
            setPage(Math.max(1, Number(searchParams.get("page")) || 1));
            return;
        }

        let cancelled = false;
        setSavedView(null);
        setSavedViewLoading(true);
        setSavedViewError("");
        setPage(Math.max(1, Number(searchParams.get("page")) || 1));
        getEventView(eventViewSlug)
            .then((res) => {
                if (cancelled) return;
                const view = res.data;
                setSavedView(view);
                const nextName = searchParams.get("q") ?? view.name_filter ?? "";
                setNameInput(nextName);
                setNameFilter(nextName);
                setCategoryFilter(searchParams.get("category") ?? view.category ?? "");
                setSubcategoryFilter(searchParams.get("subcategory") ?? view.subcategory ?? "");
                setAuthorFilter(searchParams.get("author") ?? view.author ?? "");
                setSortOrder(searchParams.get("sort") ?? view.event_sort ?? "newest");
                setViewMode(searchParams.get("view") ?? view.view_mode ?? "list");
            })
            .catch((err) => {
                if (!cancelled) setSavedViewError(err.response?.status === 404
                    ? "This filtered event page is unavailable."
                    : "Could not load this filtered event page.");
            })
            .finally(() => {
                if (!cancelled) setSavedViewLoading(false);
            });
        return () => {
            cancelled = true;
        };
        // The URL values are intentionally read once when a saved view is resolved.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventViewSlug]);

    // Keep pagination and calendar state in the URL so refreshes, shared links,
    // and back-navigation restore the same events view.
    useEffect(() => {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                const defaultViewMode = savedView?.view_mode || "list";
                if (viewMode === "calendar") {
                    if (defaultViewMode === "calendar") next.delete("view");
                    else next.set("view", "calendar");
                    next.set("month", formatDateKey(calendarStart));
                    next.delete("page");
                } else {
                    if (defaultViewMode === "calendar") next.set("view", "list");
                    else next.delete("view");
                    next.delete("month");
                    if (page > 1) next.set("page", String(page));
                    else next.delete("page");
                }

                const defaults = savedView || {};
                const setOverride = (key, value, defaultValue = "") => {
                    if (value !== defaultValue) next.set(key, value);
                    else next.delete(key);
                };
                setOverride("q", nameFilter, defaults.name_filter || "");
                setOverride("category", categoryFilter, defaults.category || "");
                setOverride("subcategory", subcategoryFilter, defaults.subcategory || "");
                setOverride("author", authorFilter, defaults.author || "");
                setOverride("sort", sortOrder, defaults.event_sort || "newest");
                return next;
            },
            { replace: true }
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewMode, calendarStart, page, nameFilter, categoryFilter, subcategoryFilter, authorFilter, sortOrder, savedView]);

    const [jumpPage, setJumpPage] = useState("");
    const [lastPage, setLastPage] = useState(null);

    const requestIdRef = useRef(0);
    const previousFiltersRef = useRef({
        sortOrder,
        nameFilter,
        categoryFilter,
        subcategoryFilter,
        authorFilter,
    });

    const fetchBaseEvents = useCallback(async (targetPage) => {
        const request = isAdmin ? getAdminEvents : getEvents;
        const res = await request({
            // Fetch one extra row so an exact 10-result page does not falsely
            // imply that another page exists.
            limit: LIMIT + 1,
            offset: (targetPage - 1) * LIMIT,
            sort: sortOrder,
            name: nameFilter.trim() || undefined,
            category: categoryFilter || undefined,
            subcategory: subcategoryFilter || undefined,
            author: authorFilter || undefined,
        });
        return res.data || [];
    }, [sortOrder, nameFilter, categoryFilter, subcategoryFilter, authorFilter, isAdmin]);

    const fetchCalendarEvents = useCallback(async () => {
        const rangeEnd = addMonths(calendarStart, 1);
        // Fetch the full padded grid (including the leading/trailing days from
        // adjacent months that fill out the first/last weeks), not just the
        // exact month window, so events on those visible padding days show up.
        const { first, last } = calendarGridBounds(calendarStart, rangeEnd);
        const request = isAdmin ? getAdminEvents : getEvents;
        const res = await request({
            limit: CALENDAR_LIMIT,
            offset: 0,
            sort: "oldest",
            name: nameFilter.trim() || undefined,
            category: categoryFilter || undefined,
            subcategory: subcategoryFilter || undefined,
            author: authorFilter || undefined,
            visibleStart: formatDateKey(first),
            visibleEnd: formatDateKey(last),
        });
        return res.data || [];
    }, [calendarStart, nameFilter, categoryFilter, subcategoryFilter, authorFilter, isAdmin]);

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
        if (savedViewLoading || savedViewError) return;
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

            const fetchedEvents = await fetchBaseEvents(page);
            if (requestIdRef.current !== requestId) return;

            const baseEvents = fetchedEvents.slice(0, LIMIT);
            const hasNextPage = fetchedEvents.length > LIMIT;

            if (!hasNextPage) setLastPage(page);

            setEvents(baseEvents);
        } catch (err) {
            console.error("Load events failed:", err);
            if (requestIdRef.current === requestId) setEvents([]);
        }
    }, [viewMode, fetchCalendarEvents, fetchBaseEvents, page, savedViewLoading, savedViewError]);

    useEffect(() => {
        load();
    }, [load]);

    // Reset pagination knowledge on filter change
    useEffect(() => {
        const previous = previousFiltersRef.current;
        const filtersChanged = previous.sortOrder !== sortOrder
            || previous.nameFilter !== nameFilter
            || previous.categoryFilter !== categoryFilter
            || previous.subcategoryFilter !== subcategoryFilter
            || previous.authorFilter !== authorFilter;
        previousFiltersRef.current = {
            sortOrder,
            nameFilter,
            categoryFilter,
            subcategoryFilter,
            authorFilter,
        };
        if (!filtersChanged) return;

        setLastPage(null);
        setPage(1);
        setJumpPage("");
    }, [sortOrder, nameFilter, categoryFilter, subcategoryFilter, authorFilter]);

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
                <h1 style={{ marginTop: "0.2rem" }}>🤎{savedView?.title || "Events"}🤍</h1>
                <p>Event timeline (fan meets, shows, lives, etc.)</p>
                <p><strong>- solo events in 2025: work in progress - </strong></p>
                <small style={{ opacity: 0.7 }}>
                    ※ Click a keyword or hashtag to copy it                    <br />
                    Select 𝕏 to copy a date-filtered Twitter search ※
                    <br />
                    (⚠️ be aware of Twitter's search limit) 
                </small>
                <hr />
            </div>

            {savedViewLoading && <p>Loading filtered event page...</p>}
            {savedViewError && <p role="alert">{savedViewError}</p>}

            {!savedViewLoading && !savedViewError && (
                <>

            <ToggleGroup segmented className="events-view-toggle" aria-label="Events view">
                <ToggleButton
                    active={viewMode === "list"}
                    onClick={() => setViewMode("list")}
                >
                    List
                </ToggleButton>
                <ToggleButton
                    active={viewMode === "calendar"}
                    onClick={() => setViewMode("calendar")}
                >
                    Calendar
                </ToggleButton>
            </ToggleGroup>

            {/* Filters */}
            <FilterBar className="filter-bar--two-row filter-bar--events">
                <FilterRow className="filter-row">
                    <FilterField label="Search">
                        <TextInput
                            type="text"
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key !== "Enter") return;
                                e.preventDefault();
                                setNameFilter(nameInput.trim());
                                setPage(1);
                            }}
                            placeholder="Name, #, KW"
                        />
                    </FilterField>

                    <FilterDivider />

                    <FilterField label="Artist">
                        <Select value={authorFilter} onChange={(e) => setAuthorFilter(e.target.value)}>
                            <option value="">-- All --</option>
                            <option value="viewmim">ViewMim</option>
                            <option value="view">View</option>
                            <option value="mim">Mim</option>
                            <option value="vimmy">Vimmy</option>
                        </Select>
                    </FilterField>
                </FilterRow>

                <FilterRow className="filter-row">
                    <FilterField label="Category">
                        <Select
                            value={subcategoryFilter ? `${categoryFilter}:${subcategoryFilter}` : categoryFilter}
                            onChange={(e) => {
                                const [nextCategory, nextSubcategory = ""] = e.target.value.split(":");
                                setCategoryFilter(nextCategory);
                                setSubcategoryFilter(nextSubcategory);
                            }}
                        >
                            <option value="">-- All --</option>
                            {eventCategories.flatMap((category) => {
                                const subcategories = category.subcategories || [];
                                return [
                                    <option key={category.value} value={category.value}>
                                        {category.label}
                                    </option>,
                                    ...subcategories.map((subcategory) => (
                                        <option key={`${category.value}:${subcategory.value}`} value={`${category.value}:${subcategory.value}`}>
                                            {category.label} - {subcategory.label}
                                        </option>
                                    )),
                                ];
                            })}
                        </Select>
                    </FilterField>

                    <FilterDivider />

                    <FilterField label="Sort">
                        <Select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                        </Select>
                    </FilterField>
                </FilterRow>
            </FilterBar>

            <EventViewNavigation activeSlug={eventViewSlug} />

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
                                        {dayEvents.slice(0, 3).map((ev) => {
                                            const photo = getEventPhotoForDate(ev, dayKey);
                                            return (
                                            <Link
                                                key={`${dayKey}-${ev.id}`}
                                                to={ROUTES.eventDetail(ev.id)}
                                                className="events-calendar-event"
                                            >
                                                {ev.category && (
                                                    <span className="events-calendar-event-category">
                                                        {[ev.category, ev.subcategory].filter(Boolean).join(" · ").toUpperCase()}
                                                    </span>
                                                )}
                                                {(photo?.url || ev.project_thumbnail_url) && (
                                                    <img
                                                        src={photo?.url || ev.project_thumbnail_url}
                                                        alt=""
                                                        className="events-calendar-thumb"
                                                        style={{
                                                            objectPosition: photo
                                                                ? `${photo.focal_x ?? 50}% ${photo.focal_y ?? 50}%`
                                                                : `${ev.project_thumbnail_focal_x ?? 50}% ${ev.project_thumbnail_focal_y ?? 50}%`,
                                                        }}
                                                    />
                                                )}
                                                <span className="events-calendar-event-title">{ev.english_name || ev.name}</span>
                                            </Link>
                                            );
                                        })}
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
                    <div className="pagination-bar">
                        <div className="pagination-controls">
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

                        <div className="pagination-jump">
                            <span className="pagination-jump-label">Jump to:</span>
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
                </>
            )}
        </div>
    );
}
