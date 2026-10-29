/** The video id of a youtube.com/embed/<id> URL, or "" for playlists (`videoseries`) and other URLs. */
export function youTubeEmbedVideoId(embedUrl: string): string {
    const match = embedUrl.match(/^https:\/\/www\.youtube\.com\/embed\/([\w-]+)/);
    return match && match[1] !== "videoseries" ? match[1] : "";
}

/** YouTube's still image for an embed URL, or "" when it has none (playlists). */
export function youTubePosterUrl(embedUrl: string): string {
    const id = youTubeEmbedVideoId(embedUrl);
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "";
}

/** The embed URL with autoplay on, for loading the player right after the viewer taps play. */
export function withAutoplay(embedUrl: string): string {
    try {
        const url = new URL(embedUrl);
        url.searchParams.set("autoplay", "1");
        return url.toString();
    } catch {
        return embedUrl;
    }
}
