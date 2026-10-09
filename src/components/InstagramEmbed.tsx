import { useEffect, useState } from "react";
import { isVideo, isImage } from "../utils/media";
import { getMediaDownloadUrl } from "../api/mediaService";
import Avatar from "./Avatar";
import "../styles/PostCard.css";
import "../styles/MediaCarousel.css";
import { CarouselControls } from "../ui";
import type { MediaItem as MediaItemData } from "../types/models";
import useNearViewport from "../hooks/useNearViewport";

// -------------------------------------------------------
// Single media item (image or video)
// -------------------------------------------------------
function MediaItem({ url, caption, postLayout = false }: { url: string; caption?: string | null; postLayout?: boolean }) {
    if (isVideo(url)) {
        return (
            <video
                src={url}
                controls
                playsInline
                muted
                autoPlay
                preload="metadata"
                className={postLayout ? "ig-archive-media" : undefined}
                style={postLayout ? undefined : {
                    width: "100%", height: "auto", borderRadius: 12,
                    background: "black", display: "block",
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
                className={postLayout ? "ig-archive-media" : undefined}
                style={postLayout ? undefined : {
                    width: "100%", height: "auto", borderRadius: 12,
                    objectFit: "contain", display: "block",
                }}
            />
        );
    }
    return null;
}

// -------------------------------------------------------
// Carousel for multiple media items (each item is {url, text, translation, note})
// -------------------------------------------------------
interface MediaCarouselProps {
    items: MediaItemData[];
    caption?: string | null;
    idx: number;
    setIdx: (index: number) => void;
    postLayout?: boolean;
}

function MediaCarousel({ items, caption, idx, setIdx, postLayout = false }: MediaCarouselProps) {
    const total = items.length;
    const current: Partial<MediaItemData> = items[idx] || {};
    const displayUrl = current.url ?? "";
    const translation = current.translation || null;
    const note = current.note || null;

    return (
        <div>
            <div className="media-carousel">
                <MediaItem url={displayUrl} caption={caption} postLayout={postLayout} />

                {postLayout && total > 1 && (
                    <div className="ig-archive-count" aria-live="polite">{idx + 1}/{total}</div>
                )}

                <CarouselControls index={idx} total={total} onChange={setIdx} itemLabel="Story" />
            </div>

            <a className="ig-media-download" href={getMediaDownloadUrl(displayUrl)}>
                Download media
            </a>

            {/* Per-slide translation / note (no original text shown) */}
            {translation && (
                <div className="post-caption-translation">
                    <p>{translation}</p>
                    {note && <p className="post-translation-note">📝 {note}</p>}
                </div>
            )}
        </div>
    );
}

function instagramUsername(profileUrl?: string | null, fallbackName?: string | null) {
    try {
        const parsed = new URL(profileUrl ?? "");
        const username = decodeURIComponent(parsed.pathname.split("/").filter(Boolean)[0] || "");
        return username || fallbackName || "Instagram";
    } catch {
        return fallbackName || "Instagram";
    }
}

function renderCaptionWithHashtags(caption: string) {
    return caption.split(/(#[\p{L}\p{M}\p{N}_]+)/gu).map((part, index) =>
        /^#[\p{L}\p{M}\p{N}_]+$/u.test(part)
            ? <span className="ig-archive-hashtag" key={`${part}-${index}`}>{part}</span>
            : part
    );
}

// -------------------------------------------------------
// Main component
// -------------------------------------------------------
export interface InstagramEmbedProps {
    external_url?: string | null;
    media_url?: string | null;
    /** Objects, or legacy plain URL strings. */
    media_urls?: Array<MediaItemData | string>;
    display_source?: string;
    content_type?: string;
    caption?: string | null;
    author_name?: string | null;
    author_photo?: string | null;
    author_ig_pfp_url?: string | null;
    author_instagram_url?: string | null;
    author_id?: number | null;
}

export default function InstagramEmbed({
    external_url,
    media_url,
    media_urls = [],   // array of {url, text, translation, note} objects (or legacy strings)
    display_source = "external",
    content_type = "post",
    caption = "",
    author_name,
    author_photo,
    author_ig_pfp_url,
    author_instagram_url,
    author_id,
}: InstagramEmbedProps) {
    const [storyIndex, setStoryIndex] = useState(0);
    const { ref: embedRef, isNearViewport } = useNearViewport<HTMLDivElement>();
    const externalUrl = (external_url || "").trim();
    const singleMediaUrl = (media_url || "").trim();

    // Build normalized items array: [{url, text, translation, note}]
    // prefer media_urls (new), fall back to single media_url (legacy)
    const allItems: MediaItemData[] = media_urls.length > 0
        ? media_urls.map((item) =>
            typeof item === "string"
                ? { url: item, text: null, translation: null, note: null }
                : item
        )
        : singleMediaUrl
            ? [{ url: singleMediaUrl, text: null, translation: null, note: null }]
            : [];

    const hasMedia = allItems.length > 0;
    const useArchivedMedia = display_source === "r2" && hasMedia;
    const igUrl = useArchivedMedia ? "" : externalUrl;
    const hasIGEmbed = igUrl.length > 0;

    // Instagram embed processing
    useEffect(() => {
        if (!hasIGEmbed || !isNearViewport) return;

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
    }, [hasIGEmbed, igUrl, isNearViewport]);

    // 1) Real IG post → use official embed
    if (hasIGEmbed) {
        if (!isNearViewport) {
            return (
                <div ref={embedRef} className="instagram-media-placeholder">
                    <a href={igUrl} target="_blank" rel="noopener noreferrer">
                        View post on Instagram
                    </a>
                </div>
            );
        }

        return (
            <div ref={embedRef}>
                <blockquote
                    className="instagram-media"
                    data-instgrm-permalink={igUrl}
                    data-instgrm-version="14"
                    data-instgrm-captioned="true"
                    style={{ width: "100%", margin: 0, padding: 0 }}
                />
            </div>
        );
    }

    // 2) Archived post → render a self-contained Instagram-style card.
    if (hasMedia && content_type === "post") {
        const profileName = instagramUsername(author_instagram_url, author_name);
        const avatar = (
            <Avatar
                url={author_ig_pfp_url || author_photo}
                authorId={author_id}
                name={author_name}
            />
        );
        return (
            <article className="ig-archive-card" aria-label={`Archived Instagram post by ${profileName}`}>
                <header className="ig-archive-header">
                    {author_instagram_url ? (
                        <a href={author_instagram_url} target="_blank" rel="noopener noreferrer" className="ig-author-link">
                            {avatar}
                        </a>
                    ) : avatar}
                    <div className="ig-archive-author">
                        {author_instagram_url ? (
                            <a href={author_instagram_url} target="_blank" rel="noopener noreferrer" className="ig-author-link">
                                {profileName}
                            </a>
                        ) : profileName}
                    </div>
                    {author_instagram_url && (
                        <a
                            className="ig-archive-view-profile"
                            href={author_instagram_url}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            View profile
                        </a>
                    )}
                </header>

                <MediaCarousel
                    items={allItems}
                    caption={caption}
                    idx={storyIndex}
                    setIdx={setStoryIndex}
                    postLayout
                />

                {caption && (
                    <div className="ig-archive-caption">
                        <strong className="ig-archive-caption-username">{profileName}</strong>
                        <div className="ig-archive-caption-text">{renderCaptionWithHashtags(caption)}</div>
                    </div>
                )}
            </article>
        );
    }

    // 3) Story / manual media → show avatar + carousel
    if (hasMedia) {
        const currentStoryUrl = allItems[storyIndex]?.url ?? "";
        const avatar = (
            <Avatar
                url={author_ig_pfp_url || author_photo}
                authorId={author_id}
                name={author_name}
            />
        );

        return (
            <div className="igpost-container">
                <div className="igpost-row" style={{ display: "flex", gap: 12 }}>
                    {author_instagram_url ? (
                        <a href={author_instagram_url} target="_blank" rel="noopener noreferrer" className="ig-author-link" aria-label={`${author_name || "Author"} on Instagram`}>
                            {avatar}
                        </a>
                    ) : avatar}

                    <div style={{ flex: 1 }}>
                        <div className="igpost-author">
                            {author_name && (author_instagram_url ? (
                                <a
                                    href={author_instagram_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ig-author-link"
                                >
                                    {author_name}
                                </a>
                            ) : (
                                <span>{author_name}</span>
                            ))}
                            {allItems.length > 1 && (
                                <span className="ig-story-progress" aria-live="polite">
                                    {storyIndex + 1} / {allItems.length} stories
                                </span>
                            )}
                            <a
                                className="ig-story-download"
                                href={getMediaDownloadUrl(currentStoryUrl)}
                                aria-label={`Download story ${storyIndex + 1} of ${allItems.length}`}
                                title="Download this story"
                            >
                                <svg viewBox="0 0 20 20" aria-hidden="true">
                                    <path d="M10 4.5v10m-4-4 4 4 4-4" />
                                </svg>
                            </a>
                        </div>

                        <MediaCarousel
                            items={allItems}
                            caption={caption}
                            idx={storyIndex}
                            setIdx={setStoryIndex}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
