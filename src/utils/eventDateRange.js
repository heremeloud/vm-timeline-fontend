export function getEventStartDate(event) {
    return event?.start_date || event?.event_date || "";
}

export function formatEventDateRange(event, emptyText = "") {
    const start = getEventStartDate(event);
    const end = event?.end_date || "";

    if (!start && !end) return emptyText;
    if (!start) return end;
    if (!end || start === end) return start;

    return `${start} - ${end}`;
}
