// -------------------------------------------------------
// EVENT CATEGORIES
// To add or remove a category, just edit this array.
// Changes here update the dropdowns in CreateEvent,
// EditEvent, and the Events filter bar automatically.
// -------------------------------------------------------

import type { EventCategoryOption } from "../types/models";

export const EVENT_CATEGORIES = [
    { value: "show",      label: "Show" },
    { value: "live",      label: "Live" },
    { value: "press tour", label: "Press Tour" },
    { value: "event",      label: "Event" },
    { value: "fan event",  label: "Fan Event" },
];

export const EVENT_SUBCATEGORIES: Record<string, string[]> = {
    show: ["interview", "variety", "talk"],
    event: ["brand event", "promotional event", "award show", "gmmtv"],
    "fan event": ["fan sign", "fan meet", "fan fest"],
};

export function formatEventSubcategory(value: string) {
    if (value === "gmmtv") return "GMMTV";
    return value.replace(/\b\w/g, (letter: string) => letter.toUpperCase());
}

export const DEFAULT_EVENT_CATEGORY_OPTIONS: EventCategoryOption[] = EVENT_CATEGORIES.map((category, categoryIndex) => ({
    ...category,
    sort_order: categoryIndex,
    is_default: categoryIndex === 0,
    subcategories: (EVENT_SUBCATEGORIES[category.value] || []).map((value, subcategoryIndex) => ({
        value,
        label: formatEventSubcategory(value),
        sort_order: subcategoryIndex,
    })),
}));
