import Avatar from "./Avatar";
import { isImage, isVideo } from "../utils/media";

function MessageMedia({ url }) {
    if (!url) return null;
    if (isVideo(url)) {
        return <video className="ig-broadcast-media" src={url} controls playsInline preload="metadata" />;
    }
    if (isImage(url)) {
        return <img className="ig-broadcast-media" src={url} alt="Broadcast channel attachment" loading="lazy" />;
    }
    return <a className="ig-broadcast-attachment" href={url} target="_blank" rel="noopener noreferrer">View attachment ↗</a>;
}

export default function InstagramBroadcast({ messages = [], channelName, externalUrl, authorName, authorPhoto, authorId, instagramUrl }) {
    return (
        <section className="ig-broadcast" aria-label={`${authorName || "Instagram"} broadcast channel`}>
            <header className="ig-broadcast-header">
                <Avatar url={authorPhoto} authorId={authorId} name={authorName} />
                <div>
                    {instagramUrl ? (
                        <a className="ig-broadcast-author" href={instagramUrl} target="_blank" rel="noopener noreferrer">{authorName || "Instagram"}</a>
                    ) : <div className="ig-broadcast-author">{authorName || "Instagram"}</div>}
                    <div className="ig-broadcast-label">
                        <span>Broadcast Channel{channelName ? ` - ${channelName}` : ""}</span>
                        {externalUrl && (
                            <a
                                className="ig-broadcast-source"
                                href={externalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Open Broadcast Channel message on Instagram"
                                title="Open on Instagram"
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M7 17 17 7M9 7h8v8" />
                                </svg>
                            </a>
                        )}
                    </div>
                </div>
            </header>

            <div className="ig-broadcast-messages">
                {messages.map((message, index) => (
                    <article className="ig-broadcast-message" key={`${message.url || "message"}-${index}`}>
                        {message.attachment_type !== "photo" && <MessageMedia url={message.url} />}
                        {message.text && message.url && message.attachment_type !== "photo" ? (
                            <details className="ig-broadcast-transcript">
                                <summary>Original Message</summary>
                                <p className="ig-broadcast-original">{message.text}</p>
                            </details>
                        ) : message.text ? <p className="ig-broadcast-original">{message.text}</p> : null}
                        {message.attachment_type === "photo" && <MessageMedia url={message.url} />}
                        {message.translation && <p className="ig-broadcast-translation">{message.translation}</p>}
                        {message.note && <p className="ig-broadcast-note">📝 {message.note}</p>}
                    </article>
                ))}
            </div>
        </section>
    );
}
