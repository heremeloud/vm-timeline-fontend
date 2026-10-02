import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getEventViews } from "../api/eventViewsService";
import type { EventView } from "../types/models";
import { ROUTES } from "../routes";

const SHOW_EVENT_VIEW_NAVIGATION = import.meta.env.VITE_SHOW_EVENT_VIEW_NAVIGATION !== "false";

export default function EventViewNavigation({ activeSlug = "" }: { activeSlug?: string }) {
    const [views, setViews] = useState<EventView[]>([]);

    useEffect(() => {
        if (!SHOW_EVENT_VIEW_NAVIGATION) return;
        let cancelled = false;
        getEventViews()
            .then((res) => {
                if (!cancelled) setViews(res.data || []);
            })
            .catch((err) => console.error("Could not load filtered event page links:", err));
        return () => {
            cancelled = true;
        };
    }, []);

    if (!SHOW_EVENT_VIEW_NAVIGATION || views.length === 0) return null;

    return (
        <nav className="event-view-navigation" aria-label="Browse event pages">
            <div className="event-view-navigation-links">
                <Link className={!activeSlug ? "is-active" : ""} to={ROUTES.events}>All Events</Link>
                {views.map((view) => (
                    <Link
                        key={view.id}
                        className={activeSlug === view.slug ? "is-active" : ""}
                        to={ROUTES.eventView(view.slug)}
                    >
                        {view.title}
                    </Link>
                ))}
            </div>
        </nav>
    );
}
