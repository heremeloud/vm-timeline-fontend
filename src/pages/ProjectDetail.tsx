import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getAdminProject, getProject, deleteProject } from "../api/projectsService";
import { getProjectRelatedPostCounts } from "../api/postsService";
import { ROUTES } from "../routes";
import Avatar from "../components/Avatar";
import RelationshipChartSection from "../components/RelationshipChartSection";
import "../styles/Projects.css";
import { formatEventDateRange } from "../utils/eventDateRange";
import useEventTagIndex from "../hooks/useEventTagIndex";
import { findEventForHashtag } from "../utils/eventTagLinks";
import { orderViewMimFirst } from "../utils/authors";
import { getYouTubeEmbedUrl } from "../utils/media";
import { Button, ButtonLink } from "../ui";
import type { Event, Project } from "../types/models";

interface ExternalLinkItem {
    href: string;
    icon: string;
    alt: string;
    label: string;
}

function displayHashtag(value?: string | null) {
    const clean = (value || "").trim().replace(/^#/, "");
    return clean ? `#${clean}` : "";
}

function normalizeHashtag(value?: string | null) {
    return (value || "").trim().replace(/^#/, "").toLocaleLowerCase();
}

export default function ProjectDetail() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState<Project | null>(null);
    const [relatedPostCounts, setRelatedPostCounts] = useState<Record<string, number>>({});
    const eventTagIndex = useEventTagIndex();
    const [loading, setLoading] = useState(true);
    const [copiedKey, setCopiedKey] = useState("");
    const [showFilmingDays, setShowFilmingDays] = useState(false);
    const [showEpisodes, setShowEpisodes] = useState(false);
    const isAdmin = !!localStorage.getItem("jwt");

    async function copyText(value: string | null | undefined, key: string) {
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            setCopiedKey(key);
            window.setTimeout(() => setCopiedKey(""), 1200);
        } catch (err) {
            console.error("Copy failed:", err);
            alert("Could not copy the text.");
        }
    }

    useEffect(() => {
        async function load() {
            try {
                const res = await (isAdmin ? getAdminProject(projectId ?? "") : getProject(projectId ?? ""));
                setProject(res.data.project);
            } catch (err) {
                console.error("Load project failed:", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [projectId, isAdmin]);

    useEffect(() => {
        let cancelled = false;
        getProjectRelatedPostCounts(projectId ?? "").then((res) => {
            if (cancelled) return;
            setRelatedPostCounts(Object.fromEntries(
                Object.entries(res.data || {}).map(([tag, count]) => [normalizeHashtag(tag), count]),
            ));
        }).catch((error) => {
            if (cancelled) return;
            console.error("Related project post counts load failed:", error);
            setRelatedPostCounts({});
        });
        return () => {
            cancelled = true;
        };
    }, [projectId]);

    // Load Twitter widgets script when a tweet_url is present
    useEffect(() => {
        if (!project?.tweet_url) return;
        if (window.twttr) {
            window.twttr.widgets?.load();
        } else {
            const script = document.createElement("script");
            script.src = "https://platform.twitter.com/widgets.js";
            script.async = true;
            script.onload = () => window.twttr?.widgets?.load();
            document.body.appendChild(script);
        }
    }, [project]);

    if (loading) return <div style={{ padding: 20 }}>Loading…</div>;
    if (!project) return <div style={{ padding: 20 }}>Project not found.</div>;

    const playlists = project.playlists || [];
    const filmingDays = project.filming_days ?? [];
    const episodeRows = project.episode_metadata ?? [];
    const childProjects = project.child_projects ?? [];
    const linkedEvents = project.events ?? [];
    const episodeHasTitles = episodeRows.some((row) => row.title);
    const episodeHasKeywords = episodeRows.some((row) => row.keyword);
    const hasRelatedPosts = (hashtag?: string | null) =>
        Boolean(hashtag && (relatedPostCounts[normalizeHashtag(hashtag)] || 0) > 0);
    // A Q/EP hashtag that belongs to an event opens that event; otherwise it opens the related posts.
    const entryIndex = (label: string, hashtag: string | null | undefined, referenceDate: string | null | undefined, relatedPostsUrl: string) => {
        const event = findEventForHashtag(eventTagIndex, hashtag, referenceDate);
        const to = event?.id != null ? ROUTES.eventDetail(event.id) : hasRelatedPosts(hashtag) ? relatedPostsUrl : null;
        if (!to) return label;
        return (
            <Link
                className="project-series-related-index"
                to={to}
                title={event ? `Open the event for ${displayHashtag(hashtag)}` : `View posts related to ${displayHashtag(hashtag)}`}
            >
                {label}
            </Link>
        );
    };
    const externalLinks: ExternalLinkItem[] = [
        project.gmmtv_url && { href: project.gmmtv_url, icon: "/icons/gmmtv_logo.svg", alt: "GMMTV", label: "GMMTV" },
        project.category === "series" && project.official_twitter_url && { href: project.official_twitter_url, icon: "https://cdn.simpleicons.org/x/000000", alt: "X", label: "Official X" },
        project.mydramalist_url && { href: project.mydramalist_url, icon: "https://mydramalist.com/favicon.ico", alt: "MDL", label: "MyDramaList" },
        project.spotify_url && { href: project.spotify_url, icon: "https://open.spotifycdn.com/cdn/images/favicon32.b64ecc03.png", alt: "Spotify", label: "Spotify" },
        project.apple_music_url && { href: project.apple_music_url, icon: "https://music.apple.com/favicon.ico", alt: "Apple Music", label: "Apple Music" },
    ].filter((item): item is ExternalLinkItem => Boolean(item));

    function goBack() {
        if ((window.history.state?.idx ?? 0) > 0) {
            navigate(-1);
        } else {
            navigate(ROUTES.projects);
        }
    }

    return (
        <div className="project-detail-container">
            {/* Back link */}
            <button type="button" onClick={goBack} className="detail-back-control">← Back to Projects</button>

            {/* Header */}
            <div className="project-detail-header">
                {project.thumbnail_url && (
                    <img
                        src={project.thumbnail_url}
                        alt={project.title}
                        className="project-detail-thumb"
                    />
                )}

                <div className="project-detail-info">
                    {project.parent_project && (
                        <Link to={ROUTES.projectDetail(project.parent_project.slug || project.parent_project.id)} className="project-detail-parent-link">
                            {project.parent_project.category && (
                                <span className="project-detail-parent-category">{project.parent_project.category.toUpperCase()}</span>
                            )}
                            ↩ {project.parent_project.title}
                        </Link>
                    )}

                    {project.category && (
                        <span className="project-card-category">
                            {project.category.toUpperCase()}
                        </span>
                    )}

                    <h1 className="project-detail-title">{project.title}</h1>

                    {project.original_title && (
                        <div className="project-detail-original-title">{project.original_title}</div>
                    )}

                    {project.hashtag && (
                        <div className="project-detail-hashtag-row">
                            <button
                                type="button"
                                className="project-detail-hashtag"
                                onClick={() => copyText(displayHashtag(project.hashtag), "project-hashtag")}
                                title="Copy hashtag"
                            >
                                {displayHashtag(project.hashtag)}
                            </button>
                            {copiedKey === "project-hashtag" && <span className="project-hashtag-copied">Copied!</span>}
                        </div>
                    )}

                    {(project.start_date || project.year) && (
                        <div className="project-card-year">
                            {project.start_date
                                ? project.start_date + (project.end_date ? ` to ${project.end_date}` : "")
                                : project.year}
                        </div>
                    )}

                    {project.category === "series" && project.episode_count && (
                        <div className="project-detail-episode-count">
                            {project.episode_count} {project.episode_count === 1 ? "episode" : "episodes"}
                        </div>
                    )}

                    {project.authors?.length > 0 && (
                        <div className="project-detail-authors">
                            {orderViewMimFirst(project.authors).map((a) => (
                                <div key={a.id} className="project-detail-author">
                                    <Avatar
                                        url={a.profile_photo_url}
                                        authorId={a.id}
                                        name={a.name}
                                    />
                                    <span>{a.name}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {project.description && (
                        <p className="project-detail-desc">{project.description}</p>
                    )}

                    {externalLinks.length > 0 && (
                        <div className="project-detail-ext-links">
                            {externalLinks.map(({ href, icon, alt, label }) => (
                                <a
                                    key={label}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="project-detail-ext-link"
                                >
                                    <img src={icon} alt={alt} className="project-detail-ext-link-icon" />
                                    {label} ↗
                                </a>
                            ))}
                        </div>
                    )}

                    {isAdmin && (
                        <div className="project-detail-actions">
                            <ButtonLink to={ROUTES.editProject(project.id)} variant="primary" size="small">Edit</ButtonLink>
                            <Button
                                variant="danger"
                                size="small"
                                onClick={async () => {
                                    if (confirm("Delete this project?")) {
                                        await deleteProject(project.id);
                                        window.location.href = ROUTES.projects;
                                    }
                                }}
                            >
                                Delete
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {(project.relationship_chart || (isAdmin && project.category === "series")) &&
                <RelationshipChartSection key={project.id} project={project} isAdmin={isAdmin} onSaved={(patch) => setProject((current) => current && { ...current, ...patch })} />}


            {filmingDays.length > 0 && (
                <div className="project-detail-series-metadata">
                    <button type="button" className="project-series-section-toggle" onClick={() => setShowFilmingDays((visible) => !visible)}>
                        <span>Filming Q Days</span>
                        <svg className={showFilmingDays ? "is-open" : ""} viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                    </button>
                    {showFilmingDays && <div className="project-series-metadata-list">
                        <div className="project-series-column-header project-series-q-row" aria-hidden="true">
                            <span>Q</span><span>Date</span><span>Hashtag</span><span>Keyword</span>
                        </div>
                        {filmingDays.map((row) => (
                            <div className="project-series-metadata-row project-series-q-row" key={row.id || `q-${row.q_number}`}>
                                <strong>
                                    {entryIndex(`Q${row.q_number}`, row.hashtag, row.filming_date, ROUTES.projectRelatedPosts(project.slug || project.id, "filming", row.q_number))}
                                </strong>
                                <span className="project-series-date">{row.filming_date || ""}</span>
                                {row.hashtag && (
                                    <span className="project-series-copy-item project-series-hashtag">
                                        <button type="button" title="Copy hashtag" onClick={() => copyText(displayHashtag(row.hashtag), `q-${row.q_number}-hashtag`)}><span>{displayHashtag(row.hashtag)}</span></button>
                                        {copiedKey === `q-${row.q_number}-hashtag` && <span className="project-hashtag-copied">Copied!</span>}
                                    </span>
                                )}
                                {row.keyword && (
                                    <span className="project-series-copy-item project-series-keyword">
                                        <button type="button" title="Copy keyword" onClick={() => copyText(row.keyword, `q-${row.q_number}-keyword`)}><span>{row.keyword}</span></button>
                                        {copiedKey === `q-${row.q_number}-keyword` && <span className="project-hashtag-copied">Copied!</span>}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>}
                </div>
            )}

            {episodeRows.length > 0 && (
                <div className="project-detail-series-metadata">
                    <button type="button" className="project-series-section-toggle" onClick={() => setShowEpisodes((visible) => !visible)}>
                        <span>Episodes</span>
                        <svg className={showEpisodes ? "is-open" : ""} viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                    </button>
                    {showEpisodes && <div className="project-series-metadata-list">
                        <div className={`project-series-column-header project-series-episode-row${episodeHasTitles ? "" : " project-no-episode-title"}${episodeHasKeywords ? "" : " project-no-episode-keyword"}`} aria-hidden="true">
                            <span>EP</span><span>Air date</span>{episodeHasTitles && <span>Title</span>}<span>Hashtag</span>{episodeHasKeywords && <span>Keyword</span>}
                        </div>
                        {episodeRows.map((row) => (
                            <div className={`project-series-metadata-row project-series-episode-row${episodeHasTitles ? "" : " project-no-episode-title"}${episodeHasKeywords ? "" : " project-no-episode-keyword"}`} key={row.id || `episode-${row.episode_number}`}>
                                <strong>
                                    {entryIndex(`EP${row.episode_number}`, row.hashtag, row.air_date, ROUTES.projectRelatedPosts(project.slug || project.id, "episodes", row.episode_number))}
                                </strong>
                                {episodeHasTitles && <span className="project-series-title">{row.title || ""}</span>}
                                <span className="project-series-date">{row.air_date || ""}</span>
                                {row.hashtag && (
                                    <span className="project-series-copy-item project-series-hashtag">
                                        <button type="button" title="Copy hashtag" onClick={() => copyText(displayHashtag(row.hashtag), `episode-${row.episode_number}-hashtag`)}><span>{displayHashtag(row.hashtag)}</span></button>
                                        {copiedKey === `episode-${row.episode_number}-hashtag` && <span className="project-hashtag-copied">Copied!</span>}
                                    </span>
                                )}
                                {row.keyword && (
                                    <span className="project-series-copy-item project-series-keyword">
                                        <button type="button" title="Copy keyword" onClick={() => copyText(row.keyword, `episode-${row.episode_number}-keyword`)}><span>{row.keyword}</span></button>
                                        {copiedKey === `episode-${row.episode_number}-keyword` && <span className="project-hashtag-copied">Copied!</span>}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>}
                </div>
            )}

            {/* Embedded Tweet */}
            {project.tweet_url && (
                <div className="project-detail-tweet-section">
                    <div className="project-detail-playlist-label">{project.tweet_label || "Tweet"}</div>
                    <div className="project-detail-tweet">
                        <blockquote className="twitter-tweet" data-theme="light">
                            <a href={project.tweet_url}></a>
                        </blockquote>
                    </div>
                </div>
            )}

            {/* Child Projects */}
            {childProjects.length > 0 && (
                <div className="project-detail-events">
                    <div className="project-detail-playlist-label">Related Projects</div>
                    {childProjects.map((child) => (
                        <Link key={child.id} to={ROUTES.projectDetail(child.slug || child.id)} className="project-detail-child-project">
                            {child.thumbnail_url && (
                                <img
                                    src={child.thumbnail_url}
                                    alt={child.title}
                                    className="project-detail-child-thumb"
                                    style={{
                                        objectPosition: `${child.thumbnail_focal_x ?? 50}% ${child.thumbnail_focal_y ?? 50}%`,
                                    }}
                                />
                            )}
                            <span className="project-detail-event-name">{child.title}</span>
                            {child.category && (
                                <span className="project-detail-event-category">{child.category.toUpperCase()}</span>
                            )}
                        </Link>
                    ))}
                </div>
            )}

            {/* Linked Events */}
            {linkedEvents.length > 0 && (
                <div className="project-detail-events">
                    <div className="project-detail-playlist-label">Events & Content</div>
                    {(() => {
                        const allEvents = linkedEvents;

                        // Build parent_event_id → children map from the flat list
                        const childrenByParentId: Record<number, Event[]> = {};
                        allEvents.forEach((ev) => {
                            if (ev.parent_event_id) {
                                if (!childrenByParentId[ev.parent_event_id]) childrenByParentId[ev.parent_event_id] = [];
                                childrenByParentId[ev.parent_event_id].push(ev);
                            }
                        });

                        // Collect all ids that are children of something
                        const childIdSet = new Set<number>();
                        allEvents.forEach((ev) => {
                            (ev.child_events || []).forEach((c) => childIdSet.add(c.id));
                            if (ev.parent_event_id) childIdSet.add(ev.id);
                        });

                        const topLevel = allEvents.filter((ev) => !childIdSet.has(ev.id));

                        return topLevel.map((ev) => {
                            // Merge child_events already embedded + any derived from parent_event_id
                            const direct = ev.child_events || [];
                            const directIds = new Set(direct.map((c) => c.id));
                            const derived = (childrenByParentId[ev.id] || []).filter((c) => !directIds.has(c.id));
                            const children = [...direct, ...derived];

                            return (
                                <div key={ev.id}>
                                    <Link to={ROUTES.eventDetail(ev.id)} className="project-detail-event-item">
                                        <span className="project-detail-event-copy">
                                            <span className="project-detail-event-name">{ev.english_name || ev.name}</span>
                                            <span className="project-detail-event-date">
                                                {formatEventDateRange(ev, "Date to be announced")}
                                            </span>
                                        </span>
                                        {ev.category && (
                                            <span className="project-detail-event-category">
                                                {ev.category}
                                            </span>
                                        )}
                                    </Link>
                                    {children.length > 0 && (
                                        <div className="project-detail-event-children">
                                            {children.map((child) => (
                                                <Link key={child.id} to={ROUTES.eventDetail(child.id)} className="project-detail-event-item project-detail-event-child">
                                                    <span className="project-detail-event-copy">
                                                        <span className="project-detail-event-name">{child.english_name || child.name}</span>
                                                        <span className="project-detail-event-date">
                                                            {formatEventDateRange(child, "Date to be announced")}
                                                        </span>
                                                    </span>
                                                    {child.category && (
                                                        <span className="project-detail-event-category">
                                                            {child.category}
                                                        </span>
                                                    )}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        });
                    })()}
                </div>
            )}

            {/* Single YouTube Video */}
            {project.youtube_url && (() => {
                const embedUrl = getYouTubeEmbedUrl(project.youtube_url);
                if (!embedUrl) return null;
                return (
                    <div className="project-detail-playlist project-detail-playlist--video">
                        <div className="project-detail-playlist-label">{project.youtube_label || "Video"}</div>
                        <div className="project-detail-embed">
                            <iframe
                                src={embedUrl}
                                title={project.youtube_label || "YouTube video"}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                        <a
                            href={project.youtube_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="project-detail-playlist-link"
                        >
                            Watch on YouTube ↗
                        </a>
                    </div>
                );
            })()}

            {/* YouTube Playlists */}
            {playlists.length > 0 && (
                <div className="project-detail-playlists">
                    {playlists.map((entry, idx) => {
                        const pid = entry.id;
                        const name = entry.name;
                        const label = name || (playlists.length > 1 ? `Playlist ${idx + 1}` : "Playlist");
                        return (
                            <div key={pid} className="project-detail-playlist">
                                <div className="project-detail-playlist-label">{label}</div>
                                <div className="project-detail-embed">
                                    <iframe
                                        src={`https://www.youtube.com/embed/videoseries?list=${pid}`}
                                        title={label}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                </div>
                                <a
                                    href={`https://www.youtube.com/playlist?list=${pid}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="project-detail-playlist-link"
                                >
                                    Open full playlist on YouTube ↗
                                </a>
                            </div>
                        );
                    })}
                </div>
            )}

        </div>
    );
}
