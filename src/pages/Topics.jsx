import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTopics } from "../api/topicsService";
import { ROUTES } from "../routes";
import "../styles/Home.css";
import "../styles/Topics.css";

function formatTopicDateRange(topic) {
    if (!topic.start_date && !topic.end_date) return "";
    if (topic.start_date && topic.end_date && topic.start_date !== topic.end_date) {
        return `${topic.start_date} - ${topic.end_date}`;
    }
    return topic.start_date || topic.end_date || "";
}

export default function Topics() {
    const [topics, setTopics] = useState([]);
    const isAdmin = !!localStorage.getItem("jwt");

    useEffect(() => {
        async function load() {
            try {
                const res = await getTopics();
                setTopics(res.data || []);
            } catch (err) {
                console.error("Load specials failed:", err);
                setTopics([]);
            }
        }
        load();
    }, []);

    return (
        <div className="home-container">
            <div className="home-header">
                <h1 style={{ marginBottom: "0.2rem" }}>ViewMim</h1>
                <h1 style={{ marginTop: "0.2rem" }}>🤎Special🤍</h1>
                <p>Little timelines of the moments that matter</p>
                <p><strong>- work in progress - </strong></p>
                <hr />
            </div>

            <div className="topic-grid">
                {topics.map((topic) => (
                    <Link key={topic.id} to={ROUTES.topicDetail(topic.id)} className="topic-card">
                        <div className="topic-card-thumb">
                            {topic.cover_url
                                ? <img src={topic.cover_url} alt={topic.title} />
                                : <div className="topic-card-placeholder">Special</div>
                            }
                        </div>
                        <div className="topic-card-body">
                            <div className="topic-card-title">{topic.title}</div>
                            {formatTopicDateRange(topic) && (
                                <div className="topic-card-meta">{formatTopicDateRange(topic)}</div>
                            )}
                            {topic.original_title && (
                                <div className="topic-card-meta">{topic.original_title}</div>
                            )}
                            {topic.description && (
                                <div className="topic-card-meta">{topic.description}</div>
                            )}
                        </div>
                    </Link>
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
