import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
                style={{ display: "inline-block", fontSize: "0.85rem", color: "#888", background: "none", border: "none", padding: 0, cursor: "pointer", marginBottom: 20 }}
            >
                ← Back
            </button>
            <EventCard event={event} />
        </div>
    );
}
