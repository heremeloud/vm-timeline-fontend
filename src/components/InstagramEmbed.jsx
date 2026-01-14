import { useEffect } from "react";
import { isVideo, isImage } from "../utils/media";
import Avatar from "./Avatar";

export default function InstagramEmbed({
    external_url,
    media_url,
    caption = "",
    author_name,
    author_photo,
    author_id,
}) {
    const igUrl = (external_url || "").trim();
    const mediaUrl = (media_url || "").trim();

    const hasIGEmbed = igUrl.length > 0;
    const hasMedia = mediaUrl.length > 0;

    // Instagram embed processing
    useEffect(() => {
        if (!hasIGEmbed) return;

        const process = () => {
            if (window.instgrm?.Embeds?.process)
                window.instgrm.Embeds.process();
        };

        if (!window.instgrm) {
            const existing = document.getElementById("instagram-embed-script");
            if (!existing) {
                const script = document.createElement("script");
                script.id = "instagram-embed-script";
                script.src = "https://www.instagram.com/embed.js";
                script.async = true;
                script.onload = process;
                document.body.appendChild(script);
            } else {
                process();
            }
        } else {
            process();
        }
    }, [hasIGEmbed, igUrl]);

    // 1) Instagram embed (real post)
    if (hasIGEmbed) {
        return (
            <blockquote
                className="instagram-media"
                data-instgrm-permalink={igUrl}
                data-instgrm-version="14"
                data-instgrm-captioned="true"
                style={{ width: "100%", margin: 0, padding: 0 }}
            />
        );
    }

    // 2/3) Stored media: show Avatar + author line + media
    if (hasMedia && (isVideo(mediaUrl) || isImage(mediaUrl))) {
        return (
            <div className="igpost-container">
                <div
                    className="igpost-row"
                    style={{ display: "flex", gap: 12 }}
                >
                    <Avatar
                        url={author_photo}
                        authorId={author_id}
                        name={author_name}
                    />

                    <div style={{ flex: 1 }}>
                        {author_name && (
                            <div
                                className="igpost-author"
                                style={{ fontWeight: 600, marginBottom: 6 }}
                            >
                                {author_name} 
                            </div>
                        )}

                        {isVideo(mediaUrl) ? (
                            <video
                                src={mediaUrl}
                                controls
                                playsInline
                                preload="metadata"
                                style={{
                                    width: "100%",
                                    height: "auto",
                                    borderRadius: 12,
                                    background: "black",
                                }}
                            />
                        ) : (
                            <img
                                src={mediaUrl}
                                alt={caption || "Instagram media"}
                                loading="lazy"
                                style={{
                                    width: "100%",
                                    height: "auto",
                                    borderRadius: 12,
                                    objectFit: "contain",
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
