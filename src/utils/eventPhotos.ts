import type { Event, EventPhoto } from "../types/models";

type PhotoSource = Partial<Pick<Event, "photo_items" | "media_urls" | "media_url" | "media_focal_x" | "media_focal_y">>;

export function normalizeEventPhotos(event: PhotoSource = {}): EventPhoto[] {
    if (event.photo_items?.length) {
        return event.photo_items.map(photo => ({ ...photo, focal_x: photo.focal_x ?? 50, focal_y: photo.focal_y ?? 50 }));
    }
    const urls = event.media_urls?.length ? event.media_urls : [event.media_url].filter((url): url is string => Boolean(url));
    return urls.map((url, index) => ({
        url,
        focal_x: index === 0 ? event.media_focal_x ?? 50 : 50,
        focal_y: index === 0 ? event.media_focal_y ?? 50 : 50,
    }));
}

export function cleanEventPhotos(photos: EventPhoto[]): EventPhoto[] {
    const seen = new Set<string>();
    return photos.map(photo => ({ ...photo, url: photo.url.trim() })).filter(photo => {
        const key = JSON.stringify([photo.url, photo.date || null]);
        if (!photo.url || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export function getEventPhotoForDate(event: PhotoSource, day: string) {
    const photos = normalizeEventPhotos(event);
    return photos.find(photo => photo.date === day) || photos[0] || null;
}
