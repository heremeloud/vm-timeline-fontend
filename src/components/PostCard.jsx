import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/PostCard.css";
import api from "../api/api";
import { isFromR2, isVideo, isImage } from "../utils/media";

import InstagramEmbed from "./InstagramEmbed";
import TweetEmbed from "./TweetEmbed";
import IGReply from "./IGReply";
import TweetReply from "./TweetReply";

export default function PostCard({ post }) {
    const isInstagram = post.platform === "ig" || post.platform === "instagram";
    const isTwitter = post.platform === "x" || post.platform === "twitter";

    const [comments, setComments] = useState([]);
    const [childrenPosts, setChildrenPosts] = useState([]);

    // Load replies immediately (no lazy loading)
    useEffect(() => {
        async function load() {
            const [cRes, tRes] = await Promise.all([
                api.get(`/texts/by_post/${post.id}`),
                api.get(`/posts/${post.id}/thread`),
            ]);

            setComments(cRes.data);
            setChildrenPosts(tRes.data);

            // refresh Twitter embeds
            setTimeout(() => window.twttr?.widgets?.load(), 150);
        }

        load();
    }, [post.id]);

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
            <div className="post-embed">
                {isInstagram && (
                    <InstagramEmbed
                        external_url={post.external_url}
                        media_url={post.media_url}
                        caption={post.caption}
                        author_id={post.author_id}
                        author_name={post.author_name}
                        author_photo={post.author_photo}
                    />
                )}
                {isTwitter && <TweetEmbed url={post.external_url} />}
            </div>

            {post.caption_translation && (
                <div className="post-caption-translation">
                    <p>{post.caption_translation}</p>
                </div>
            )}

            {isTwitter && post.media_url && (
                <div className="post-media">
                    {/* ideally render video-aware here later */}
                    <img src={post.media_url} alt="" />
                </div>
            )}

            {isInstagram && igReplyPairs.length > 0 && (
                <div className="reply-section">
                    <h3>Instagram Replies</h3>
                    {igReplyPairs.map((pair) => (
                        <IGReply key={pair.main.id} pair={pair} />
                    ))}
                </div>
            )}

            {isTwitter && childrenPosts.length > 0 && (
                <div className="reply-section">
                    <h3>Tweet Replies</h3>
                    {childrenPosts.map((child) => (
                        <TweetReply key={child.id} reply={child} />
                    ))}
                </div>
            )}

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
