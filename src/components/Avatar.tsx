import { useState } from "react";
import { resolvePhotoUrl } from "../utils/media";
import "../styles/IGReply.css";

interface AvatarProps {
    url?: string | null;
    authorId?: number | string | null;
    name?: string | null;
    defaultUrl?: string | null;
}

const FALLBACK_EMOJI = "👤";

export default function Avatar({ url, authorId, name, defaultUrl = null }: AvatarProps) {
    // Try the author's photo, then the bundled local avatar, then the caller's default,
    // then fall back to the emoji. A failed image advances to the next source.
    const sources = [
        resolvePhotoUrl(url),
        authorId ? `/avatars/${authorId}.jpg` : null,
        defaultUrl,
    ].filter((source): source is string => Boolean(source));
    const sourcesKey = sources.join("\n");

    // Failures only count against the sources they were recorded for, so new props start fresh.
    const [failures, setFailures] = useState({ key: "", count: 0 });
    const failedCount = failures.key === sourcesKey ? failures.count : 0;
    const src = sources[failedCount] ?? null;

    return (
        <div className="avatar-wrapper">
            {src ? (
                <img
                    className="avatar-img"
                    src={src}
                    alt={name ?? ""}
                    referrerPolicy="no-referrer"
                    onError={() => setFailures({ key: sourcesKey, count: failedCount + 1 })}
                />
            ) : (
                <span className="avatar-emoji">{FALLBACK_EMOJI}</span>
            )}
        </div>
    );
}
