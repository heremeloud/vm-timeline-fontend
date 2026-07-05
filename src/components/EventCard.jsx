import { useState } from "react";
import { Link } from "react-router-dom";
import Avatar from "./Avatar";
import "../styles/EventCard.css";
import { deleteEvent } from "../api/eventsService";
import { ROUTES } from "../routes";
import { formatEventDateRange, getEventStartDate } from "../utils/eventDateRange";

function orderViewMimFirst(authors = []) {
    if (!Array.isArray(authors)) return [];

    const isView = (a) => (a?.name || "").toLowerCase().trim() === "view";
    const isMim = (a) => (a?.name || "").toLowerCase().trim() === "mim";

    const view = authors.find(isView);
    const mim = authors.find(isMim);

    const rest = authors.filter((a) => !isView(a) && !isMim(a));
    return [view, mim, ...rest].filter(Boolean);
}

// YYYY-MM-DD -> YYYY-MM-DD + 1 day (Twitter until: is exclusive)
function addOneDay(yyyyMmDd) {
    if (!yyyyMmDd) return null;
    const [y, m, d] = yyyyMmDd.split("-").map(Number);
    if (!y || !m || !d) return null;

    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + 1);

    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(dt.getUTCDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
}

function buildTwitterQuery(term, startDate, endDate) {
    const t = (term || "").trim();
    const start = (startDate || "").trim();
    const end = (endDate || start || "").trim();
    if (!t) return "";

    if (!start && !end) return t;

    const until = addOneDay(end);
    if (!until) return t;

    return start ? `${t} since:${start} until:${until}` : `${t} until:${until}`;
}

const PROJECT_CATEGORY_EMOJI = {
    series: "📺",
    concert: "🎤",
    movie: "🎬",
    variety: "🎉",
    "music video": "🎵",
    other: "⭐",
};

function projectEmoji(category) {
    return PROJECT_CATEGORY_EMOJI[category?.toLowerCase()] ?? "🎬";
}

async function copyToClipboard(text) {
    if (!text) return false;

    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        const el = document.createElement("textarea");
        el.value = text;
        el.style.position = "fixed";
        el.style.left = "-9999px";
        document.body.appendChild(el);
        el.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(el);
        return ok;
    }
}


/* -------------------- LIVE URL HELPERS -------------------- */
function safeUrl(url) {
    const s = (url || "").trim();
    if (!s) return "";
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
    return `https://${s}`;
}

function getYouTubeEmbedUrl(url) {
    const u = safeUrl(url);
    if (!u) return "";

    try {
        const parsed = new URL(u);

        // youtu.be/<id>
        if (parsed.hostname.includes("youtu.be")) {
            const id = parsed.pathname.replace("/", "").trim();
            return id ? `https://www.youtube.com/embed/${id}` : "";
        }

        // youtube.com/watch?v=<id>
        if (parsed.hostname.includes("youtube.com")) {
            const v = parsed.searchParams.get("v");
            if (v) return `https://www.youtube.com/embed/${v}`;

            // youtube.com/live/<id> or /embed/<id> or /shorts/<id>
            const parts = parsed.pathname.split("/").filter(Boolean);
            const idx = parts.findIndex((p) =>
                ["live", "embed", "shorts"].includes(p)
            );
            if (idx !== -1 && parts[idx + 1]) {
                return `https://www.youtube.com/embed/${parts[idx + 1]}`;
            }
        }

        return "";
    } catch {
        return "";
    }
}

export default function EventCard({ event }) {
    const tags = event.tags || [];
    const authors = orderViewMimFirst(event.authors || []);
    const isAdmin = !!localStorage.getItem("jwt");

    const [copied, setCopied] = useState(false);
    const [liveIdx, setLiveIdx] = useState(0);
    const eventDateLabel = formatEventDateRange(event);
    const eventStartDate = getEventStartDate(event);

    async function handleCopyTerm(term) {
        const query = buildTwitterQuery(term, eventStartDate, event.end_date);
        const ok = await copyToClipboard(query);
        if (!ok) return;

        setCopied(true);
        window.clearTimeout(handleCopyTerm._t);
        handleCopyTerm._t = window.setTimeout(() => setCopied(false), 1200);
    }

    const liveUrls = (event.live_urls || []).map(safeUrl).filter(Boolean);

    return (
        <div className="eventcard-wrapper">
            <div className="eventcard-inner">
                {event.category && (
                    <div className="eventcard-category">
                        {event.category.toUpperCase()}
                    </div>
                )}

                <div className="eventcard-header">
                    <div className="eventcard-title">{event.name}</div>

                    {isAdmin && (
                        <div className="eventcard-actions">
                            <Link to={ROUTES.editEvent(event.id)}>
                                <button className="eventcard-btn">Edit</button>
                            </Link>
                            <button
                                className="btn-delete"
                                onClick={async () => {
                                    if (confirm("Delete this event?")) {
                                        try {
                                            await deleteEvent(event.id);
                                            window.location.reload();
                                        } catch (err) {
                                            console.error("Delete event failed:", err);
                                            alert("Delete failed: " + (err.response?.data?.detail || err.message));
                                        }
                                    }
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    )}
                </div>

                {(event.project_id && event.project_title) || (event.parent_event_id && event.parent_event_name) ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                        {event.project_id && event.project_title && (
                            <Link
                                to={ROUTES.projectDetail(event.project_id)}
                                className="eventcard-project-link"
                            >
                                {event.project_thumbnail_url && (
                                    <img
                                        src={event.project_thumbnail_url}
                                        alt=""
                                        className="eventcard-project-thumb"
                                        style={{
                                            objectPosition: `${event.project_thumbnail_focal_x ?? 50}% ${event.project_thumbnail_focal_y ?? 50}%`,
                                        }}
                                    />
                                )}
                                {projectEmoji(event.project_category)} {event.project_title}
                            </Link>
                        )}

                        {event.parent_event_id && event.parent_event_name && (
                            <Link
                                to={ROUTES.eventDetail(event.parent_event_id)}
                                className="eventcard-press-tour-link"
                            >
                                {event.parent_event_name}
                            </Link>
                        )}
                    </div>
                ) : null}

                {(eventDateLabel || event.location) && (
                    <div className="eventcard-meta">
                        {eventDateLabel ? `📅 ${eventDateLabel}` : null}
                        {eventDateLabel && event.location ? "  •  " : null}
                        {event.location ? `📍 ${event.location}` : null}
                    </div>
                )}

                {(event.keyword || tags.length > 0) && (
                    <div className="eventcard-badges">
                        {event.keyword && (
                            <button
                                type="button"
                                className="eventcard-badge eventcard-badge-click"
                                onClick={() => handleCopyTerm(event.keyword)}
                                title={buildTwitterQuery(
                                    event.keyword,
                                    eventStartDate,
                                    event.end_date
                                )}
                            >
                                {event.keyword}
                            </button>
                        )}

                        {tags.map((t) => {
                            const term = `#${t}`;
                            return (
                                <button
                                    key={t}
                                    type="button"
                                    className="eventcard-badge eventcard-badge-click"
                                    onClick={() => handleCopyTerm(term)}
                                    title={buildTwitterQuery(
                                        term,
                                        eventStartDate,
                                        event.end_date
                                    )}
                                >
                                    {term}
                                </button>
                            );
                        })}
                    </div>
                )}

                {copied && <div className="eventcard-copied">Copied!</div>}

                {event.media_url && (
                    <div className="eventcard-media">
                        <img
                            src={event.media_url}
                            alt={event.name}
                            className="eventcard-img"
                        />
                    </div>
                )}

                {/* LIVE VIDEO SECTION */}
                {liveUrls.length > 0 && (
                    <div className="eventcard-live">
                        <div className="eventcard-live-title">
                            Media
                            {liveUrls.length > 1 && (
                                <span className="eventcard-live-count">
                                    {liveIdx + 1} / {liveUrls.length}
                                </span>
                            )}
                        </div>

                        {(() => {
                            const url = liveUrls[liveIdx];
                            const ytEmbed = getYouTubeEmbedUrl(url);
                            return ytEmbed ? (
                                <div className="eventcard-live-embed">
                                    <iframe
                                        src={ytEmbed}
                                        title={`${event.name} media ${liveIdx + 1}`}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        allowFullScreen
                                    />
                                </div>
                            ) : (
                                <a
                                    className="eventcard-live-link"
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Watch Live ↗
                                </a>
                            );
                        })()}

                        {liveUrls.length > 1 && (
                            <div className="eventcard-live-nav">
                                <button
                                    className="eventcard-live-nav-btn"
                                    onClick={() => setLiveIdx((i) => i - 1)}
                                    disabled={liveIdx === 0}
                                >
                                    ‹ Prev
                                </button>

                                <div className="eventcard-live-dots">
                                    {liveUrls.map((_, i) => (
                                        <button
                                            key={i}
                                            className={`eventcard-live-dot${i === liveIdx ? " active" : ""}`}
                                            onClick={() => setLiveIdx(i)}
                                            aria-label={`Media ${i + 1}`}
                                        />
                                    ))}
                                </div>

                                <button
                                    className="eventcard-live-nav-btn"
                                    onClick={() => setLiveIdx((i) => i + 1)}
                                    disabled={liveIdx === liveUrls.length - 1}
                                >
                                    Next ›
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {authors.length > 0 && (
                    <div className="eventcard-participants">
                        <div className="eventcard-participants-title">
                            Participant(s):
                        </div>

                        <div className="eventcard-participants-list">
                            {authors.map((a) => (
                                <div key={a.id} className="eventcard-person">
                                    <Avatar
                                        url={a.profile_photo_url}
                                        authorId={a.id}
                                        name={a.name}
                                    />
                                    <span className="eventcard-person-name">
                                        {a.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {event.child_events?.length > 0 && (
                    <div className="eventcard-interviews">
                        <div className="eventcard-interviews-label">Interviews</div>
                        {event.child_events.map((c) => (
                            <Link
                                key={c.id}
                                to={ROUTES.eventDetail(c.id)}
                                className="eventcard-interview-item"
                            >
                                {formatEventDateRange(c) && (
                                    <span className="eventcard-interview-date">{formatEventDateRange(c)}</span>
                                )}
                                <span>{c.name}</span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
