import { useState } from "react";
import "../styles/IGReply.css";

export default function Avatar({ url, authorId, name }) {
    const FALLBACK_LOCAL = `/avatars/${authorId}.jpg`;
    const FALLBACK_EMOJI = "👤";

    const [src, setSrc] = useState(url);

    return (
        <div className="avatar-wrapper">
            {src ? (
                <img
                    className="avatar-img"
                    src={src}
                    alt={name}
                    referrerPolicy="no-referrer"
                    onError={() => {
                        if (src === url) setSrc(FALLBACK_LOCAL);
                        else setSrc(null); // final fallback → emoji
                    }}
                />
            ) : (
                <span className="avatar-emoji">{FALLBACK_EMOJI}</span>
            )}
        </div>
    );
}
