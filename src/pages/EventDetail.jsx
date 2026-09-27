import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAdminEvent, getEvent, getEventTagIndex } from "../api/eventsService";
import { getEventPostCandidates } from "../api/postsService";
import EventCard from "../components/EventCard";
import PostCard from "../components/PostCard";
import { ROUTES } from "../routes";
import { buildEventTagIndex, getEventTagLinks } from "../utils/eventTagLinks";

export default function EventDetail() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [relatedPosts, setRelatedPosts] = useState([]);
    const [eventTagIndex, setEventTagIndex] = useState(null);
    const [loading, setLoading] = useState(true);
    const isAdmin = !!localStorage.getItem("jwt");

    useEffect(() => {
        async function load() {
            try {
                const eventRes = await (isAdmin ? getAdminEvent(eventId) : getEvent(eventId));
                setEvent(eventRes.data.event);
                try {
                    const [tagsRes, postsRes] = await Promise.all([
                        getEventTagIndex(),
                        getEventPostCandidates(eventId),
                    ]);
                    const index = buildEventTagIndex(tagsRes.data || []);
                    setEventTagIndex(index);
                    setRelatedPosts((postsRes.data || []).filter((post) =>
                        getEventTagLinks(post, index, { includeHiddenTimelineContext: true }).some(({ event: linkedEvent }) =>
                            String(linkedEvent.id) === String(eventId)
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
        if (window.history.state?.idx > 0) {
            navigate(-1);
        } else {
            navigate(ROUTES.events);
        }
    }

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
                    <h2 id="event-related-posts-title">Related posts</h2>
                    <div className="timeline-container">
                        {relatedPosts.map((post) => (
                            <PostCard key={post.id} post={post} eventTagIndex={eventTagIndex} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
