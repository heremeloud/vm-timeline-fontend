import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getEvent } from "../api/eventsService";
import EventCard from "../components/EventCard";
import { ROUTES } from "../routes";

export default function EventDetail() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const res = await getEvent(eventId);
                setEvent(res.data.event);
            } catch {
                setEvent(null);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [eventId]);

    if (loading) return <div style={{ padding: 20 }}>Loading…</div>;
    if (!event) return <div style={{ padding: 20 }}>Event not found.</div>;

    const backTo = event.project_id
        ? ROUTES.projectDetail(event.project_id)
        : ROUTES.events;

    return (
        <div style={{ maxWidth: 750, margin: "0 auto", padding: "24px 20px 60px" }}>
            <Link
                to={backTo}
                style={{ display: "inline-block", fontSize: "0.85rem", color: "#888", textDecoration: "none", marginBottom: 20 }}
            >
                ← Back
            </Link>
            <EventCard event={event} />
        </div>
    );
}
