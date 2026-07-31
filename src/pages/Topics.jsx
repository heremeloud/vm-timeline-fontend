import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminTopics, getTopics, updateTopic } from "../api/topicsService";
import { ROUTES } from "../routes";
import { formatCardDateRange } from "../utils/cardDate";
import "../styles/Home.css";
import "../styles/Topics.css";

export default function Topics() {
    const [topics, setTopics] = useState([]);
    const [savingVisibilityId, setSavingVisibilityId] = useState(null);
    const isAdmin = !!localStorage.getItem("jwt");

    useEffect(() => {
        async function load() {
            try {
                const res = isAdmin ? await getAdminTopics() : await getTopics();
                setTopics(res.data || []);
            } catch (err) {
                console.error("Load specials failed:", err);
                setTopics([]);
            }
        }
        load();
    }, [isAdmin]);

    async function toggleVisibility(topic) {
        const nextValue = !topic.is_visible;
        setSavingVisibilityId(topic.id);
        try {
            await updateTopic(topic.id, { is_visible: nextValue });
            setTopics((current) => current.map((item) =>
                item.id === topic.id ? { ...item, is_visible: nextValue } : item
            ));
        } catch (err) {
            console.error("Special visibility update failed:", err);
            alert("Could not update this special's public visibility.");
        } finally {
            setSavingVisibilityId(null);
        }
    }

    return (
        <div className="home-container">
            <div className="home-header">
                <h1 style={{ marginBottom: "0.2rem" }}>ViewMim</h1>
                <h1 style={{ marginTop: "0.2rem" }}>🤎Specials🤍</h1>
                <p>Little timelines of the moments that matter</p>
                <p><strong>- work in progress - </strong></p>
                <hr />
            </div>

            <div className="topic-grid">
                {topics.map((topic) => (
                    <div key={topic.id} className={`topic-card-shell ${isAdmin ? "topic-card-shell--admin" : ""}`.trim()}>
                    <Link to={ROUTES.topicDetail(topic.slug || topic.id)} className="topic-card">
                        <div className="topic-card-thumb">
                            {topic.cover_url
                                ? <img src={topic.cover_url} alt={topic.title} />
                                : <div className="topic-card-placeholder">Special</div>
                            }
                        </div>
                        <div className="topic-card-body">
                            <div className="topic-card-title">{topic.title}</div>
                            {formatCardDateRange(topic) && (
                                <div className="topic-card-meta topic-card-date">{formatCardDateRange(topic)}</div>
                            )}
                            {topic.description && (
                                <div className="topic-card-meta">{topic.description}</div>
                            )}
                        </div>
                    </Link>
                    {isAdmin && (
                        <label className="topic-visibility-toggle" title={topic.is_visible ? "Visible to the public" : "Hidden from the public"}>
                            <input
                                type="checkbox"
                                checked={topic.is_visible !== false}
                                disabled={savingVisibilityId === topic.id}
                                onChange={() => toggleVisibility(topic)}
                                aria-label={`Show ${topic.title} to the public`}
                            />
                            <span>{savingVisibilityId === topic.id ? "Saving…" : "Public"}</span>
                        </label>
                    )}
                    </div>
                ))}
            </div>

            {isAdmin && (
                <Link to={ROUTES.createTopic}>
                    <button className="fab-button">+</button>
                </Link>
            )}
        </div>
    );
}
