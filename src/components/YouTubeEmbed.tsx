import { useState } from "react";
import { withAutoplay, youTubePosterUrl } from "../utils/youtube";
import "../styles/YouTubeEmbed.css";

interface YouTubeEmbedProps {
    /** A youtube.com/embed/... URL (video or `videoseries` playlist). */
    embedUrl: string;
    title: string;
    /** Image shown before the player loads; defaults to the video's YouTube still. */
    poster?: string | null;
}

/**
 * Shows a poster with a play button and only loads YouTube's player when tapped.
 * On iPhone the player runs in the page's own process, so a stray tap on an idle player
 * (or one that can't play) could leave the rest of the page unresponsive to taps.
 * Fills its parent, which must be `position: relative` with a set aspect ratio.
 */
export default function YouTubeEmbed({ embedUrl, title, poster }: YouTubeEmbedProps) {
    const [playing, setPlaying] = useState(false);

    if (playing) {
        return (
            <iframe
                src={withAutoplay(embedUrl)}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
            />
        );
    }

    const image = poster || youTubePosterUrl(embedUrl);
    // A native button: the poster fills the frame, which no `Button` variant is shaped for.
    return (
        <button type="button" className="youtube-embed-poster" onClick={() => setPlaying(true)} aria-label={`Play ${title}`}>
            {image && <img src={image} alt="" loading="lazy" />}
            <span className="youtube-embed-title">{title}</span>
            <span className="youtube-embed-play" aria-hidden="true" />
        </button>
    );
}
