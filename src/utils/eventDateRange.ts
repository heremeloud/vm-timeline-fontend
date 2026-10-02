type DatedEvent = { dates?: string[]; start_date?: string | null; event_date?: string | null; end_date?: string | null };

export function getEventStartDate(event?: DatedEvent | null) {
    return event?.dates?.slice().sort()[0] || event?.start_date || event?.event_date || "";
}

export function formatEventDateRange(event?: DatedEvent | null, emptyText = "") {
    if (event?.dates?.length) return [...new Set(event.dates)].sort().join(", ");
    const start = getEventStartDate(event);
    const end = event?.end_date || "";

    if (!start && !end) return emptyText;
    if (!start) return end;
    if (!end || start === end) return start;

    return `${start} - ${end}`;
}
