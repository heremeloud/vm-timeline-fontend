import { useMemo } from "react";
import Avatar from "./Avatar";
import { isVideo, isImage } from "../utils/media";

function extractTikTokVideoId(url) {
    if (!url) return "";
    const m = url.match(/\/video\/(\d+)/);
    return m?.[1] || "";
}

export default function TikTokEmbed({
    external_url,
    media_url,
    caption = "",
    author_name,
    author_photo,
    author_id,
}) {
    const ttUrl = (external_url || "").trim();
    const mediaUrl = (media_url || "").trim();

    const videoId = useMemo(() => extractTikTokVideoId(ttUrl), [ttUrl]);
    const hasTikTokEmbed = !!videoId;
    const hasMedia = mediaUrl.length > 0;

    // 1) TikTok embed iframe
    if (hasTikTokEmbed) {
        // TikTok embed URL format
        const embedUrl = `https://www.tiktok.com/embed/v2/${videoId}`;

        return (
            <div style={{ width: "100%" }}>
                <iframe
                    src={embedUrl}
                    title="TikTok embed"
                    style={{
                        width: "100%",
                        height: 750,
                        border: "none",
                        borderRadius: 12,
                        overflow: "hidden",
                    }}
                    allow="encrypted-media;"
                    scrolling="yes"
                />
            </div>
        );
    }

    // // 2) Fallback: stored media
    // if (hasMedia && (isVideo(mediaUrl) || isImage(mediaUrl))) {
    //     return (
    //         <div className="igpost-container">
    //             <div
    //                 className="igpost-row"
    //                 style={{ display: "flex", gap: 12 }}
    //             >
    //                 <Avatar
    //                     url={author_photo}
    //                     authorId={author_id}
    //                     name={author_name}
    //                 />

    //                 <div style={{ flex: 1 }}>
    //                     {author_name && (
    //                         <div style={{ fontWeight: 600, marginBottom: 6 }}>
    //                             {author_name}
    //                         </div>
    //                     )}

    //                     {isVideo(mediaUrl) ? (
    //                         <video
    //                             src={mediaUrl}
    //                             controls
    //                             playsInline
    //                             preload="metadata"
    //                             style={{
    //                                 width: "100%",
    //                                 height: "auto",
    //                                 borderRadius: 12,
    //                                 background: "black",
    //                             }}
    //                         />
    //                     ) : (
    //                         <img
    //                             src={mediaUrl}
    //                             alt={caption || "TikTok media"}
    //                             loading="lazy"
    //                             style={{
    //                                 width: "100%",
    //                                 height: "auto",
    //                                 borderRadius: 12,
    //                                 objectFit: "contain",
    //                             }}
    //                         />
    //                     )}
    //                 </div>
    //             </div>
    //         </div>
    //     );
    // }

    return null;
}
