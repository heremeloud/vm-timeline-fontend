import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getAdminPost, getPost } from "../api/postsService";
import PostCard from "../components/PostCard";

export default function PostPage() {
    const { postId } = useParams();

    const [loading, setLoading] = useState(true);
    const [post, setPost] = useState(null);
    const isAdmin = !!localStorage.getItem("jwt");

    useEffect(() => {
        async function load() {
            try {
                const res = await (isAdmin ? getAdminPost(postId) : getPost(postId));
                setPost(res.data.post);
            } catch (err) {
                console.error("Load post failed:", err);
                setPost(null);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [postId, isAdmin]);

    if (loading) return <div>Loading...</div>;
    if (!post) return <div>Post not found</div>;

    return (
        <PostCard post={post} />
    );
}
