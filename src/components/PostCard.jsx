import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "../styles/PostCard.css";
import { getTextsByPost } from "../api/textsService";
import { getThread, deletePost, updatePost } from "../api/postsService";
import { ROUTES } from "../routes";
import { getEventTagLinks } from "../utils/eventTagLinks";

import { isVideo } from "../utils/media";
import InstagramEmbed from "./InstagramEmbed";
import InstagramBroadcast from "./InstagramBroadcast";
import TweetEmbed from "./TweetEmbed";
import TikTokEmbed from "./TikTokEmbed";
import AdultTweetCard from "./AdultTweetCard";
import EventLinkedText from "./EventLinkedText";

import IGReply from "./IGReply";
import TweetReply from "./TweetReply";
import TikTokReply from "./TikTokReply";

export default function PostCard({ post, showReplies = true, eventTagIndex = null }) {
    const location = useLocation();
    const isAdmin = !!localStorage.getItem("jwt");
    const returnTo = `${location.pathname}${location.search}`;
    const isInstagram = post.platform === "ig" || post.platform === "instagram";
    const isBroadcast = isInstagram && post.content_type === "broadcast";
    const isTwitter = post.platform === "x" || post.platform === "twitter";
    const isTikTok = post.platform === "tt" || post.platform === "tiktok";
    const rendersAdultFallback = Boolean(post.is_adult);
    const eventTagLinks = useMemo(
        () => getEventTagLinks(post, eventTagIndex),
        [post, eventTagIndex]
    );

    const [comments, setComments] = useState([]);
    const [childrenPosts, setChildrenPosts] = useState([]);
    const [isPublic, setIsPublic] = useState(post.is_visible !== false);
    const [savingVisibility, setSavingVisibility] = useState(false);

    async function togglePublicVisibility() {
        const nextValue = !isPublic;
        setIsPublic(nextValue);
        setSavingVisibility(true);

        try {
            await updatePost(post.id, { is_visible: nextValue });
        } catch (err) {
            setIsPublic(!nextValue);
            console.error("Visibility update failed:", err);
            alert("Could not update this post's public visibility.");
        } finally {
            setSavingVisibility(false);
        }
    }

    function saveReturnScroll() {
        sessionStorage.setItem("homeTimelineReturnScrollY", String(window.scrollY));
    }

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                if (!showReplies) {
                    if (!cancelled) {
                        setComments([]);
                        setChildrenPosts([]);
                    }
                    return;
                }

                // Always load PostText (used by IG + TikTok)
                const cRes = await getTextsByPost(post.id);
                if (!cancelled) setComments(cRes.data);

                // Only X uses child-post threads
                if (isTwitter) {
                    const tRes = await getThread(post.id);
                    if (!cancelled) setChildrenPosts(tRes.data);

                    // refresh Twitter embeds
                    setTimeout(() => window.twttr?.widgets?.load(), 150);
                } else {
                    if (!cancelled) setChildrenPosts([]);
                }
            } catch (err) {
                console.error("PostCard load error:", err);
                if (!cancelled) {
                    setComments([]);
                    setChildrenPosts([]);
                }
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [post.id, isTwitter, showReplies]);

    // IG replies — flat list (translation + note live on the same record)
    const igReplies = useMemo(() => {
        if (!isInstagram) return [];
        return comments.filter((c) => c.type === "ig-reply");
    }, [comments, isInstagram]);

    // TikTok replies — flat list
    const ttReplies = useMemo(() => {
        if (!isTikTok) return [];
        return comments.filter((c) => c.type === "tt-reply");
    }, [comments, isTikTok]);

    return (
        <div className="post-wrapper">
            {isAdmin && (
                <label
                    className="post-visibility-toggle"
                    title={isPublic ? "Visible to the public" : "Hidden from the public"}
                >
                    <input
                        type="checkbox"
                        checked={isPublic}
                        disabled={savingVisibility}
                        onChange={togglePublicVisibility}
                        aria-label="Show this post to the public"
                    />
                    <span>{savingVisibility ? "Saving…" : "Public"}</span>
                </label>
            )}
            {post.posted_at && (
                <div className="post-date">
                    <span
                        className="post-platform-dot"
                        style={{
                            background: isInstagram
                                ? "#e1306c"
                                : isTwitter
                                  ? "#1d9bf0"
                                  : "#010101",
                        }}
                    />
                    <span className="post-platform-name">
                        {isBroadcast ? "Instagram Broadcast Channel" : isInstagram ? "Instagram" : isTwitter ? "X (Twitter)" : "TikTok"}
                    </span>
                    <span className="post-date-sep">·</span>
                    {new Date(post.posted_at + "T00:00:00").toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                    })}
                </div>
            )}
            <div className="post-embed">
                {rendersAdultFallback ? (
                    isTwitter ? (
                        <AdultTweetCard tweet={post} eventTagLinks={eventTagLinks} />
                    ) : (
                        <div className="post-adult-card">
                            {post.author_name && (
                                <div className="post-adult-author">{post.author_name}</div>
                            )}
                        {post.external_url && (
                            <a href={post.external_url} target="_blank" rel="noopener noreferrer" className="post-adult-source">
                                {isInstagram ? "Instagram post" : isTwitter ? "Tweet" : "TikTok"} ↗
                            </a>
                        )}
                        {post.caption && (
                            <p className="post-adult-caption">
                                <EventLinkedText text={post.caption} eventTagLinks={eventTagLinks} />
                            </p>
                        )}
                        {post.caption_translation && (
                            <p className="post-adult-translation">
                                <EventLinkedText text={post.caption_translation} eventTagLinks={eventTagLinks} />
                            </p>
                        )}
                        {post.caption_translation_note && (
                            <p className="post-adult-note">
                                📝 <EventLinkedText text={post.caption_translation_note} eventTagLinks={eventTagLinks} />
                            </p>
                        )}
                        {post.media_url && (
                            isVideo(post.media_url) ? (
                                <video
                                    src={post.media_url}
                                    controls
                                    playsInline
                                    muted
                                    className="post-adult-media"
                                />
                            ) : (
                                <img src={post.media_url} alt="" className="post-adult-media" />
                            )
                        )}
                        </div>
                    )
                ) : (
                    <>
                        {isInstagram && !isBroadcast && (
                            <InstagramEmbed
                                external_url={post.external_url}
                                media_url={post.media_url}
                                media_urls={post.media_urls || []}
                                caption={post.caption}
                                author_id={post.author_id}
                                author_name={post.author_name}
                                author_photo={post.author_photo}
                                author_ig_pfp_url={post.author_ig_pfp_url}
                                author_instagram_url={post.author_instagram_url}
                            />
                        )}

                        {isBroadcast && (
                            <InstagramBroadcast
                                messages={post.media_urls || []}
                                channelName={post.author_broadcast_channel_name}
                                externalUrl={post.external_url}
                                authorName={post.author_name}
                                authorPhoto={post.author_ig_pfp_url || post.author_photo}
                                authorId={post.author_id}
                                instagramUrl={post.author_instagram_url}
                            />
                        )}

                        {isTwitter && <TweetEmbed url={post.external_url} />}

                        {isTikTok && (
                            <TikTokEmbed
                                external_url={post.external_url}
                                media_url={post.media_url}
                                caption={post.caption}
                                author_id={post.author_id}
                                author_name={post.author_name}
                                author_photo={post.author_photo}
                            />
                        )}
                    </>
                )}
            </div>

            {post.caption_translation && !rendersAdultFallback && (
                <div className="post-caption-translation">
                    <p>
                        <EventLinkedText text={post.caption_translation} eventTagLinks={eventTagLinks} />
                    </p>
                    {post.caption_translation_note && (
                        <p className="post-translation-note">
                            📝 <EventLinkedText text={post.caption_translation_note} eventTagLinks={eventTagLinks} />
                        </p>
                    )}
                </div>
            )}

            {/* Separate media block for X.
          If TweetEmbed already handles media, can remove this. */}
            {isTwitter && post.media_url && !rendersAdultFallback && (
                <div className="post-media">
                    <img src={post.media_url} alt="" />
                </div>
            )}

            {!post.caption_translation && !rendersAdultFallback && eventTagLinks.length > 0 && (
                <div className="post-event-tags" aria-label="Related events">
                    {eventTagLinks.map(({ hashtag, event, projectId }) => (
                        <Link
                            key={`${hashtag}-${event.id}`}
                            to={projectId ? ROUTES.projectDetail(projectId) : ROUTES.eventDetail(event.id)}
                            className="post-event-tag-link"
                            title={projectId ? "View related project" : `View event: ${event.name}`}
                        >
                            {hashtag}
                        </Link>
                    ))}
                </div>
            )}

            {showReplies && isInstagram && igReplies.length > 0 && (
                <div className="reply-section">
                    <span className="reply-section-label">Instagram Reply</span>
                    {igReplies.map((reply) => (
                        <IGReply key={reply.id} reply={reply} />
                    ))}
                </div>
            )}

            {showReplies && isTikTok && ttReplies.length > 0 && (
                <div className="reply-section">
                    <span className="reply-section-label">TikTok Reply</span>
                    {ttReplies.map((reply) => (
                        <TikTokReply key={reply.id} reply={reply} />
                    ))}
                </div>
            )}

            {showReplies && isTwitter && childrenPosts.length > 0 && (
                <div className="reply-section">
                    <span className="reply-section-label">Tweet Reply</span>
                    {childrenPosts.map((child) => (
                        <TweetReply key={child.id} reply={child} />
                    ))}
                </div>
            )}

            {isAdmin && (
                <div className="post-actions">
                    <Link
                        to={ROUTES.addReply(post.id)}
                        state={{ returnTo }}
                        onClick={saveReturnScroll}
                    >
                        <button>
                            {isInstagram
                                ? "Add IG Reply"
                                : isTikTok
                                  ? "Add TikTok Reply"
                                  : "Add Tweet Reply"}
                        </button>
                    </Link>

                    <Link
                        to={ROUTES.editPost(post.id)}
                        state={{ returnTo }}
                        onClick={saveReturnScroll}
                    >
                        <button className="btn-edit">Edit Post</button>
                    </Link>

                    <button
                        onClick={async () => {
                            if (confirm("Delete this post?")) {
                                try {
                                    await deletePost(post.id);
                                    window.location.reload();
                                } catch (err) {
                                    console.error("Delete post failed:", err);
                                    alert("Delete failed: " + (err.response?.data?.detail || err.message));
                                }
                            }
                        }}
                        className="btn-delete"
                    >
                        Delete Post
                    </button>
                </div>
            )}
        </div>
    );
}
