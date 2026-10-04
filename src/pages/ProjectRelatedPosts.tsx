import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getEventTagIndex } from "../api/eventsService";
import { getProjectPostCandidates } from "../api/postsService";
import { getAdminProject, getProject } from "../api/projectsService";
import PostCard from "../components/PostCard";
import { ROUTES } from "../routes";
import "../styles/Projects.css";
import { buildEventTagIndex } from "../utils/eventTagLinks";
import type { EventTagIndex } from "../utils/eventTagLinks";
import type { Post, Project } from "../types/models";

export default function ProjectRelatedPosts() {
    const { projectId = "", entryType = "", entryNumber = "" } = useParams();
    const [project, setProject] = useState<Project | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [eventTagIndex, setEventTagIndex] = useState<EventTagIndex | null>(null);
    const [loading, setLoading] = useState(true);
    const isAdmin = !!localStorage.getItem("jwt");

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const [projectRes, tagsRes] = await Promise.all([
                    isAdmin ? getAdminProject(projectId) : getProject(projectId),
                    getEventTagIndex(),
                ]);
                const loadedProject = projectRes.data.project;
                const number = Number(entryNumber);
                const entry = entryType === "filming"
                    ? (loadedProject.filming_days || []).find((row) => row.q_number === number)
                    : entryType === "episodes"
                        ? (loadedProject.episode_metadata || []).find((row) => row.episode_number === number)
                        : null;
                const entryHashtag = entry?.hashtag?.trim().replace(/^#/, "") || "";
                const loadedPosts = entryHashtag
                    ? (await getProjectPostCandidates(projectId, entryHashtag)).data || []
                    : [];
                if (cancelled) return;
                setProject(loadedProject);
                setPosts(loadedPosts);
                setEventTagIndex(buildEventTagIndex(tagsRes.data || []));
            } catch (error) {
                if (cancelled) return;
                console.error("Related project posts load failed:", error);
                setProject(null);
                setPosts([]);
                setEventTagIndex(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        void load();
        return () => {
            cancelled = true;
        };
    }, [entryNumber, entryType, isAdmin, projectId]);

    if (loading) return <div className="project-related-page">Loading related posts…</div>;
    if (!project) return <div className="project-related-page">Related posts not found.</div>;

    const number = Number(entryNumber);
    const filmingDay = entryType === "filming"
        ? (project.filming_days || []).find((row) => row.q_number === number)
        : null;
    const episode = entryType === "episodes"
        ? (project.episode_metadata || []).find((row) => row.episode_number === number)
        : null;
    const entry = filmingDay || episode;
    if (!entry) return <div className="project-related-page">Project entry not found.</div>;
    const cleanHashtag = entry.hashtag?.trim().replace(/^#/, "") || "";
    const entryLabel = filmingDay ? `Q${filmingDay.q_number}` : `EP${episode?.episode_number}`;

    return (
        <main className="project-related-page">
            <Link to={ROUTES.projectDetail(project.slug || project.id)} className="detail-back-control">
                ← Back to {project.title}
            </Link>
            <header className="project-related-page-header">
                <div className="project-related-page-eyebrow">{project.title}</div>
                <h1>{entryLabel} related posts</h1>
                {cleanHashtag && <div className="project-related-page-hashtag">#{cleanHashtag}</div>}
            </header>
            {!cleanHashtag ? (
                <p className="project-related-posts-status">No hashtag is configured for {entryLabel} yet.</p>
            ) : posts.length > 0 ? (
                <div className="timeline-container">
                    {posts.map((post) => (
                        <PostCard key={post.id} post={post} eventTagIndex={eventTagIndex} />
                    ))}
                </div>
            ) : (
                <p className="project-related-posts-status">No related posts found.</p>
            )}
        </main>
    );
}
