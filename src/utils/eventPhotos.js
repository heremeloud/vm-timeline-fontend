export function normalizeEventPhotos(event = {}) {
    if (event.photo_items?.length) {
        return event.photo_items.map(photo => ({ ...photo, focal_x: photo.focal_x ?? 50, focal_y: photo.focal_y ?? 50 }));
    }
    const urls = event.media_urls?.length ? event.media_urls : [event.media_url].filter(Boolean);
    return urls.map((url, index) => ({
        url,
        focal_x: index === 0 ? event.media_focal_x ?? 50 : 50,
        focal_y: index === 0 ? event.media_focal_y ?? 50 : 50,
    }));
}

export function cleanEventPhotos(photos) {
    const seen = new Set();
    return photos.map(photo => ({ ...photo, url: photo.url.trim() })).filter(photo => {
        const key = JSON.stringify([photo.url, photo.date || null]);
        if (!photo.url || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export function getEventPhotoForDate(event, day) {
    const photos = normalizeEventPhotos(event);
    return photos.find(photo => photo.date === day) || photos[0] || null;
}
