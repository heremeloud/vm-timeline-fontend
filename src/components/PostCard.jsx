import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import "../styles/PostCard.css";
import api from "../api/api";

import InstagramEmbed from "./InstagramEmbed";
import TweetEmbed from "./TweetEmbed";
import IGReply from "./IGReply";
import TweetReply from "./TweetReply";

export default function PostCard({ post, childrenPosts = [], comments = [] }) {
    const isInstagram = post.platform === "ig" || post.platform === "instagram";
    const isTwitter = post.platform === "x" || post.platform === "twitter";

    useEffect(() => {
        setTimeout(() => window.twttr?.widgets?.load(), 150);
    }, [childrenPosts, comments]);

    // IG reply grouping
    const igReplyPairs = useMemo(() => {
        if (!isInstagram) return [];
        const byMain = {};

        comments.forEach((c) => {
            const key = c.parent_comment_id ?? c.id;
            if (!byMain[key]) byMain[key] = { main: null, translation: null };
            if (c.type === "ig-reply") byMain[key].main = c;
            if (c.type === "ig-translation") byMain[key].translation = c;
        });

        return Object.values(byMain).filter((p) => p.main);
    }, [comments, isInstagram]);

    return (
        <div className="post-wrapper">
            {/* EMBED */}
            <div className="post-embed">
                {isInstagram && <InstagramEmbed url={post.external_url} />}
                {isTwitter && <TweetEmbed url={post.external_url} />}
            </div>

            {/* CAPTION */}
            {/* {post.caption && (
                <div className="post-caption">
                    <b>Main Caption:</b>
                    <p>{post.caption}</p>
                </div>
            )} */}

            {post.caption_translation && (
                <div className="post-caption-translation">
                    {/* <b>Translation:</b> */}
                    <p>{post.caption_translation}</p>
                </div>
            )}

            {/* MEDIA */}
            {post.media_url && (
                <div className="post-media">
                    <img src={post.media_url} alt="media" />
                </div>
            )}

            {/* IG REPLIES */}
            {isInstagram && igReplyPairs.length > 0 && (
                <div className="reply-section">
                    <h3>Instagram Replies</h3>
                    {igReplyPairs.map((pair) => (
                        <IGReply key={pair.main.id} pair={pair} />
                    ))}
                </div>
            )}

            {/* TWEET REPLIES */}
            {isTwitter && childrenPosts.length > 0 && (
                <div className="reply-section">
                    <h3>Tweet Replies</h3>
                    {childrenPosts.map((child) => (
                        <TweetReply key={child.id} reply={child} />
                    ))}
                </div>
            )}

            {/* ACTION BUTTONS */}
            {localStorage.getItem("adminToken") && (
                <div className="post-actions">
                    <Link to={`/add-reply/${post.id}`}>
                        <button>
                            {isInstagram ? "Add IG Reply" : "Add Tweet Reply"}
                        </button>
                    </Link>

                    <Link to={`/edit-post/${post.id}`}>
                        <button>Edit Post</button>
                    </Link>

                    <button
                        onClick={() => {
                            if (confirm("Delete this post?")) {
                                api.delete(`/posts/${post.id}`).then(() =>
                                    window.location.reload()
                                );
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
