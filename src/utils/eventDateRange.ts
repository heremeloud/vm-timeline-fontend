type DatedEvent = { dates?: string[]; start_date?: string | null; event_date?: string | null; end_date?: string | null };

export function getEventDates(event?: DatedEvent | null) {
    return [...new Set((event?.dates || []).filter(Boolean))].sort();
}

export function getEventStartDate(event?: DatedEvent | null) {
    return event?.dates?.slice().sort()[0] || event?.start_date || event?.event_date || "";
}

export function formatEventDateRange(event?: DatedEvent | null, emptyText = "") {
    const dates = getEventDates(event);
    if (dates.length === 1) return dates[0];
    if (dates.length > 1) {
        return `${dates[0]} – ${dates[dates.length - 1]} · ${dates.length} dates`;
    }
    const start = getEventStartDate(event);
    const end = event?.end_date || "";

    if (!start && !end) return emptyText;
    if (!start) return end;
    if (!end || start === end) return start;

    return `${start} – ${end}`;
}
