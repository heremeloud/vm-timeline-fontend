import { useState } from "react";
import { Link } from "react-router-dom";
import Avatar from "./Avatar";
import "../styles/EventCard.css";

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

function buildTwitterQuery(term, eventDate) {
    const t = (term || "").trim();
    const d = (eventDate || "").trim();
    if (!t) return "";

    if (!d) return t;

    const until = addOneDay(d);
    if (!until) return t;

    return `${t} since:${d} until:${until}`;
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
    const isAdmin = !!localStorage.getItem("adminToken");

    const [copied, setCopied] = useState(false);

    async function handleCopyTerm(term) {
        const query = buildTwitterQuery(term, event.event_date);
        const ok = await copyToClipboard(query);
        if (!ok) return;

        setCopied(true);
        window.clearTimeout(handleCopyTerm._t);
        handleCopyTerm._t = window.setTimeout(() => setCopied(false), 1200);
    }

    const liveUrl = safeUrl(event.live_url);
    const ytEmbed = getYouTubeEmbedUrl(event.live_url);

    return (
        <div className="eventcard-wrapper">
            <div className="eventcard-inner">
                <div className="eventcard-header">
                    <div className="eventcard-title">{event.name}</div>

                    {isAdmin && (
                        <div className="eventcard-actions">
                            <Link to={`/edit-event/${event.id}`}>
                                <button className="eventcard-btn">Edit</button>
                            </Link>
                        </div>
                    )}
                </div>

                {(event.event_date || event.location) && (
                    <div className="eventcard-meta">
                        {event.event_date ? `📅 ${event.event_date}` : null}
                        {event.event_date && event.location ? "  •  " : null}
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
                                    event.event_date
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
                                        event.event_date
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
                {liveUrl && (
                    <div className="eventcard-live">
                        <div className="eventcard-live-title">Media</div>

                        {ytEmbed ? (
                            <div className="eventcard-live-embed">
                                <iframe
                                    src={ytEmbed}
                                    title={`${event.name} live`}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                />
                            </div>
                        ) : (
                            <a
                                className="eventcard-live-link"
                                href={liveUrl}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Watch Live ↗
                            </a>
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
            </div>
        </div>
    );
}
