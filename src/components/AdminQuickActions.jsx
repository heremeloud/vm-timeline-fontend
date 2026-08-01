import { useEffect, useState } from "react";
import { Link, useMatch } from "react-router-dom";
import { ROUTES } from "../routes";
import { getAdminProject } from "../api/projectsService";
import { getAdminTopic } from "../api/topicsService";

export default function AdminQuickActions() {
    const projectMatch = useMatch("/projects/:projectId");
    const specialMatch = useMatch("/specials/:topicId");
    const postMatch = useMatch("/post/:postId");
    const eventMatch = useMatch("/events/:eventId");
    const editProjectMatch = useMatch("/edit-project/:projectId");
    const editSpecialMatch = useMatch("/edit-special/:topicId");
    const editEventMatch = useMatch("/edit-event/:eventId");
    const editPostMatch = useMatch("/edit-post/:postId");
    const manageAuthorsMatch = useMatch("/manage-authors");
    const projectRef = projectMatch?.params.projectId || null;
    const specialRef = specialMatch?.params.topicId || null;
    const [editRoute, setEditRoute] = useState(null);
    const directEditRoute = postMatch
        ? ROUTES.editPost(postMatch.params.postId)
        : eventMatch
            ? ROUTES.editEvent(eventMatch.params.eventId)
            : null;
    const activeEditRoute = directEditRoute || editRoute;
    const editTitle = postMatch
        ? "Edit Post"
        : eventMatch
            ? "Edit Event"
            : projectMatch
                ? "Edit Project"
                : "Edit Special";
    const saveFormId = editProjectMatch
        ? "edit-project-form"
        : editSpecialMatch
            ? "edit-special-form"
            : editEventMatch
                ? "edit-event-form"
                : editPostMatch
                    ? "edit-post-form"
                    : manageAuthorsMatch
                        ? "manage-authors-save-form"
                    : null;
    const saveTitle = editProjectMatch
        ? "Save Project"
        : editSpecialMatch
            ? "Save Special"
            : editEventMatch
                ? "Save Event"
                : editPostMatch
                    ? "Save Post"
                    : "Save All Authors";

    useEffect(() => {
        let cancelled = false;

        async function resolveEditRoute() {
            let nextRoute = null;
            if (projectRef) {
                const res = await getAdminProject(projectRef);
                nextRoute = ROUTES.editProject(res.data.project.id);
            } else if (specialRef) {
                const res = await getAdminTopic(specialRef);
                nextRoute = ROUTES.editTopic(res.data.topic.id);
            }
            if (!cancelled) setEditRoute(nextRoute);
        }

        resolveEditRoute().catch((err) => {
            console.error("Could not resolve edit shortcut:", err);
            if (!cancelled) setEditRoute(null);
        });

        return () => {
            cancelled = true;
        };
    }, [projectRef, specialRef]);

    if (!localStorage.getItem("jwt")) return null;

    return (
        <nav className="admin-quick-actions" aria-label="Admin shortcuts">
            <Link className="admin-quick-button" to={ROUTES.manageDisplay} aria-label="Manage Display" title="Manage Display">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="13" rx="2" />
                    <path d="M8 21h8M12 17v4" />
                </svg>
            </Link>
            <Link className="admin-quick-button" to={ROUTES.manageAuthors} aria-label="Manage Authors" title="Manage Authors">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
                </svg>
            </Link>
            {activeEditRoute && (
                <Link className="admin-quick-button" to={activeEditRoute} aria-label="Edit" title={editTitle}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z" />
                        <path d="m13.5 6.5 4 4" />
                    </svg>
                </Link>
            )}
            {saveFormId && (
                <button
                    type="submit"
                    form={saveFormId}
                    className="admin-quick-button"
                    aria-label="Save"
                    title={saveTitle}
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M5 3h12l2 2v16H5V3Z" />
                        <path d="M8 3v6h8V3M8 21v-7h8v7" />
                    </svg>
                </button>
            )}
        </nav>
    );
}
