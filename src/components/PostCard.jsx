import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/PostCard.css";
import { getTextsByPost } from "../api/textsService";
import { getThread, deletePost } from "../api/postsService";
import { ROUTES } from "../routes";

import InstagramEmbed from "./InstagramEmbed";
import TweetEmbed from "./TweetEmbed";
import TikTokEmbed from "./TikTokEmbed";

import IGReply from "./IGReply";
import TweetReply from "./TweetReply";
import TikTokReply from "./TikTokReply";

export default function PostCard({ post }) {
    const isInstagram = post.platform === "ig" || post.platform === "instagram";
    const isTwitter = post.platform === "x" || post.platform === "twitter";
    const isTikTok = post.platform === "tt" || post.platform === "tiktok";

    const [comments, setComments] = useState([]);
    const [childrenPosts, setChildrenPosts] = useState([]);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
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
    }, [post.id, isTwitter]);

    // IG reply grouping (type names must match what you save in PostText.type)
    const igReplyPairs = useMemo(() => {
        if (!isInstagram) return [];
        const byMain = {};

        comments.forEach((c) => {
            const key = c.parent_comment_id ?? c.id;
            if (!byMain[key]) byMain[key] = { main: null, translation: null };

            // If your DB uses "ig-comment" instead, change these two strings.
            if (c.type === "ig-reply") byMain[key].main = c;
            if (c.type === "ig-translation") byMain[key].translation = c;
        });

        return Object.values(byMain).filter((p) => p.main);
    }, [comments, isInstagram]);

    // TikTok reply grouping (type names must match what you save in PostText.type)
    const ttReplyPairs = useMemo(() => {
        if (!isTikTok) return [];
        const byMain = {};

        comments.forEach((c) => {
            const key = c.parent_comment_id ?? c.id;
            if (!byMain[key]) byMain[key] = { main: null, translation: null };

            // If you use "tt-comment" instead of "tt-reply", change this.
            if (c.type === "tt-reply") byMain[key].main = c;
            if (c.type === "tt-translation") byMain[key].translation = c;
        });

        return Object.values(byMain).filter((p) => p.main);
    }, [comments, isTikTok]);

    return (
        <div className="post-wrapper">
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
                        {isInstagram ? "Instagram" : isTwitter ? "X (Twitter)" : "TikTok"}
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
                {isInstagram && (
                    <InstagramEmbed
                        external_url={post.external_url}
                        media_url={post.media_url}
                        media_urls={post.media_urls || []}
                        caption={post.caption}
                        author_id={post.author_id}
                        author_name={post.author_name}
                        author_photo={post.author_photo}
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
            </div>

            {post.caption_translation && (
                <div className="post-caption-translation">
                    <p>{post.caption_translation}</p>
                </div>
            )}

            {/* Separate media block for X.
          If TweetEmbed already handles media, can remove this. */}
            {isTwitter && post.media_url && (
                <div className="post-media">
                    <img src={post.media_url} alt="" />
                </div>
            )}

            {isInstagram && igReplyPairs.length > 0 && (
                <div className="reply-section">
                    <span className="reply-section-label">Instagram Reply</span>
                    {igReplyPairs.map((pair) => (
                        <IGReply key={pair.main.id} pair={pair} />
                    ))}
                </div>
            )}

            {isTikTok && ttReplyPairs.length > 0 && (
                <div className="reply-section">
                    <span className="reply-section-label">TikTok Reply</span>
                    {ttReplyPairs.map((pair) => (
                        <TikTokReply key={pair.main.id} pair={pair} />
                    ))}
                </div>
            )}

            {isTwitter && childrenPosts.length > 0 && (
                <div className="reply-section">
                    <span className="reply-section-label">Tweet Reply</span>
                    {childrenPosts.map((child) => (
                        <TweetReply key={child.id} reply={child} />
                    ))}
                </div>
            )}

            {localStorage.getItem("jwt") && (
                <div className="post-actions">
                    <Link to={ROUTES.addReply(post.id)}>
                        <button>
                            {isInstagram
                                ? "Add IG Reply"
                                : isTikTok
                                  ? "Add TikTok Reply"
                                  : "Add Tweet Reply"}
                        </button>
                    </Link>

                    <Link to={ROUTES.editPost(post.id)}>
                        <button>Edit Post</button>
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
