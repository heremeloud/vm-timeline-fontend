import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { deleteTopic, getTopic, updateTopicItemTime } from "../api/topicsService";
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

function getDateTimeInputValue(item) {
    if (item.happened_at) return item.happened_at;
    if (item.post?.posted_at) return `${item.post.posted_at.slice(0, 10)}T00:00`;
    return "";
}

export default function TopicDetail() {
    const { topicId } = useParams();
    const [topic, setTopic] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editingTimeId, setEditingTimeId] = useState(null);
    const [timeDraft, setTimeDraft] = useState("");
    const [savingTimeId, setSavingTimeId] = useState(null);

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

    async function saveApproxTime(item) {
        setSavingTimeId(item.id);

        try {
            const nextTime = timeDraft.trim() || null;
            await updateTopicItemTime(item.id, { happened_at: nextTime });

            setTopic((current) => ({
                ...current,
                items: (current.items || []).map((row) =>
                    row.id === item.id ? { ...row, happened_at: nextTime } : row
                ),
            }));
            setEditingTimeId(null);
            setTimeDraft("");
        } catch (err) {
            console.error("Save approximate time failed:", err);
            alert("Could not save approximate time.");
        } finally {
            setSavingTimeId(null);
        }
    }

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
                            {editingTimeId === item.id ? (
                                <div style={{ display: "grid", gap: 6 }}>
                                    <input
                                        type="datetime-local"
                                        value={timeDraft}
                                        onChange={(e) => setTimeDraft(e.target.value)}
                                        style={{ width: "100%", boxSizing: "border-box" }}
                                    />
                                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                        <button
                                            type="button"
                                            onClick={() => saveApproxTime(item)}
                                            disabled={savingTimeId === item.id}
                                        >
                                            Save
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingTimeId(null);
                                                setTimeDraft("");
                                            }}
                                            disabled={savingTimeId === item.id}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <strong>{formatDateTime(item.happened_at || item.post?.posted_at)}</strong>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingTimeId(item.id);
                                            setTimeDraft(getDateTimeInputValue(item));
                                        }}
                                        style={{ marginTop: 6, fontSize: "0.8rem" }}
                                    >
                                        Edit time
                                    </button>
                                </>
                            )}
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
