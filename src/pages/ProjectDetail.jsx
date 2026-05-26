import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getProject, deleteProject } from "../api/projectsService";
import { ROUTES } from "../routes";
import Avatar from "../components/Avatar";
import "../styles/Projects.css";

function orderViewMimFirst(authors = []) {
    if (!Array.isArray(authors)) return [];
    const isView = (a) => (a?.name || "").toLowerCase().trim() === "view";
    const isMim = (a) => (a?.name || "").toLowerCase().trim() === "mim";
    const view = authors.find(isView);
    const mim = authors.find(isMim);
    const rest = authors.filter((a) => !isView(a) && !isMim(a));
    return [...(view ? [view] : []), ...(mim ? [mim] : []), ...rest];
}

export default function ProjectDetail() {
    const { projectId } = useParams();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const isAdmin = !!localStorage.getItem("jwt");

    useEffect(() => {
        async function load() {
            try {
                const res = await getProject(projectId);
                setProject(res.data.project);
            } catch (err) {
                console.error("Load project failed:", err);
            } finally {
                setLoading(false);
            }
        }
        load();
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

    return (
        <div className="project-detail-container">
            {/* Back link */}
            <Link to={ROUTES.projects} className="project-detail-back">← Back to Projects</Link>

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
                    {project.category && (
                        <span className="project-card-category">
                            {project.category.toUpperCase()}
                        </span>
                    )}

                    <h1 className="project-detail-title">{project.title}</h1>

                    {project.original_title && (
                        <div className="project-detail-original-title">{project.original_title}</div>
                    )}

                    {(project.start_date || project.year) && (
                        <div className="project-card-year">
                            {project.start_date
                                ? project.start_date + (project.end_date ? ` – ${project.end_date}` : "")
                                : project.year}
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
                                        size={28}
                                    />
                                    <span>{a.name}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {project.description && (
                        <p className="project-detail-desc">{project.description}</p>
                    )}

                    {isAdmin && (
                        <div className="project-detail-actions">
                            <Link to={ROUTES.editProject(project.id)}>
                                <button>Edit</button>
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

            {/* Embedded Tweet */}
            {project.tweet_url && (
                <div className="project-detail-tweet-section">
                    <div className="project-detail-playlist-label">Tweet</div>
                    <div className="project-detail-tweet">
                        <blockquote className="twitter-tweet" data-theme="light">
                            <a href={project.tweet_url}></a>
                        </blockquote>
                    </div>
                </div>
            )}

            {/* YouTube Playlists */}
            {playlists.length > 0 ? (
                <div className="project-detail-playlists">
                    {playlists.map((pid, idx) => (
                        <div key={pid} className="project-detail-playlist">
                            <div className="project-detail-playlist-label">
                                {playlists.length > 1 ? `Playlist ${idx + 1}` : "Playlist"}
                            </div>
                            <div className="project-detail-embed">
                                <iframe
                                    src={`https://www.youtube.com/embed/videoseries?list=${pid}`}
                                    title={`${project.title} playlist ${idx + 1}`}
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
                    ))}
                </div>
            ) : (
                <div style={{ marginTop: 24, opacity: 0.5 }}>No playlist linked yet.</div>
            )}
        </div>
    );
}
