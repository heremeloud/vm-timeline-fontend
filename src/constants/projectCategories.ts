// -------------------------------------------------------
// PROJECT CATEGORIES
// Fallback shown until the saved list loads (or if the API is
// unreachable). The real list is managed in Manage Display →
// Projects → Project categories and read with useProjectCategories.
// -------------------------------------------------------

import type { ProjectCategoryOption } from "../types/models";

export const PROJECT_CATEGORIES = ["series", "concert", "movie", "variety", "song", "music video", "other"];

export const DEFAULT_PROJECT_CATEGORY_OPTIONS: ProjectCategoryOption[] = PROJECT_CATEGORIES.map((value, index) => ({
    value,
    label: value.replace(/\b\w/g, (letter) => letter.toUpperCase()),
    sort_order: index,
    is_protected: value === "series",
}));
