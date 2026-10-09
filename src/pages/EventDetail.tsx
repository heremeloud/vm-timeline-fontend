import { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { getAdminEvent, getEvent, getEventTagIndex } from "../api/eventsService";
import { getAdminProject, getProject } from "../api/projectsService";
import { getEventPostCandidates, getProjectRelatedPostCounts } from "../api/postsService";
import EventCard from "../components/EventCard";
import PostCard from "../components/PostCard";
import { ROUTES } from "../routes";
import { buildEventTagIndex, findEventForHashtag, getEventTagLinks, linkOpensEvent } from "../utils/eventTagLinks";
import type { EventTagIndex } from "../utils/eventTagLinks";
import type { Event, Post, Project } from "../types/models";
import { isAdminView } from "../utils/adminView";
import { getEventStartDate } from "../utils/eventDateRange";
import { ButtonLink, FloatingActionLink } from "../ui";
import { adjacentProjectEntries, projectEntryLabel } from "../utils/projectEntries";
import type { ProjectEntryType } from "../routes";
import useSwipeNavigation from "../hooks/useSwipeNavigation";
import "../styles/Projects.css";

const PROJECT_ENTRY_TYPES = new Set<ProjectEntryType>(["filming", "episodes", "fitting", "workshop", "prep"]);

function eventContextText(event: Event, defaultDate: string) {
    const dateItem = event.date_items.find((item) => item.date === defaultDate);
    const hashtag = dateItem?.hashtag?.trim() || event.tags.find((tag) => tag.trim())?.trim() || "";
    if (hashtag) return `#${hashtag.replace(/^#/, "")}`;
    return dateItem?.keyword?.trim() || event.keyword?.trim() || "";
}

export default function EventDetail() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [event, setEvent] = useState<Event | null>(null);
    const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
    const [eventTagIndex, setEventTagIndex] = useState<EventTagIndex | null>(null);
    const [navigationProject, setNavigationProject] = useState<Project | null>(null);
    const [navigationPostCounts, setNavigationPostCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [loadedEventId, setLoadedEventId] = useState("");
    const isAdmin = isAdminView();
    const query = new URLSearchParams(location.search);
    const contextProjectId = query.get("project") || "";
    const contextEntryTypeValue = query.get("entryType") || "";
    const contextEntryType = PROJECT_ENTRY_TYPES.has(contextEntryTypeValue as ProjectEntryType)
        ? contextEntryTypeValue as ProjectEntryType
        : null;
    const contextEntryNumber = Number(query.get("entryNumber"));
    const hasProjectEntryContext = Boolean(contextProjectId && contextEntryType && Number.isInteger(contextEntryNumber));

    useEffect(() => {
        async function load() {
            try {
                const eventRes = await (isAdmin ? getAdminEvent(eventId ?? "") : getEvent(eventId ?? ""));
                setEvent(eventRes.data.event);
                try {
                    const [tagsRes, postsRes] = await Promise.all([
                        getEventTagIndex(),
                        getEventPostCandidates(eventId ?? "", isAdmin),
                    ]);
                    const index = buildEventTagIndex(tagsRes.data || []);
                    setEventTagIndex(index);
                    setRelatedPosts((postsRes.data || []).filter((post) =>
                        getEventTagLinks(post, index, { includeHiddenTimelineContext: true }).some((link) =>
                            linkOpensEvent(link) && String(link.event.id) === String(eventId)
                        )
                    ));
                } catch (relatedError) {
                    console.error("Related event posts load failed:", relatedError);
                    setRelatedPosts([]);
                    setEventTagIndex(null);
                }
            } catch {
                setEvent(null);
                setRelatedPosts([]);
                setEventTagIndex(null);
            } finally {
                setLoading(false);
                setLoadedEventId(String(eventId ?? ""));
            }
        }
        load();
    }, [eventId, isAdmin]);

    useEffect(() => {
        let cancelled = false;
        if (!hasProjectEntryContext) return;
        const projectRequest = isAdmin ? getAdminProject(contextProjectId) : getProject(contextProjectId);
        const countsRequest = getProjectRelatedPostCounts(contextProjectId, isAdmin).catch((error) => {
            if (!isAdmin) throw error;
            console.warn("Admin related-post counts failed; showing public navigation instead:", error);
            return getProjectRelatedPostCounts(contextProjectId, false);
        });
        Promise.all([projectRequest, countsRequest]).then(([projectResponse, countsResponse]) => {
            if (cancelled) return;
            setNavigationProject(projectResponse.data.project);
            setNavigationPostCounts(countsResponse.data || {});
        }).catch((error) => {
            if (cancelled) return;
            console.error("Project entry navigation load failed:", error);
            setNavigationProject(null);
            setNavigationPostCounts({});
        });
        return () => {
            cancelled = true;
        };
    }, [contextProjectId, hasProjectEntryContext, isAdmin]);

    const adjacentEntries = navigationProject && contextEntryType
        ? adjacentProjectEntries(navigationProject, contextEntryType, contextEntryNumber, (target) =>
            Boolean(findEventForHashtag(eventTagIndex, target.hashtag, target.date))
            || (navigationPostCounts[`${target.type}:${target.number}`] || 0) > 0
        )
        : { previous: null, next: null };
    const entryRoute = (target: NonNullable<typeof adjacentEntries.previous>) => {
        if (!navigationProject) return "";
        const linkedEvent = findEventForHashtag(eventTagIndex, target.hashtag, target.date);
        return linkedEvent?.id != null
            ? ROUTES.projectEntryEvent(linkedEvent.id, navigationProject.slug || navigationProject.id, target.type, target.number)
            : ROUTES.projectRelatedPosts(navigationProject.slug || navigationProject.id, target.type, target.number);
    };
    const previousUrl = adjacentEntries.previous ? entryRoute(adjacentEntries.previous) : null;
    const nextUrl = adjacentEntries.next ? entryRoute(adjacentEntries.next) : null;
    const swipeHandlers = useSwipeNavigation(previousUrl, nextUrl);
    const currentEntryLabel = contextEntryType ? projectEntryLabel(contextEntryType, contextEntryNumber) : "project entry";

    if (loading || loadedEventId !== String(eventId ?? "")) return <div style={{ padding: 20 }}>Loading…</div>;
    if (!event) return <div style={{ padding: 20 }}>Event not found.</div>;

    function goBack() {
        if ((window.history.state?.idx ?? 0) > 0) {
            navigate(-1);
        } else {
            navigate(hasProjectEntryContext && navigationProject
                ? ROUTES.projectDetail(navigationProject.slug || navigationProject.id)
                : ROUTES.events);
        }
    }

    const defaultPostedAt = getEventStartDate(event) || "";
    const defaultTimelineContext = eventContextText(event, defaultPostedAt);
    return (
        <div style={{ maxWidth: 750, margin: "0 auto", padding: "24px 20px 60px" }} {...swipeHandlers}>
            <button
                type="button"
                onClick={goBack}
                className="detail-back-control"
            >
                ← Back to {hasProjectEntryContext ? navigationProject?.title || "Project" : "Events"}
            </button>
            {(adjacentEntries.previous || adjacentEntries.next) && (
                <nav className="project-related-page-navigation" aria-label={`${currentEntryLabel} navigation`}>
                    {adjacentEntries.previous && previousUrl ? (
                        <ButtonLink variant="ghost" size="small" to={previousUrl}>
                            ← {adjacentEntries.previous.label}
                        </ButtonLink>
                    ) : <span />}
                    <span className="project-related-page-swipe-hint">Swipe for previous or next</span>
                    {adjacentEntries.next && nextUrl ? (
                        <ButtonLink variant="ghost" size="small" to={nextUrl}>
                            {adjacentEntries.next.label} →
                        </ButtonLink>
                    ) : <span />}
                </nav>
            )}
            <EventCard event={event} />
            {relatedPosts.length > 0 && (
                <section className="event-related-posts" aria-labelledby="event-related-posts-title">
                    <h2 id="event-related-posts-title">Related Posts</h2>
                    <div className="timeline-container">
                        {relatedPosts.map((post) => (
                            <PostCard key={post.id} post={post} eventTagIndex={eventTagIndex} />
                        ))}
                    </div>
                </section>
            )}
            {isAdmin && (
                <FloatingActionLink
                    to={ROUTES.createPost}
                    label={`Create post linked to ${event.name}`}
                    state={{
                        returnTo: `${location.pathname}${location.search}`,
                        defaultPostedAt,
                        defaultTimelineContext,
                        defaultShowTimelineContext: Boolean(defaultTimelineContext),
                    }}
                />
            )}
        </div>
    );
}
