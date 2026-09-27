import { useCallback, useEffect, useState } from "react";
import { getEventCategories } from "../api/eventCategoriesService";
import { DEFAULT_EVENT_CATEGORY_OPTIONS } from "../constants/eventCategories";

export default function useEventCategories() {
    const [categories, setCategories] = useState(DEFAULT_EVENT_CATEGORY_OPTIONS);
    const [loading, setLoading] = useState(true);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getEventCategories();
            if (Array.isArray(res.data)) setCategories(res.data);
        } catch (err) {
            console.error("Could not load event categories:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    return { categories, loading, reload };
}
