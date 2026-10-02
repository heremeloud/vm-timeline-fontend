import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { deleteTopic, getAdminTopic, getTopic, updateTopicItemTime } from "../api/topicsService";
import { ROUTES } from "../routes";
import PostCard from "../components/PostCard";
import { Button, ButtonLink } from "../ui";
import type { Id, Post, Topic, TopicItem } from "../types/models";
import "../styles/Home.css";
import "../styles/Topics.css";

function formatDateTime(value?: string | null) {
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

function formatTopicDateRange(topic?: Pick<Topic, "start_date" | "end_date"> | null) {
    if (!topic?.start_date && !topic?.end_date) return "";
    if (topic.start_date && topic.end_date && topic.start_date !== topic.end_date) {
        return `${topic.start_date} - ${topic.end_date}`;
    }
    return topic.start_date || topic.end_date || "";
}

function getSortTime(item: TopicItem) {
    return item.happened_at || item.post?.posted_at || "";
}

function getTopicPost(item: TopicItem): Post {
    const selectedIndexes = item.media_indices?.length
        ? item.media_indices
        : item.media_index !== null && item.media_index !== undefined
            ? [Number(item.media_index)]
            : [];

    if (selectedIndexes.length === 0) {
        return item.post;
    }

    const mediaItems = item.post?.media_urls || [];
    const selectedMediaItems = selectedIndexes
        .map((index) => mediaItems[Number(index)])
        .filter((mediaItem) => Boolean(mediaItem));

    if (selectedMediaItems.length === 0) return item.post;

    return {
        ...item.post,
        media_urls: selectedMediaItems,
        media_url: selectedMediaItems[0]?.url || item.post.media_url,
    };
}

function getDateTimeInputValue(item: TopicItem) {
    if (item.happened_at) return item.happened_at;
    if (item.post?.posted_at) return `${item.post.posted_at.slice(0, 10)}T00:00`;
    return "";
}

export default function TopicDetail() {
    const { topicId } = useParams();
    const isAdmin = !!localStorage.getItem("jwt");
    const [topic, setTopic] = useState<Topic | null>(null);
    const [loading, setLoading] = useState(true);
    const [editingTimeId, setEditingTimeId] = useState<Id | null>(null);
    const [timeDraft, setTimeDraft] = useState("");
    const [savingTimeId, setSavingTimeId] = useState<Id | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const res = await (isAdmin ? getAdminTopic(topicId ?? "") : getTopic(topicId ?? ""));
                setTopic(res.data.topic);
            } catch (err) {
                console.error("Load special failed:", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [topicId, isAdmin]);

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

    async function saveApproxTime(item: TopicItem) {
        setSavingTimeId(item.id);

        try {
            const nextTime = timeDraft.trim() || null;
            await updateTopicItemTime(item.id, { happened_at: nextTime });

            setTopic((current) => current && ({
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
            <Link to={ROUTES.topics} className="detail-back-control">← Back to Specials</Link>

            <div className="topic-detail-header">
                {topic.cover_url && (
                    <img src={topic.cover_url} alt={topic.title} className="topic-detail-cover" />
                )}

                <div className="topic-detail-info">
                    <h1 className="topic-detail-title">{topic.title}</h1>
                    {formatTopicDateRange(topic) && (
                        <div className="topic-detail-original">{formatTopicDateRange(topic)}</div>
                    )}
                    {topic.description && (
                        <p className="topic-detail-desc">{topic.description}</p>
                    )}

                    {isAdmin && (
                        <div className="topic-actions">
                            <ButtonLink to={ROUTES.editTopic(topic.id)} variant="primary" size="small">Edit</ButtonLink>
                            <Button
                                variant="danger"
                                size="small"
                                onClick={async () => {
                                    if (confirm("Delete this special?")) {
                                        await deleteTopic(topic.id);
                                        window.location.href = ROUTES.topics;
                                    }
                                }}
                            >
                                Delete
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="topic-timeline">
                {items.map((item) => (
                    <div
                        className={`topic-timeline-item${editingTimeId === item.id ? " topic-timeline-item-time-editing" : ""}`}
                        key={item.id}
                    >
                        <div className="topic-timeline-time">
                            {isAdmin && editingTimeId === item.id ? (
                                <div className="topic-time-editor">
                                    <input
                                        type="datetime-local"
                                        value={timeDraft}
                                        onChange={(e) => setTimeDraft(e.target.value)}
                                    />
                                    <div className="topic-time-editor-actions">
                                        <Button
                                            variant="save"
                                            size="small"
                                            onClick={() => saveApproxTime(item)}
                                            disabled={savingTimeId === item.id}
                                        >
                                            Save
                                        </Button>
                                        <Button
                                            size="small"
                                            onClick={() => {
                                                setEditingTimeId(null);
                                                setTimeDraft("");
                                            }}
                                            disabled={savingTimeId === item.id}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <strong>{formatDateTime(item.happened_at || item.post?.posted_at)}</strong>
                                    {isAdmin && (
                                        <Button
                                            variant="primary"
                                            size="small"
                                            className="topic-time-edit-button"
                                            onClick={() => {
                                                setEditingTimeId(item.id);
                                                setTimeDraft(getDateTimeInputValue(item));
                                            }}
                                        >
                                            Edit time
                                        </Button>
                                    )}
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

        </div>
    );
}
