import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getEventTagIndex } from "../api/eventsService";
import { getProjectPostCandidates } from "../api/postsService";
import { getAdminProject, getProject } from "../api/projectsService";
import PostCard from "../components/PostCard";
import { ROUTES } from "../routes";
import type { ProjectEntryType } from "../routes";
import { projectEntryLabel } from "../utils/projectEntries";
import "../styles/Projects.css";
import { buildEventTagIndex } from "../utils/eventTagLinks";
import type { EventTagIndex } from "../utils/eventTagLinks";
import type { Post, Project, ProjectEntryLink } from "../types/models";
import { isAdminView } from "../utils/adminView";
import { FloatingActionLink } from "../ui";

interface ProjectEntrySummary {
    hashtag?: string | null;
    keyword?: string | null;
    date?: string | null;
}

/** The Q day, episode, fitting or workshop row a related-posts page is about. */
function findProjectEntry(project: Project, entryType: string, number: number): ProjectEntrySummary | null {
    if (entryType === "filming") {
        const row = (project.filming_days || []).find((item) => item.q_number === number);
        return row ? { hashtag: row.hashtag, keyword: row.keyword, date: row.filming_date } : null;
    }
    if (entryType === "episodes") {
        const row = (project.episode_metadata || []).find((item) => item.episode_number === number);
        return row ? { hashtag: row.hashtag, keyword: row.keyword, date: row.air_date } : null;
    }
    if (entryType === "fitting" || entryType === "workshop" || entryType === "prep") {
        const row = (project.fitting_workshops || []).find((item) => item.kind === entryType && item.number === number);
        return row ? { hashtag: row.hashtag, keyword: row.keyword, date: row.date } : null;
    }
    return null;
}

export default function ProjectRelatedPosts() {
    const { projectId = "", entryType = "", entryNumber = "" } = useParams();
    const location = useLocation();
    const [project, setProject] = useState<Project | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [eventTagIndex, setEventTagIndex] = useState<EventTagIndex | null>(null);
    const [loading, setLoading] = useState(true);
    const isAdmin = isAdminView();

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
                const entry = findProjectEntry(loadedProject, entryType, number);
                const entryHashtag = entry?.hashtag?.trim().replace(/^#/, "") || "";
                const loadedPosts = entry
                    ? (await getProjectPostCandidates(projectId, entryHashtag, isAdmin, { entryType, entryNumber: number })).data || []
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
    const entry = findProjectEntry(project, entryType, number);
    if (!entry) return <div className="project-related-page">Project entry not found.</div>;
    const cleanHashtag = entry.hashtag?.trim().replace(/^#/, "") || "";
    // `entry` was found above only for a known entry type, so this route param is a ProjectEntryType.
    const entryLabel = projectEntryLabel(entryType as ProjectEntryType, number);
    const defaultTimelineContext = cleanHashtag ? `#${cleanHashtag}` : entry.keyword?.trim() || "";
    const defaultEntryLink: ProjectEntryLink = {
        project_id: Number(project.id),
        entry_type: entryType as ProjectEntryType,
        entry_number: number,
    };

    return (
        <main className="project-related-page">
            <Link to={ROUTES.projectDetail(project.slug || project.id)} className="detail-back-control">
                ← Back to {project.title}
            </Link>
            <header className="project-related-page-header">
                <div className="project-related-page-eyebrow">{project.title}</div>
                <h1>{entryLabel} Related Posts</h1>
                {cleanHashtag && <div className="project-related-page-hashtag">#{cleanHashtag}</div>}
            </header>
            {posts.length > 0 ? (
                <div className="timeline-container">
                    {posts.map((post) => (
                        <PostCard key={post.id} post={post} eventTagIndex={eventTagIndex} />
                    ))}
                </div>
            ) : (
                <p className="project-related-posts-status">
                    No related posts found.{!cleanHashtag && ` ${entryLabel} has no hashtag, so posts are linked to it from the post form.`}
                </p>
            )}
            {isAdmin && (
                <FloatingActionLink
                    to={ROUTES.createPost}
                    label={`Create post linked to ${project.title} ${entryLabel}`}
                    state={{
                        returnTo: `${location.pathname}${location.search}`,
                        defaultPostedAt: entry.date || "",
                        defaultTimelineContext,
                        defaultShowTimelineContext: true,
                        defaultEntryLinks: [defaultEntryLink],
                    }}
                />
            )}
        </main>
    );
}
