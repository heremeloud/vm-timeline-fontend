export type TwitterImageSize = "small" | "medium" | "large" | "4096x4096" | "orig";

/**
 * The same Twitter/X photo (`pbs.twimg.com/media/...`) at another size, so pages can show a light version
 * while the saved URL stays full size. Any other URL, or a Twitter URL without a format, is returned unchanged.
 */
export function twitterImageAtSize(url: string, size: TwitterImageSize): string {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return url;
    }
    if (parsed.hostname !== "pbs.twimg.com" || !parsed.pathname.startsWith("/media/")) return url;

    // Legacy form: /media/ID.jpg:large
    const legacy = parsed.pathname.match(/^(\/media\/[^/:]+\.\w+)(:\w+)?$/);
    if (legacy && !parsed.searchParams.has("format")) {
        parsed.pathname = `${legacy[1]}:${size}`;
        return parsed.toString();
    }
    if (!parsed.searchParams.has("format")) return url;
    parsed.searchParams.set("name", size);
    return parsed.toString();
}
