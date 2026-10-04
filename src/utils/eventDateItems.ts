import type { Event } from "../types/models";

export interface EventDateItemForm {
    date: string;
    keyword: string;
    hashtag: string;
}

export const emptyEventDateItem = (): EventDateItemForm => ({ date: "", keyword: "", hashtag: "" });

export function getEventDateMode(event: Partial<Pick<Event, "dates">> = {}): "range" | "dates" {
    return event.dates?.length ? "dates" : "range";
}

export function normalizeEventDateItems(event: Partial<Pick<Event, "date_items" | "dates">> = {}): EventDateItemForm[] {
    if (event.date_items?.length) {
        return event.date_items.map((item) => ({
            date: item.date || "",
            keyword: item.keyword || "",
            hashtag: item.hashtag || "",
        }));
    }
    return (event.dates || []).map((date) => ({ date, keyword: "", hashtag: "" }));
}

export function cleanEventDateItems(items: Partial<EventDateItemForm>[] = []) {
    return items
        .filter((item): item is Partial<EventDateItemForm> & { date: string } => Boolean(item.date))
        .map((item) => ({
            date: item.date,
            keyword: item.keyword?.trim() || null,
            hashtag: item.hashtag?.trim().replace(/^#/, "") || null,
        }));
}

export function getEventDateItemForPhoto<T extends { date?: string | null; keyword?: string | null; hashtag?: string | null }>(items: T[] = [], photo: { date?: string | null } | null = null): T | null {
    const populatedItems = items.filter((item) => item.date && (item.keyword || item.hashtag));
    if (!populatedItems.length) return null;
    if (photo?.date) {
        const matchingItem = items.find((item) => item.date === photo.date);
        return matchingItem && (matchingItem.keyword || matchingItem.hashtag) ? matchingItem : null;
    }
    return populatedItems[0];
}
