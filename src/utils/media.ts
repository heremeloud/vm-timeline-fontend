import { API_BASE } from "../config";
// Detect Cloudflare R2 (public dev URLs)

export function isFromR2(url = "") {
    try {
        return new URL(url).hostname.endsWith(".r2.dev");
    } catch {
        return false;
    }
}

export function isVideo(url = "") {
    return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
}

export function isImage(url = "") {
    return /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url);
}

/** Backend-relative asset paths (`/static/...`) need the API origin prepended. */
export function resolvePhotoUrl(url?: string | null): string | null {
    if (!url) return null;
    if (url.startsWith("/static/")) return API_BASE + url;
    return url;
}

/** An embeddable youtube.com URL for a watch / youtu.be / live / shorts / embed link, or "". */
export function getYouTubeEmbedUrl(url?: string | null): string {
    const s = (url || "").trim();
    if (!s) return "";
    try {
        const parsed = new URL(s.startsWith("http") ? s : `https://${s}`);
        if (parsed.hostname.includes("youtu.be")) {
            const id = parsed.pathname.replace("/", "").trim();
            return id ? `https://www.youtube.com/embed/${id}` : "";
        }
        if (parsed.hostname.includes("youtube.com")) {
            const v = parsed.searchParams.get("v");
            if (v) return `https://www.youtube.com/embed/${v}`;
            const parts = parsed.pathname.split("/").filter(Boolean);
            const idx = parts.findIndex((part) => ["live", "embed", "shorts"].includes(part));
            if (idx !== -1 && parts[idx + 1]) return `https://www.youtube.com/embed/${parts[idx + 1]}`;
        }
    } catch {
        // Not a URL: nothing to embed.
    }
    return "";
}
