import { useEffect, useState } from "react";
import "../styles/IGReply.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function resolvePhotoUrl(url) {
    if (!url) return null;
    if (url.startsWith("/static/")) return API_BASE + url;
    return url;
}

export default function Avatar({ url, authorId, name, defaultUrl = null }) {
    const FALLBACK_LOCAL = `/avatars/${authorId}.jpg`;
    const FALLBACK_EMOJI = "👤";
    const resolvedUrl = resolvePhotoUrl(url);
    const fallbackSrc = authorId ? FALLBACK_LOCAL : null;
    const finalFallbackSrc = defaultUrl || null;

    const [src, setSrc] = useState(resolvedUrl || fallbackSrc || finalFallbackSrc);

    useEffect(() => {
        setSrc(resolvedUrl || fallbackSrc || finalFallbackSrc);
    }, [resolvedUrl, fallbackSrc, finalFallbackSrc]);

    return (
        <div className="avatar-wrapper">
            {src ? (
                <img
                    className="avatar-img"
                    src={src}
                    alt={name}
                    referrerPolicy="no-referrer"
                    onError={() => {
                        if (src === resolvedUrl && fallbackSrc) setSrc(fallbackSrc);
                        else if (src !== finalFallbackSrc && finalFallbackSrc) setSrc(finalFallbackSrc);
                        else setSrc(null); // final fallback → emoji
                    }}
                />
            ) : (
                <span className="avatar-emoji">{FALLBACK_EMOJI}</span>
            )}
        </div>
    );
}
