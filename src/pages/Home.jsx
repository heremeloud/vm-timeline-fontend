import { useEffect, useState } from "react";
import "../styles/Home.css";
import api from "../api/api";
import { Link } from "react-router-dom";
import PostCard from "../components/PostCard";

export default function Home() {
    const [posts, setPosts] = useState([]);

    const [platformFilter, setPlatformFilter] = useState("all");
    const [sortOrder, setSortOrder] = useState("newest");

    const [page, setPage] = useState(1);
    const LIMIT = 10;

    async function load() {
        let url = `/posts?limit=${LIMIT}&offset=${(page - 1) * LIMIT}`;

        if (platformFilter !== "all") {
            url += `&platform=${platformFilter}`;
        }

        url += `&sort=${sortOrder}`;

        const postRes = await api.get(url);
        const basePosts = postRes.data;

        // Load comments + replies lazily (only for posts on the current page)
        const withReplies = await Promise.all(
            basePosts.map(async (p) => {
                const [commentsRes, threadRes] = await Promise.all([
                    api.get(`/texts/by_post/${p.id}`),
                    api.get(`/posts/${p.id}/thread`),
                ]);

                return {
                    ...p,
                    comments: commentsRes.data,
                    childrenPosts: threadRes.data,
                };
            })
        );

        setPosts(withReplies);
    }

    useEffect(() => {
        load();
    }, [platformFilter, sortOrder, page]);

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
                <label>Platform:</label>
                <select
                    value={platformFilter}
                    onChange={(e) => {
                        setPage(1);
                        setPlatformFilter(e.target.value);
                    }}
                >
                    <option value="all">All</option>
                    <option value="ig">Instagram</option>
                    <option value="x">X (Twitter)</option>
                </select>

                <label>Sort:</label>
                <select
                    value={sortOrder}
                    onChange={(e) => {
                        setPage(1);
                        setSortOrder(e.target.value);
                    }}
                >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                </select>
            </div>

            {/* Posts Page */}
            <div className="timeline-container">
                {posts.map((post) => (
                    <PostCard
                        key={post.id}
                        post={post}
                        childrenPosts={post.childrenPosts || []}
                        comments={post.comments || []}
                    />
                ))}
            </div>

            {/* Pagination Controls */}
            <div className="pagination-bar">
                <button
                    className="pagination-btn"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                >
                    ⬅ Prev
                </button>

                <span>Page {page}</span>

                <button
                    className="pagination-btn"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={posts.length < LIMIT}
                >
                    Next ➜
                </button>
            </div>
            {/* Add Button */}
            <Link to="/create-post">
                <button className="fab-button">+</button>
            </Link>
        </div>
    );
}
