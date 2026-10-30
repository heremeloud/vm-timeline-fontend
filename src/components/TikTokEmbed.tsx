import { useMemo } from "react";
import useNearViewport from "../hooks/useNearViewport";
import { extractTikTokPostId } from "../utils/postUrls";

interface TikTokEmbedProps {
    external_url?: string | null;
    media_url?: string | null;
}

export default function TikTokEmbed({ external_url }: TikTokEmbedProps) {
    const ttUrl = (external_url || "").trim();

    const videoId = useMemo(() => extractTikTokPostId(ttUrl), [ttUrl]);
    const hasTikTokEmbed = !!videoId;
    // Each TikTok player boots a whole app; only start one when its card is about to scroll into view,
    // so the visible card isn't competing with players further down the timeline.
    const { ref, isNearViewport } = useNearViewport<HTMLDivElement>("200px");

    // 1) TikTok embed iframe
    if (hasTikTokEmbed) {
        // The lighter player/v1 endpoint: embed/v2 makes far more API calls per card, so a page of
        // TikTok cards hit TikTok's per-visitor limit and some frames showed "ratelimit triggered".
        const embedUrl = `https://www.tiktok.com/player/v1/${videoId}?description=1&music_info=1&rel=0`;

        return (
            <div ref={ref} className="tiktok-embed">
                {/* Sits under the frame and shows until TikTok paints its own page over it. */}
                <div className="tiktok-embed-placeholder" aria-hidden="true">
                    <span className="tiktok-embed-spinner" />
                </div>
                {isNearViewport && (
                    <iframe
                        className="tiktok-embed-frame"
                        src={embedUrl}
                        title="TikTok embed"
                        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                        allowFullScreen
                    />
                )}
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
