import { useEffect, useState } from "react";
import { getEventTagIndex } from "../api/eventsService";
import { buildEventTagIndex } from "../utils/eventTagLinks";
import type { EventTagIndex } from "../utils/eventTagLinks";

/** Loads the hashtag → event index that turns post hashtags into links. `null` until loaded or if loading failed. */
export default function useEventTagIndex(): EventTagIndex | null {
    const [index, setIndex] = useState<EventTagIndex | null>(null);

    useEffect(() => {
        let cancelled = false;
        getEventTagIndex().then((res) => {
            if (!cancelled) setIndex(buildEventTagIndex(res.data || []));
        }).catch((error) => {
            if (cancelled) return;
            console.error("Event tag index load failed:", error);
            setIndex(null);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    return index;
}
