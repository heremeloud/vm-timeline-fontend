import { useEffect, useState } from "react";
import "../styles/Home.css";
import api from "../api/api";
import { Link } from "react-router-dom";
import PostCard from "../components/PostCard";

export default function Home() {
    const [posts, setPosts] = useState([]);
    const [platformFilter, setPlatformFilter] = useState("all");
    const [sortOrder, setSortOrder] = useState("newest");

    // Infinite scroll controls
    const [offset, setOffset] = useState(0);
    const LIMIT = 10;
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    // ------------------------------
    // LOAD MORE POSTS FROM BACKEND
    // ------------------------------
    async function loadMore() {
        if (isLoading || !hasMore) return;

        setIsLoading(true);

        let url = `/posts?offset=${offset}&limit=${LIMIT}`;

        if (platformFilter !== "all") {
            url += `&platform=${platformFilter}`;
        }

        url += `&sort=${sortOrder}`;

        const res = await api.get(url);
        const newPosts = res.data;

        if (newPosts.length < LIMIT) {
            setHasMore(false);
        }

        // Load children + comments per post
        const enriched = await Promise.all(
            newPosts.map(async (p) => {
                const commentsRes = await api.get(`/texts/by_post/${p.id}`);
                const threadRes = await api.get(`/posts/${p.id}/thread`);

                return {
                    ...p,
                    comments: commentsRes.data,
                    childrenPosts: threadRes.data,
                };
            })
        );

        setPosts((prev) => [...prev, ...enriched]);
        setOffset((prev) => prev + LIMIT);

        setIsLoading(false);
    }

    // ------------------------------
    // RESET WHEN FILTERS CHANGE
    // ------------------------------
    useEffect(() => {
        setPosts([]);
        setOffset(0);
        setHasMore(true);
        loadMore();
    }, [platformFilter, sortOrder]);

    // ------------------------------
    // INFINITE SCROLL HANDLER
    // ------------------------------
    useEffect(() => {
        function handleScroll() {
            if (
                window.innerHeight + window.scrollY >=
                    document.body.offsetHeight - 400 &&
                hasMore
            ) {
                loadMore();
            }
        }

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [hasMore, offset]);

    // ------------------------------
    // RELOAD EMBEDS WHEN POSTS CHANGE
    // ------------------------------
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
        }, 300);
    }, [posts]);

    return (
        <div className="home-container">
            <div className="home-header">
                <h1 style={{ marginBottom: "0.2rem" }}>ViewMim Interaction</h1>
                <h1 style={{ marginTop: "0.2rem" }}>🤎Timeline🤍</h1>
                <p>Collecting ViewMim IG and Twitter interactions</p>
                <small style={{ opacity: 0.7 }}>
                    ※ IG stories & TikToks are not included atm
                </small>
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
                        childrenPosts={post.childrenPosts || []}
                        comments={post.comments || []}
                    />
                ))}

                {/* Loading indicator */}
                {isLoading && <p style={{ opacity: 0.6 }}>Loading…</p>}

                {/* End message */}
                {!hasMore && (
                    <p style={{ opacity: 0.6, marginTop: "1rem" }}>
                        — No more posts —
                    </p>
                )}
            </div>

            {/* Floating Add Button */}
            <Link to="/create-post">
                <button className="fab-button">+</button>
            </Link>
        </div>
    );
}
