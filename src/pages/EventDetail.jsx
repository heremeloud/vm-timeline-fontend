import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAdminEvent, getEvent } from "../api/eventsService";
import EventCard from "../components/EventCard";
import { ROUTES } from "../routes";

export default function EventDetail() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const isAdmin = !!localStorage.getItem("jwt");

    useEffect(() => {
        async function load() {
            try {
                const res = await (isAdmin ? getAdminEvent(eventId) : getEvent(eventId));
                setEvent(res.data.event);
            } catch {
                setEvent(null);
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
        </div>
    );
}
