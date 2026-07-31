// -------------------------------------------------------
// EVENT CATEGORIES
// To add or remove a category, just edit this array.
// Changes here update the dropdowns in CreateEvent,
// EditEvent, and the Events filter bar automatically.
// -------------------------------------------------------

export const EVENT_CATEGORIES = [
    { value: "show",      label: "Show" },
    { value: "live",      label: "Live" },
    { value: "press tour", label: "Press Tour" },
    { value: "event",      label: "Event" },
    { value: "fan event",  label: "Fan Event" },
];

export const EVENT_SUBCATEGORIES = {
    show: ["interview", "variety", "talk"],
    event: ["brand event", "promotional event", "award show", "gmmtv"],
    "fan event": ["fan sign", "fan meet", "fan fest"],
};

export function formatEventSubcategory(value) {
    if (value === "gmmtv") return "GMMTV";
    return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
