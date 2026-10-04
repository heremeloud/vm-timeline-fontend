import { normalizeEventPhotos } from "../utils/eventPhotos";
import { useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Avatar from "./Avatar";
import TweetEmbed from "./TweetEmbed";
import "../styles/EventCard.css";
import "../styles/MediaCarousel.css";
import { Button, ButtonLink, CarouselControls, ToggleButton, ToggleGroup } from "../ui";
import { deleteEvent, updateEvent } from "../api/eventsService";
import { ROUTES } from "../routes";
import {
    formatEventDateRange,
    getEventDates,
    getEventStartDate,
} from "../utils/eventDateRange";
import { getEventDateItemForPhoto } from "../utils/eventDateItems";
import { errorDetail } from "../utils/errors";
import { getYouTubeEmbedUrl } from "../utils/media";
import { orderViewMimFirst } from "../utils/authors";
import type { Event } from "../types/models";
import { detectPostPlatform } from "../utils/postUrls";
import { isAdminView } from "../utils/adminView";

// YYYY-MM-DD -> YYYY-MM-DD + 1 day (Twitter until: is exclusive)
function addOneDay(yyyyMmDd: string | null | undefined) {
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

function buildTwitterQuery(term: string, startDate?: string | null, endDate?: string | null) {
    const t = (term || "").trim();
    const start = (startDate || "").trim();
    const end = (endDate || start || "").trim();
    if (!t) return "";

    if (!start && !end) return t;

    const until = addOneDay(end);
    if (!until) return t;

    return start ? `${t} since:${start} until:${until}` : `${t} until:${until}`;
}

interface CopyBadgeProps {
    term: string;
    startDate?: string | null;
    endDate?: string | null;
    onCopy: (text: string) => void;
}

function CopyBadge({ term, startDate, endDate, onCopy }: CopyBadgeProps) {
    const query = buildTwitterQuery(term, startDate, endDate);

    return (
        <span className="eventcard-badge">
            <button
                type="button"
                className="eventcard-badge-text"
                onClick={() => onCopy(term)}
                title={`Copy ${term}`}
                aria-label={`Copy raw text ${term}`}
            >
                {term}
            </button>
            <button
                type="button"
                className="eventcard-badge-query"
                onClick={() => onCopy(query)}
                title={`Copy X search query: ${query}`}
                aria-label={`Copy X search query for ${term}`}
            >
                𝕏
            </button>
        </span>
    );
}

const PROJECT_CATEGORY_EMOJI: Record<string, string> = {
    series: "📺",
    concert: "🎤",
    movie: "🎬",
    variety: "🎉",
    "music video": "🎵",
    other: "⭐",
};

function projectEmoji(category?: string | null) {
    return (category && PROJECT_CATEGORY_EMOJI[category.toLowerCase()]) ?? "🎬";
}

async function copyToClipboard(text: string) {
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
function safeUrl(url?: string | null) {
    const s = (url || "").trim();
    if (!s) return "";
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
    return `https://${s}`;
}

function externalSource(url: string) {
    try {
        const hostname = new URL(url).hostname.replace(/^www\./, "");
        const knownPublishers: Record<string, string> = {
            "revistaquem.globo.com": "Quem",
        };

        return {
            hostname,
            name: knownPublishers[hostname] || hostname,
        };
    } catch {
        return { hostname: url, name: "Interview source" };
    }
}

export default function EventCard({ event }: { event: Event }) {
    const location = useLocation();
    const returnTo = `${location.pathname}${location.search}`;
    const editEventUrl = `${ROUTES.editEvent(event.id)}?returnTo=${encodeURIComponent(returnTo)}`;
    const tags = event.tags || [];
    const dateItems = event.date_items || [];
    const datedItems = dateItems.filter((item) => item.date);
    const eventDates = getEventDates(event);
    const authors = orderViewMimFirst(event.authors || []);
    const isAdmin = isAdminView();
    const photos = normalizeEventPhotos(event);

    const copyTimer = useRef<number | undefined>(undefined);
    const [copied, setCopied] = useState(false);
    const [liveIdx, setLiveIdx] = useState(0);
    const initialDate = event.live_media_items?.[0]?.date || "";
    const [photoIdx, setPhotoIdx] = useState(() => {
        const initialPhotoIndex = initialDate
            ? photos.findIndex((photo) => photo.date === initialDate)
            : -1;
        return initialPhotoIndex >= 0 ? initialPhotoIndex : 0;
    });
    const [selectedDate, setSelectedDate] = useState(initialDate);
    const activePhotoIdx = photos.length ? photoIdx % photos.length : 0;
    const activePhoto = photos[activePhotoIdx];
    const selectedDateItem = datedItems.find((item) => item.date === selectedDate);
    // Once a date is chosen it owns the keywords/hashtags shown, even if it has none of its own.
    const activeDateItem = selectedDate ? (selectedDateItem || null) : getEventDateItemForPhoto(dateItems, activePhoto);
    const pillDates = [...new Set([...eventDates, ...datedItems.map((item) => item.date)])].sort();
    const activePillDate = selectedDate || activeDateItem?.date || activePhoto?.date || pillDates[0] || "";
    const hasKeywords = Boolean(event.keyword || activeDateItem?.keyword);
    const hasHashtags = tags.length > 0 || Boolean(activeDateItem?.hashtag);
    const [isPublic, setIsPublic] = useState(event.is_visible !== false);
    const [savingVisibility, setSavingVisibility] = useState(false);
    const eventDateLabel = formatEventDateRange(event);
    const eventStartDate = getEventStartDate(event);
    const displayName = event.name;
    const isInterview = event.category?.trim().toLowerCase() === "interview";
    const publicAnnouncementUrl = safeUrl(event.public_announcement_url);
    const eventDetailUrl = ROUTES.eventDetail(event.id);
    const isEventDetailPage = location.pathname === eventDetailUrl;
    // The pills replace the date line, so a date is never shown twice.
    const showDatePills = pillDates.length > 1;

    async function handleCopy(text: string) {
        const ok = await copyToClipboard(text);
        if (!ok) return;

        setCopied(true);
        window.clearTimeout(copyTimer.current);
        copyTimer.current = window.setTimeout(() => setCopied(false), 1200);
    }

    async function togglePublicVisibility() {
        const nextValue = !isPublic;
        setIsPublic(nextValue);
        setSavingVisibility(true);

        try {
            await updateEvent(event.id, { is_visible: nextValue });
        } catch (err) {
            setIsPublic(!nextValue);
            console.error("Event visibility update failed:", err);
            alert("Could not update this event's public visibility.");
        } finally {
            setSavingVisibility(false);
        }
    }

    function selectDate(date: string) {
        setSelectedDate(date);
        const matchingPhotoIndex = photos.findIndex((photo) => photo.date === date);
        if (matchingPhotoIndex >= 0) setPhotoIdx(matchingPhotoIndex);
        const matchingMediaIndex = liveMediaItems.findIndex((item) => item.date === date);
        if (matchingMediaIndex >= 0) setLiveIdx(matchingMediaIndex);
    }

    function selectPhoto(nextIndex: number) {
        setPhotoIdx(nextIndex);
        const nextPhotoDate = photos[nextIndex]?.date;
        if (nextPhotoDate && eventDates.includes(nextPhotoDate)) {
            setSelectedDate(nextPhotoDate);
            const matchingMediaIndex = liveMediaItems.findIndex((item) => item.date === nextPhotoDate);
            if (matchingMediaIndex >= 0) setLiveIdx(matchingMediaIndex);
        }
    }

    const allLiveMediaItems = (event.live_media_items?.length
        ? event.live_media_items
        : (event.live_urls || []).map((url) => ({
            url,
            keyword: null as string | null,
            hashtag: null as string | null,
            date: null as string | null,
            display_type: "auto" as const,
        })))
        .map((item) => ({ ...item, url: safeUrl(item.url) }))
        .filter((item) => item.url && item.url !== publicAnnouncementUrl);
    const liveMediaItems = allLiveMediaItems;
    const liveUrls = liveMediaItems.map((item) => item.url);
    const currentLiveMedia: Partial<(typeof liveMediaItems)[number]> = liveMediaItems[liveIdx] || {};

    function selectLiveMedia(nextIndex: number) {
        if (nextIndex < 0 || nextIndex >= liveMediaItems.length) return;
        setLiveIdx(nextIndex);

        const mediaDate = liveMediaItems[nextIndex]?.date || "";
        setSelectedDate(mediaDate);

        const matchingPhotoIndex = mediaDate
            ? photos.findIndex((photo) => photo.date === mediaDate)
            : photos.findIndex((photo) => !photo.date);
        if (matchingPhotoIndex >= 0) setPhotoIdx(matchingPhotoIndex);
    }

    return (
        <div className="eventcard-wrapper ui-content-card ui-content-card--event">
            <div className="eventcard-inner">
                {(event.category || isAdmin) && (
                    <div className="eventcard-topline">
                        {event.category && (
                            <div className="eventcard-category-area">
                                {copied && <div className="eventcard-copied">Copied!</div>}
                                <div className="eventcard-category-group">
                                    <div className="eventcard-category">
                                        {event.category.toUpperCase()}
                                    </div>
                                    {event.subcategory && (
                                        <div className="eventcard-category eventcard-subcategory">
                                            {event.subcategory.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {isAdmin && (
                            <label
                                className="eventcard-visibility-toggle"
                                title={isPublic ? "Visible to the public" : "Hidden from the public"}
                            >
                                <input
                                    type="checkbox"
                                    checked={isPublic}
                                    disabled={savingVisibility}
                                    onChange={togglePublicVisibility}
                                    aria-label="Show this event to the public"
                                />
                                <span>{savingVisibility ? "Saving…" : "Public"}</span>
                            </label>
                        )}
                    </div>
                )}

                <div className="eventcard-header">
                    <div>
                        <div className="eventcard-title">
                            {isEventDetailPage ? displayName : (
                                <Link className="eventcard-title-link" to={eventDetailUrl}>
                                    {displayName}
                                </Link>
                            )}
                        </div>
                        {event.english_name && event.name !== event.english_name && (
                            <div className="eventcard-english-title" lang="en">{event.english_name}</div>
                        )}
                    </div>
                    {isAdmin && (
                        <div className="eventcard-actions">
                            <ButtonLink to={editEventUrl} state={{ returnTo }} variant="primary" size="small">Edit</ButtonLink>
                            <Button
                                variant="danger"
                                size="small"
                                onClick={async () => {
                                    if (confirm("Delete this event?")) {
                                        try {
                                            await deleteEvent(event.id);
                                            window.location.reload();
                                        } catch (err) {
                                            console.error("Delete event failed:", err);
                                            alert("Delete failed: " + errorDetail(err, err instanceof Error ? err.message : "Unknown error"));
                                        }
                                    }
                                }}
                            >
                                Delete
                            </Button>
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
                                <span className="eventcard-icon" aria-hidden="true">{projectEmoji(event.project_category)}</span>{event.project_title}
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

                {showDatePills && (
                    <div className="eventcard-meta eventcard-meta--date-pills">
                        <span className="eventcard-icon eventcard-meta-icon" aria-hidden="true">📅</span>
                        <ToggleGroup className="eventcard-date-pills" role="group" aria-label="Choose an event date">
                            {pillDates.map((date) => (
                                <ToggleButton
                                    key={date}
                                    compact
                                    active={activePillDate === date}
                                    onClick={() => selectDate(date)}
                                >
                                    {date}
                                </ToggleButton>
                            ))}
                        </ToggleGroup>
                    </div>
                )}

                {((!showDatePills && eventDateLabel) || event.location) && (
                    <div className="eventcard-meta">
                        {!showDatePills && eventDateLabel ? <><span className="eventcard-icon eventcard-meta-icon" aria-hidden="true">📅</span>{eventDateLabel}</> : null}
                        {!showDatePills && eventDateLabel && event.location ? <span className="eventcard-meta-sep" aria-hidden="true">•</span> : null}
                        {event.location ? <><span className="eventcard-icon eventcard-meta-icon" aria-hidden="true">📍</span>{event.location}</> : null}
                    </div>
                )}

                {(hasKeywords || hasHashtags) && (
                    <div className="eventcard-badges-area" aria-label="Keywords and hashtags for the event">
                        {hasKeywords && (
                            <div className="eventcard-badges eventcard-keyword-row">
                                {event.keyword && (
                                    <CopyBadge
                                        term={event.keyword}
                                        startDate={eventStartDate}
                                        endDate={event.end_date}
                                        onCopy={handleCopy}
                                    />
                                )}
                                {activeDateItem?.keyword && (
                                    <CopyBadge
                                        term={activeDateItem.keyword}
                                        startDate={activeDateItem.date}
                                        endDate={activeDateItem.date}
                                        onCopy={handleCopy}
                                    />
                                )}
                            </div>
                        )}
                        {hasHashtags && (
                            <div className="eventcard-badges eventcard-hashtag-row">
                                {activeDateItem?.hashtag && (
                                    <CopyBadge
                                        term={`#${activeDateItem.hashtag.replace(/^#/, "")}`}
                                        startDate={activeDateItem.date}
                                        endDate={activeDateItem.date}
                                        onCopy={handleCopy}
                                    />
                                )}
                                {tags.map((t) => {
                                    const term = `#${t}`;
                                    return (
                                        <CopyBadge
                                            key={t}
                                            term={term}
                                            startDate={eventStartDate}
                                            endDate={event.end_date}
                                            onCopy={handleCopy}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {activePhoto && (
                    <div className="eventcard-media media-carousel" role="region" aria-label="Event photos">
                        <img src={activePhoto.url} alt={`${displayName} — photo ${activePhotoIdx + 1}`}
                            className="eventcard-img" loading="lazy" />
                        <CarouselControls
                            index={activePhotoIdx}
                            total={photos.length}
                            onChange={selectPhoto}
                            itemLabel="Photo"
                        />
                    </div>
                )}

                {publicAnnouncementUrl && (
                    <div className="eventcard-announcement">
                        <div className="eventcard-live-title">Announcement</div>
                        {detectPostPlatform(publicAnnouncementUrl) === "x" ? (
                            <div className="eventcard-tweet" role="region" aria-label={`${displayName} announcement tweet`}>
                                <TweetEmbed url={publicAnnouncementUrl} />
                            </div>
                        ) : (
                            <a
                                className="eventcard-live-link"
                                href={publicAnnouncementUrl}
                                target="_blank"
                                rel="noreferrer"
                            >
                                View announcement ↗
                            </a>
                        )}
                    </div>
                )}

                {/* EVENT MEDIA SECTION */}
                {liveUrls.length > 0 && (
                    <div className="eventcard-live">
                        <div className="eventcard-live-title">
                            {isInterview ? "Interview source" : "Media"}
                            {currentLiveMedia.date && <span className="eventcard-live-date"> · {currentLiveMedia.date}</span>}
                            {liveUrls.length > 1 && (
                                <span className="eventcard-live-count">
                                    {liveIdx + 1} / {liveUrls.length}
                                </span>
                            )}
                        </div>

                        {(() => {
                            const url = liveUrls[liveIdx];
                            const ytEmbed = getYouTubeEmbedUrl(url);
                            const displayType = currentLiveMedia.display_type || "auto";
                            const showTweet = displayType === "tweet"
                                || (displayType === "auto" && detectPostPlatform(url) === "x");
                            const showYouTube = displayType === "youtube"
                                || (displayType === "auto" && Boolean(ytEmbed));
                            const showArticle = displayType === "article"
                                || (displayType === "auto" && isInterview && !showTweet && !showYouTube);

                            if (showTweet) return (
                                <div className="eventcard-tweet" role="region" aria-label={`${displayName} tweet`}>
                                    <TweetEmbed url={url} />
                                </div>
                            );

                            if (showYouTube && ytEmbed) return (
                                <div className="eventcard-live-embed">
                                    {/* A new element per video: changing an iframe's src adds a browser-history entry, which breaks Back. */}
                                    <iframe
                                        key={ytEmbed}
                                        src={ytEmbed}
                                        title={`${displayName} media ${liveIdx + 1}`}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        allowFullScreen
                                    />
                                </div>
                            );

                            if (showArticle) {
                                const source = externalSource(url);
                                const readLabel = isInterview ? "Read interview" : "Read article";
                                return (
                                    <a
                                        className="eventcard-interview-source"
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        aria-label={`${readLabel} on ${source.name} (opens in a new tab)`}
                                    >
                                        <span className="eventcard-interview-source-icon" aria-hidden="true">▤</span>
                                        <span className="eventcard-interview-source-copy">
                                            <strong>{source.name}</strong>
                                            <span>{source.hostname}</span>
                                        </span>
                                        <span className="eventcard-interview-source-action">
                                            {readLabel} <span aria-hidden="true">↗</span>
                                        </span>
                                    </a>
                                );
                            }

                            return (
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

                        {(currentLiveMedia.keyword || currentLiveMedia.hashtag) && (
                            <div className="eventcard-live-badge-groups">
                                {currentLiveMedia.keyword && (
                                    <div className="eventcard-badges">
                                        <CopyBadge
                                            term={currentLiveMedia.keyword}
                                            startDate={eventStartDate}
                                            endDate={event.end_date}
                                            onCopy={handleCopy}
                                        />
                                    </div>
                                )}
                                {currentLiveMedia.hashtag && (
                                    <div className="eventcard-badges">
                                        <CopyBadge
                                            term={`#${currentLiveMedia.hashtag.replace(/^#/, "")}`}
                                            startDate={eventStartDate}
                                            endDate={event.end_date}
                                            onCopy={handleCopy}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {liveUrls.length > 1 && (
                            <div className="eventcard-live-nav">
                                <button
                                    className="eventcard-live-nav-btn"
                                    onClick={() => selectLiveMedia(liveIdx - 1)}
                                    disabled={liveIdx === 0}
                                >
                                    ‹ Prev
                                </button>

                                <div className="eventcard-live-dots">
                                    {liveUrls.map((_, i) => (
                                        <button
                                            key={i}
                                            className={`eventcard-live-dot${i === liveIdx ? " active" : ""}`}
                                            onClick={() => selectLiveMedia(i)}
                                            aria-label={`Media ${i + 1}`}
                                        />
                                    ))}
                                </div>

                                <button
                                    className="eventcard-live-nav-btn"
                                    onClick={() => selectLiveMedia(liveIdx + 1)}
                                    disabled={liveIdx === liveUrls.length - 1}
                                >
                                    Next ›
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {isEventDetailPage && event.show_interview_content && event.interview_content && (
                    <section className="eventcard-interview-content" aria-labelledby={`event-${event.id}-interview-content`}>
                        <h2 id={`event-${event.id}-interview-content`}>Interview content</h2>
                        <div>{event.interview_content}</div>
                    </section>
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
                                <span className="eventcard-interview-date">{formatEventDateRange(c)}</span>
                                <span>{c.english_name || c.name}</span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
