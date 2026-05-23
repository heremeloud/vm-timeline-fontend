import { useEffect, useState } from "react";
import { isVideo, isImage } from "../utils/media";
import Avatar from "./Avatar";

// -------------------------------------------------------
// Single media item (image or video)
// -------------------------------------------------------
function MediaItem({ url, caption }) {
    if (isVideo(url)) {
        return (
            <video
                src={url}
                controls
                playsInline
                preload="metadata"
                style={{
                    width: "100%",
                    height: "auto",
                    borderRadius: 12,
                    background: "black",
                    display: "block",
                }}
            />
        );
    }
    if (isImage(url)) {
        return (
            <img
                src={url}
                alt={caption || "Instagram media"}
                loading="lazy"
                style={{
                    width: "100%",
                    height: "auto",
                    borderRadius: 12,
                    objectFit: "contain",
                    display: "block",
                }}
            />
        );
    }
    return null;
}

// -------------------------------------------------------
// Carousel for multiple media items
// -------------------------------------------------------
function MediaCarousel({ urls, caption }) {
    const [idx, setIdx] = useState(0);
    const total = urls.length;

    return (
        <div style={{ position: "relative" }}>
            <MediaItem url={urls[idx]} caption={caption} />

            {total > 1 && (
                <>
                    {/* Prev */}
                    {idx > 0 && (
                        <button
                            onClick={() => setIdx((i) => i - 1)}
                            style={navBtn("left")}
                            aria-label="Previous"
                        >
                            ‹
                        </button>
                    )}

                    {/* Next */}
                    {idx < total - 1 && (
                        <button
                            onClick={() => setIdx((i) => i + 1)}
                            style={navBtn("right")}
                            aria-label="Next"
                        >
                            ›
                        </button>
                    )}

                    {/* Dot indicators */}
                    <div style={dotsWrap}>
                        {urls.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setIdx(i)}
                                style={dotStyle(i === idx)}
                                aria-label={`Slide ${i + 1}`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

const navBtn = (side) => ({
    position: "absolute",
    top: "50%",
    [side]: 8,
    transform: "translateY(-50%)",
    background: "rgba(0,0,0,0.45)",
    color: "#fff",
    border: "none",
    borderRadius: "50%",
    width: 32,
    height: 32,
    fontSize: 20,
    lineHeight: "30px",
    cursor: "pointer",
    padding: 0,
    zIndex: 2,
});

const dotsWrap = {
    display: "flex",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
};

const dotStyle = (active) => ({
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: active ? "#888" : "#ccc",
    border: "none",
    padding: 0,
    cursor: "pointer",
});

// -------------------------------------------------------
// Main component
// -------------------------------------------------------
export default function InstagramEmbed({
    external_url,
    media_url,
    media_urls = [],   // new: array from API
    caption = "",
    author_name,
    author_photo,
    author_id,
}) {
    const igUrl = (external_url || "").trim();
    const singleMediaUrl = (media_url || "").trim();

    // Build the final list of URLs to display:
    // prefer media_urls array (new), fall back to single media_url (legacy)
    const allUrls = media_urls.length > 0
        ? media_urls
        : singleMediaUrl
            ? [singleMediaUrl]
            : [];

    const hasIGEmbed = igUrl.length > 0;
    const hasMedia = allUrls.length > 0;

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

    // 1) Real IG post → use official embed
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

    // 2) Story / manual media → show avatar + carousel
    if (hasMedia) {
        return (
            <div className="igpost-container">
                <div className="igpost-row" style={{ display: "flex", gap: 12 }}>
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
                                {allUrls.length > 1 && (
                                    <span style={{ fontWeight: 400, fontSize: "0.8rem", marginLeft: 8, opacity: 0.6 }}>
                                        {allUrls.length} stories
                                    </span>
                                )}
                            </div>
                        )}

                        <MediaCarousel urls={allUrls} caption={caption} />
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
