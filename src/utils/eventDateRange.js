export function getEventStartDate(event) {
    return event?.dates?.slice().sort()[0] || event?.start_date || event?.event_date || "";
}

export function formatEventDateRange(event, emptyText = "") {
    if (event?.dates?.length) return [...new Set(event.dates)].sort().join(", ");
    const start = getEventStartDate(event);
    const end = event?.end_date || "";

    if (!start && !end) return emptyText;
    if (!start) return end;
    if (!end || start === end) return start;

    return `${start} - ${end}`;
}
