export const emptyEventDateItem = () => ({ date: "", keyword: "", hashtag: "" });

export function normalizeEventDateItems(event = {}) {
    if (event.date_items?.length) {
        return event.date_items.map((item) => ({
            date: item.date || "",
            keyword: item.keyword || "",
            hashtag: item.hashtag || "",
        }));
    }
    return (event.dates || []).map((date) => ({ date, keyword: "", hashtag: "" }));
}

export function cleanEventDateItems(items = []) {
    return items
        .filter((item) => item.date)
        .map((item) => ({
            date: item.date,
            keyword: item.keyword?.trim() || null,
            hashtag: item.hashtag?.trim().replace(/^#/, "") || null,
        }));
}

export function getEventDateItemForPhoto(items = [], photo = null) {
    const populatedItems = items.filter((item) => item.date && (item.keyword || item.hashtag));
    if (!populatedItems.length) return null;
    if (photo?.date) {
        const matchingItem = items.find((item) => item.date === photo.date);
        return matchingItem && (matchingItem.keyword || matchingItem.hashtag) ? matchingItem : null;
    }
    return populatedItems[0];
}
