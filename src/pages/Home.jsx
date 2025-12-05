import { useEffect, useState } from "react";
import "../styles/Home.css";
import api from "../api/api";
import { Link } from "react-router-dom";
import PostCard from "../components/PostCard";

export default function Home() {
    const [posts, setPosts] = useState([]);
    const [platformFilter, setPlatformFilter] = useState("all");
    const [sortOrder, setSortOrder] = useState("newest");

    async function load() {
        let url = "/posts?";

        if (platformFilter !== "all") {
            url += `platform=${platformFilter}&`;
        }

        const postRes = await api.get(url);
        let posts = postRes.data;

        // Sorting
        if (sortOrder === "newest") {
            posts = posts.sort((a, b) => {
                const dateCompare = (b.posted_at || "").localeCompare(
                    a.posted_at || ""
                );

                // If same date → sort by id DESC (higher id = newer)
                if (dateCompare === 0) {
                    return b.id - a.id;
                }

                return dateCompare;
            });
        } else {
            posts = posts.sort((a, b) => {
                const dateCompare = (a.posted_at || "").localeCompare(
                    b.posted_at || ""
                );

                // If same date → sort by id ASC (lower id = older)
                if (dateCompare === 0) {
                    return a.id - b.id;
                }

                return dateCompare;
            });
        }

        // Load IG comments + Tweet replies for each post
        const withReplies = await Promise.all(
            posts.map(async (p) => {
                const commentsRes = await api.get(`/texts/by_post/${p.id}`);
                const threadRes = await api.get(`/posts/${p.id}/thread`);

                return {
                    ...p,
                    comments: commentsRes.data, // IG comments
                    childrenPosts: threadRes.data, // tweet replies
                };
            })
        );

        setPosts(withReplies);
    }

    useEffect(() => {
        load();
    }, [platformFilter, sortOrder]);

    // embed processing
    useEffect(() => {
        const tw = document.createElement("script");
        tw.src = "https://platform.twitter.com/widgets.js";
        tw.async = true;
        document.body.appendChild(tw);

        const ig = document.createElement("script");
        ig.src = "https://www.instagram.com/embed.js";
        ig.async = true;
        document.body.appendChild(ig);

        setTimeout(() => {
            window.twttr?.widgets?.load();
            window.instgrm?.Embeds?.process();
        }, 500);
    }, [posts]);

    return (
        <div className="home-container">
            <div className="home-header">
                <h1>🤎ViewMim Interaction Timeline🤍</h1>
                <p>Collecting ViewMim IG and Twitter interactions</p>
                <small style={{ opacity: 0.7 }}>※ IG stories & TikToks are not included atm</small>
                <hr />
            </div>

            {/* Filters */}
            <div className="filter-bar">
                <label>Filter by Platform:</label>
                <select
                    value={platformFilter}
                    onChange={(e) => setPlatformFilter(e.target.value)}
                >
                    <option value="all">All</option>
                    <option value="ig">Instagram</option>
                    <option value="x">X (Twitter)</option>
                </select>

                <span style={{ marginLeft: 20 }} />

                <label>Sort by:</label>
                <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                </select>
            </div>

            {/* Render posts */}

            <div className="timeline-container">
                {posts.map((post) => (
                    <PostCard
                        key={post.id}
                        post={post}
                        childrenPosts={
                            post.childrenPosts || post.children || []
                        }
                        comments={post.comments || []}
                    />
                ))}
            </div>

            {/* Floating Add Button */}
            <Link to="/create-post">
                <button className="fab-button">+</button>
            </Link>
        </div>
    );
}
