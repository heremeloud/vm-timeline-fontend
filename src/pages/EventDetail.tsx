import { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { getAdminEvent, getEvent, getEventTagIndex } from "../api/eventsService";
import { getEventPostCandidates } from "../api/postsService";
import EventCard from "../components/EventCard";
import PostCard from "../components/PostCard";
import { ROUTES } from "../routes";
import { buildEventTagIndex, getEventTagLinks, linkOpensEvent } from "../utils/eventTagLinks";
import type { EventTagIndex } from "../utils/eventTagLinks";
import type { Event, Post } from "../types/models";
import { isAdminView } from "../utils/adminView";
import { getEventStartDate } from "../utils/eventDateRange";
import { FloatingActionLink } from "../ui";

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
    const [loading, setLoading] = useState(true);
    const isAdmin = isAdminView();

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
            }
        }
        load();
    }, [eventId, isAdmin]);

    if (loading) return <div style={{ padding: 20 }}>Loading…</div>;
    if (!event) return <div style={{ padding: 20 }}>Event not found.</div>;

    function goBack() {
        if ((window.history.state?.idx ?? 0) > 0) {
            navigate(-1);
        } else {
            navigate(ROUTES.events);
        }
    }

    const defaultPostedAt = getEventStartDate(event) || "";
    const defaultTimelineContext = eventContextText(event, defaultPostedAt);

    return (
        <div style={{ maxWidth: 750, margin: "0 auto", padding: "24px 20px 60px" }}>
            <button
                type="button"
                onClick={goBack}
                className="detail-back-control"
            >
                ← Back to Events
            </button>
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
