import { isVideo } from "../utils/media";
import Avatar from "./Avatar";

function getTweetHandle(url = "") {
    try {
        const parsed = new URL(url);
        const parts = parsed.pathname.split("/").filter(Boolean);
        return parts[0] ? `@${parts[0]}` : "";
    } catch {
        const match = url.match(/(?:twitter\.com|x\.com)\/([^/?#]+)\/status/i);
        return match?.[1] ? `@${match[1]}` : "";
    }
}

export default function AdultTweetCard({ tweet }) {
    const avatarUrl = tweet.author_twitter_pfp_url || tweet.author_photo;
    const authorName = tweet.author_name || "X user";
    const authorInitial = authorName.trim().charAt(0).toUpperCase();
    const tweetHandle = getTweetHandle(tweet.external_url);

    return (
        <div className="post-adult-card post-adult-card--tweet">
            <div className="post-adult-tweet-header">
                {avatarUrl ? (
                    <Avatar
                        url={avatarUrl}
                        authorId={tweet.author_id}
                        name={authorName}
                    />
                ) : (
                    <div className="post-adult-tweet-initial" aria-hidden="true">
                        {authorInitial}
                    </div>
                )}
                <div className="post-adult-tweet-meta">
                    <span className="post-adult-tweet-name">{authorName}</span>
                    <span className="post-adult-tweet-source">
                        <span className="post-adult-tweet-handle">{tweetHandle || "@twitter"}</span>
                        {tweet.external_url && (
                            <>
                                <span className="post-adult-tweet-dot" aria-hidden="true"> · </span>
                                <a className="post-adult-tweet-link" href={tweet.external_url} target="_blank" rel="noopener noreferrer">
                                    Tweet
                                </a>
                                <span aria-hidden="true"> </span>
                                <a className="post-adult-tweet-link" href={tweet.external_url} target="_blank" rel="noopener noreferrer" aria-label="Open Tweet">
                                    ↗
                                </a>
                            </>
                        )}
                    </span>
                </div>
            </div>

            {tweet.caption && (
                <p className="post-adult-caption">{tweet.caption}</p>
            )}
            {tweet.caption_translation && (
                <p className="post-adult-translation">{tweet.caption_translation}</p>
            )}
            {tweet.caption_translation_note && (
                <p className="post-adult-note">📝 {tweet.caption_translation_note}</p>
            )}
            {tweet.media_url && (
                isVideo(tweet.media_url) ? (
                    <video
                        src={tweet.media_url}
                        controls
                        playsInline
                        muted
                        className="post-adult-media"
                    />
                ) : (
                    <img src={tweet.media_url} alt="" className="post-adult-media" />
                )
            )}
        </div>
    );
}
