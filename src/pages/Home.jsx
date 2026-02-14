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
    const [jumpPage, setJumpPage] = useState("");

    const [lastPage, setLastPage] = useState(null); // discovered last page
    const LIMIT = 10;

    // Build posts URL for a given page (base posts only)
    function buildPostsUrl(targetPage) {
        let url = `/posts?limit=${LIMIT}&offset=${(targetPage - 1) * LIMIT}&sort=${sortOrder}`;
        if (platformFilter !== "all") url += `&platform=${platformFilter}`;
        return url;
    }

    // Fetch ONLY the base posts for a page (no replies)
    async function fetchBasePosts(targetPage) {
        const res = await api.get(buildPostsUrl(targetPage));
        return res.data || [];
    }

    // Check if a page has at least 1 post
    async function pageHasData(targetPage) {
        const base = await fetchBasePosts(targetPage);
        return base.length > 0;
    }

    // Jump handler that clamps to real last page by probing + binary search
    async function handleJump() {
        const num = Number(jumpPage);

        if (!num || num < 1) {
            alert("Enter a valid page number.");
            return;
        }

        // If we already know lastPage, clamp immediately
        if (lastPage && num > lastPage) {
            setPage(lastPage);
            setJumpPage("");
            return;
        }

        try {
            // 1) Probe requested page
            const base = await fetchBasePosts(num);

            if (base.length > 0) {
                setPage(num);
                setJumpPage("");
                return;
            }

            // 2) If empty, find the last non-empty page in [1, num-1] using binary search
            let lo = 1;
            let hi = num - 1;
            let ans = 1;

            // If even page 1 has no data, stay at 1
            const hasAny = await pageHasData(1);
            if (!hasAny) {
                setLastPage(1);
                setPage(1);
                setJumpPage("");
                return;
            }

            while (lo <= hi) {
                const mid = Math.floor((lo + hi) / 2);
                // eslint-disable-next-line no-await-in-loop
                const ok = await pageHasData(mid);

                if (ok) {
                    ans = mid;
                    lo = mid + 1; // try higher pages
                } else {
                    hi = mid - 1; // go lower
                }
            }

            setLastPage(ans);
            setPage(ans);
            setJumpPage("");
        } catch (err) {
            console.error("Jump failed:", err);
            alert("Jump failed. Check console for details.");
        }
    }

    async function load() {
        try {
            const basePosts = await fetchBasePosts(page);

            // Discover last page when we hit it naturally
            if (basePosts.length < LIMIT) {
                setLastPage(page);
            }

            // Load comments + replies for posts on this page
            const withReplies = await Promise.all(
                basePosts.map(async (p) => {
                    const isTwitter = p.platform === "x" || p.platform === "twitter";
                    const [commentsRes, threadRes] = await Promise.all([
                        api.get(`/texts/by_post/${p.id}`),
                        isTwitter ? api.get(`/posts/${p.id}/thread`) : Promise.resolve({ data: [] }),
                    ]);

                    return {
                        ...p,
                        comments: commentsRes.data,
                        childrenPosts: threadRes.data,
                    };
                })
            );

            setPosts(withReplies);
        } catch (err) {
            console.error("Load failed:", err);
            setPosts([]);
        }
    }

    // Load whenever page/filter/sort changes
    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [platformFilter, sortOrder, page]);

    // When filter/sort changes, reset pagination knowledge
    useEffect(() => {
        setLastPage(null);
        setPage(1);
        setJumpPage("");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [platformFilter, sortOrder]);

    const nextDisabled = lastPage ? page >= lastPage : posts.length < LIMIT;

    return (
        <div className="home-container">
            <div className="home-header">
                <h1 style={{ marginBottom: "0.2rem" }}>ViewMim Interaction</h1>
                <h1 style={{ marginTop: "0.2rem" }}>🤎Timeline🤍</h1>
                <p>Collecting ViewMim IG and Twitter interactions</p>
                <p>Last update: Feb/13/2026</p>
                <small style={{ opacity: 0.7 }}>
                    ※ IG stories are included starting 2026 *
                </small>
                <hr />
            </div>

            {/* Filters */}
            <div className="filter-bar">
                <label>Platform:</label>
                <select
                    value={platformFilter}
                    onChange={(e) => setPlatformFilter(e.target.value)}
                >
                    <option value="all">All</option>
                    <option value="ig">Instagram</option>
                    <option value="x">X (Twitter)</option>
                    <option value="tt">TikTok</option>
                </select>

                <label>Sort:</label>
                <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
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

            {/* Pagination + Jump */}
            <div
                className="pagination-bar"
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "10px",
                    marginTop: "20px",
                }}
            >
                {/* Pagination Controls */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <button
                        className="pagination-btn"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        ⬅️ Prev
                    </button>

                    <span>
                        Page {page}
                        {lastPage ? ` / ${lastPage}` : ""}
                    </span>

                    <button
                        className="pagination-btn"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={nextDisabled}
                    >
                        Next ➡️
                    </button>
                </div>

                {/* Jump to page (no button) */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                        Jump to:
                    </span>

                    <input
                        type="number"
                        min="1"
                        max={lastPage || undefined}
                        value={jumpPage}
                        onChange={(e) => setJumpPage(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleJump();
                        }}
                        onBlur={() => {
                            if (jumpPage) handleJump();
                        }}
                        style={{
                            width: "55px",
                            padding: "4px",
                            fontSize: "0.8rem",
                        }}
                    />
                </div>
            </div>

            {/* Add Button */}
            <Link to="/create-post">
                <button className="fab-button">+</button>
            </Link>
        </div>
    );
}
