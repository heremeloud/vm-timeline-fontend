import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getAdminProject, getProject, deleteProject } from "../api/projectsService";
import { ROUTES } from "../routes";
import Avatar from "../components/Avatar";
import "../styles/Projects.css";
import { formatEventDateRange } from "../utils/eventDateRange";

function getYouTubeEmbedUrl(url) {
    const s = (url || "").trim();
    if (!s) return "";
    try {
        const parsed = new URL(s.startsWith("http") ? s : `https://${s}`);
        if (parsed.hostname.includes("youtu.be")) {
            const id = parsed.pathname.replace("/", "").trim();
            return id ? `https://www.youtube.com/embed/${id}` : "";
        }
        if (parsed.hostname.includes("youtube.com")) {
            const v = parsed.searchParams.get("v");
            if (v) return `https://www.youtube.com/embed/${v}`;
            const parts = parsed.pathname.split("/").filter(Boolean);
            const idx = parts.findIndex((p) => ["live", "embed", "shorts"].includes(p));
            if (idx !== -1 && parts[idx + 1]) return `https://www.youtube.com/embed/${parts[idx + 1]}`;
        }
    } catch {}
    return "";
}

function orderViewMimFirst(authors = []) {
    if (!Array.isArray(authors)) return [];
    const isView = (a) => (a?.name || "").toLowerCase().trim() === "view";
    const isMim = (a) => (a?.name || "").toLowerCase().trim() === "mim";
    const view = authors.find(isView);
    const mim = authors.find(isMim);
    const rest = authors.filter((a) => !isView(a) && !isMim(a));
    return [...(view ? [view] : []), ...(mim ? [mim] : []), ...rest];
}

function displayHashtag(value) {
    const clean = (value || "").trim().replace(/^#/, "");
    return clean ? `#${clean}` : "";
}

export default function ProjectDetail() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copiedKey, setCopiedKey] = useState("");
    const [showFilmingDays, setShowFilmingDays] = useState(false);
    const [showEpisodes, setShowEpisodes] = useState(false);
    const isAdmin = !!localStorage.getItem("jwt");

    async function copyText(value, key) {
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
                const res = await (isAdmin ? getAdminProject(projectId) : getProject(projectId));
                setProject(res.data.project);
            } catch (err) {
                console.error("Load project failed:", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [projectId, isAdmin]);

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
    const episodeHasTitles = (project.episode_metadata || []).some((row) => row.title);
    const episodeHasKeywords = (project.episode_metadata || []).some((row) => row.keyword);

    function goBack() {
        if (window.history.state?.idx > 0) {
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
                                        size={44}
                                    />
                                    <span>{a.name}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {project.description && (
                        <p className="project-detail-desc">{project.description}</p>
                    )}

                    {(project.gmmtv_url || project.official_twitter_url || project.mydramalist_url || project.spotify_url || project.apple_music_url) && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
                            {project.gmmtv_url && (
                                <a
                                    href={project.gmmtv_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="project-detail-ext-link"
                                >
                                    <img
                                        src="/icons/gmmtv_logo.svg"
                                        alt="GMMTV"
                                        style={{ width: 13, height: 13, verticalAlign: "middle", marginRight: 5 }}
                                    />
                                    GMMTV ↗
                                </a>
                            )}
                            {project.category === "series" && project.official_twitter_url && (
                                <a
                                    href={project.official_twitter_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="project-detail-ext-link"
                                >
                                    <img
                                        src="https://cdn.simpleicons.org/x/000000"
                                        alt="X"
                                        style={{ width: 13, height: 13, verticalAlign: "middle", marginRight: 5 }}
                                    />
                                    Official X ↗
                                </a>
                            )}
                            {project.mydramalist_url && (
                                <a
                                    href={project.mydramalist_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="project-detail-ext-link"
                                >
                                    <img
                                        src="https://mydramalist.com/favicon.ico"
                                        alt="MDL"
                                        style={{ width: 13, height: 13, verticalAlign: "middle", marginRight: 5 }}
                                    />
                                    MyDramaList ↗
                                </a>
                            )}
                            {project.spotify_url && (
                                <a
                                    href={project.spotify_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="project-detail-ext-link"
                                >
                                    <img
                                        src="https://open.spotifycdn.com/cdn/images/favicon32.b64ecc03.png"
                                        alt="Spotify"
                                        style={{ width: 13, height: 13, verticalAlign: "middle", marginRight: 5 }}
                                    />
                                    Spotify ↗
                                </a>
                            )}
                            {project.apple_music_url && (
                                <a
                                    href={project.apple_music_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="project-detail-ext-link"
                                >
                                    <img
                                        src="https://music.apple.com/favicon.ico"
                                        alt="Apple Music"
                                        style={{ width: 13, height: 13, verticalAlign: "middle", marginRight: 5 }}
                                    />
                                    Apple Music ↗
                                </a>
                            )}
                        </div>
                    )}

                    {isAdmin && (
                        <div className="project-detail-actions">
                            <Link to={ROUTES.editProject(project.id)}>
                                <button className="btn-edit">Edit</button>
                            </Link>
                            <button
                                className="btn-delete"
                                onClick={async () => {
                                    if (confirm("Delete this project?")) {
                                        await deleteProject(project.id);
                                        window.location.href = ROUTES.projects;
                                    }
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {project.filming_days?.length > 0 && (
                <div className="project-detail-series-metadata">
                    <button type="button" className="project-series-section-toggle" onClick={() => setShowFilmingDays((visible) => !visible)}>
                        <span>Filming Q Days</span>
                        <svg className={showFilmingDays ? "is-open" : ""} viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                    </button>
                    {showFilmingDays && <div className="project-series-metadata-list">
                        <div className="project-series-column-header project-series-q-row" aria-hidden="true">
                            <span>Q</span><span>Date</span><span>Hashtag</span><span>Keyword</span>
                        </div>
                        {project.filming_days.map((row) => (
                            <div className="project-series-metadata-row project-series-q-row" key={row.id || `q-${row.q_number}`}>
                                <strong>Q{row.q_number}</strong>
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

            {project.episode_metadata?.length > 0 && (
                <div className="project-detail-series-metadata">
                    <button type="button" className="project-series-section-toggle" onClick={() => setShowEpisodes((visible) => !visible)}>
                        <span>Episodes</span>
                        <svg className={showEpisodes ? "is-open" : ""} viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                    </button>
                    {showEpisodes && <div className="project-series-metadata-list">
                        <div className={`project-series-column-header project-series-episode-row${episodeHasTitles ? "" : " project-no-episode-title"}${episodeHasKeywords ? "" : " project-no-episode-keyword"}`} aria-hidden="true">
                            <span>EP</span><span>Air date</span>{episodeHasTitles && <span>Title</span>}<span>Hashtag</span>{episodeHasKeywords && <span>Keyword</span>}
                        </div>
                        {project.episode_metadata.map((row) => (
                            <div className={`project-series-metadata-row project-series-episode-row${episodeHasTitles ? "" : " project-no-episode-title"}${episodeHasKeywords ? "" : " project-no-episode-keyword"}`} key={row.id || `episode-${row.episode_number}`}>
                                <strong>EP{row.episode_number}</strong>
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
            {project.child_projects?.length > 0 && (
                <div className="project-detail-events">
                    <div className="project-detail-playlist-label">Related Projects</div>
                    {project.child_projects.map((child) => (
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
            {project.events?.length > 0 && (
                <div className="project-detail-events">
                    <div className="project-detail-playlist-label">Events & Content</div>
                    {(() => {
                        const allEvents = project.events;

                        // Build parent_event_id → children map from the flat list
                        const childrenByParentId = {};
                        allEvents.forEach((ev) => {
                            if (ev.parent_event_id) {
                                if (!childrenByParentId[ev.parent_event_id]) childrenByParentId[ev.parent_event_id] = [];
                                childrenByParentId[ev.parent_event_id].push(ev);
                            }
                        });

                        // Collect all ids that are children of something
                        const childIdSet = new Set();
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
                                        <span className="project-detail-event-date">
                                            {formatEventDateRange(ev, "to")}
                                        </span>
                                        <span className="project-detail-event-name">{ev.english_name || ev.name}</span>
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
                                                    <span className="project-detail-event-date">
                                                        {formatEventDateRange(child, "to")}
                                                    </span>
                                                    <span className="project-detail-event-name">{child.english_name || child.name}</span>
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
                    <div className="project-detail-playlist" style={{ marginTop: 28 }}>
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
                        const pid = typeof entry === "string" ? entry : entry.id;
                        const name = typeof entry === "string" ? null : entry.name;
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
