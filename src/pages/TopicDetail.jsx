import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { deleteTopic, getTopic } from "../api/topicsService";
import { ROUTES } from "../routes";
import PostCard from "../components/PostCard";
import "../styles/Home.css";
import "../styles/Topics.css";

function formatDateTime(value) {
    if (!value) return "No approximate time";
    const normalized = value.includes("T") ? value : `${value}T00:00`;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatTopicDateRange(topic) {
    if (!topic?.start_date && !topic?.end_date) return "";
    if (topic.start_date && topic.end_date && topic.start_date !== topic.end_date) {
        return `${topic.start_date} - ${topic.end_date}`;
    }
    return topic.start_date || topic.end_date || "";
}

function getSortTime(item) {
    return item.happened_at || item.post?.posted_at || "";
}

function getTopicPost(item) {
    const mediaIndex = item.media_index;
    if (mediaIndex === null || mediaIndex === undefined || mediaIndex === "") {
        return item.post;
    }

    const mediaItems = item.post?.media_urls || [];
    const selectedMedia = mediaItems[Number(mediaIndex)];
    if (!selectedMedia) return item.post;

    return {
        ...item.post,
        media_urls: [selectedMedia],
        media_url: selectedMedia.url || item.post.media_url,
    };
}

export default function TopicDetail() {
    const { topicId } = useParams();
    const [topic, setTopic] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const res = await getTopic(topicId);
                setTopic(res.data.topic);
            } catch (err) {
                console.error("Load special failed:", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [topicId]);

    const items = useMemo(() => {
        return [...(topic?.items || [])].sort((a, b) => {
            const orderDiff = (a.sort_order || 0) - (b.sort_order || 0);
            if (orderDiff !== 0) return orderDiff;

            const at = getSortTime(a);
            const bt = getSortTime(b);
            return at.localeCompare(bt);
        });
    }, [topic]);

    if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
    if (!topic) return <div style={{ padding: 20 }}>Special not found.</div>;

    return (
        <div className="topic-detail-container">
            <Link to={ROUTES.topics} className="topic-detail-back">↩ Back to Specials</Link>

            <div className="topic-detail-header">
                {topic.cover_url && (
                    <img src={topic.cover_url} alt={topic.title} className="topic-detail-cover" />
                )}

                <div>
                    <h1 className="topic-detail-title">{topic.title}</h1>
                    {topic.original_title && (
                        <div className="topic-detail-original">{topic.original_title}</div>
                    )}
                    {formatTopicDateRange(topic) && (
                        <div className="topic-detail-original">{formatTopicDateRange(topic)}</div>
                    )}
                    {topic.description && (
                        <p className="topic-detail-desc">{topic.description}</p>
                    )}

                    <div className="topic-actions">
                        <Link to={ROUTES.editTopic(topic.id)}>
                            <button>Edit</button>
                        </Link>
                        <button
                            className="btn-delete"
                            onClick={async () => {
                                if (confirm("Delete this special?")) {
                                    await deleteTopic(topic.id);
                                    window.location.href = ROUTES.topics;
                                }
                            }}
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>

            <div className="topic-timeline">
                {items.map((item) => (
                    <div className="topic-timeline-item" key={item.id}>
                        <div className="topic-timeline-time">
                            <strong>{formatDateTime(item.happened_at || item.post?.posted_at)}</strong>
                            {item.label && <div>{item.label}</div>}
                            {item.note && <div className="topic-timeline-note">{item.note}</div>}
                        </div>

                        <PostCard post={getTopicPost(item)} showReplies={item.show_replies ?? true} />
                    </div>
                ))}

                {items.length === 0 && <p>No posts added yet.</p>}
            </div>

            <Link to={ROUTES.editTopic(topic.id)}>
                <button className="fab-button topic-edit-fab">Edit</button>
            </Link>
        </div>
    );
}
