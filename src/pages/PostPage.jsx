import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getPost, getThread } from "../api/postsService";
import PostCard from "../components/PostCard";

export default function PostPage() {
    const { postId } = useParams();

    const [loading, setLoading] = useState(true);
    const [post, setPost] = useState(null);
    const [childrenPosts, setChildrenPosts] = useState([]);
    const [comments, setComments] = useState([]);

    useEffect(() => {
        async function load() {
            // main post + IG comments
            const res = await getPost(postId);
            console.log("MAIN POST RESPONSE:", res.data);

            setPost(res.data.post);
            setComments(res.data.comments);

            // tweet replies
            const threadRes = await getThread(postId);
            console.log("THREAD RESPONSE:", threadRes.data);

            setChildrenPosts(threadRes.data);

            setLoading(false);
        }
        load();
    }, [postId]);

    if (loading) return <div>Loading...</div>;
    if (!post) return <div>Post not found</div>;

    return (
        <PostCard 
            post={post}
            childrenPosts={childrenPosts}
            comments={comments}
        />
    );
}
