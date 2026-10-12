import { useCallback, useEffect, useState } from "react";
import { getProjectCategories } from "../api/projectCategoriesService";
import { DEFAULT_PROJECT_CATEGORY_OPTIONS } from "../constants/projectCategories";

/** Project categories in the admin-chosen order; starts with the built-in list until the API answers. */
export default function useProjectCategories() {
    const [categories, setCategories] = useState(DEFAULT_PROJECT_CATEGORY_OPTIONS);
    const [loading, setLoading] = useState(true);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getProjectCategories();
            if (Array.isArray(res.data) && res.data.length) setCategories(res.data);
        } catch (err) {
            console.error("Could not load project categories:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    return { categories, loading, reload };
}
