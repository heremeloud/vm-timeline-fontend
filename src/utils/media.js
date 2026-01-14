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
