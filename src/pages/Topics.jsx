import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTopics } from "../api/topicsService";
import { ROUTES } from "../routes";
import { formatCardDateRange } from "../utils/cardDate";
import "../styles/Home.css";
import "../styles/Topics.css";

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
                <h1 style={{ marginTop: "0.2rem" }}>🤎Specials🤍</h1>
                <p>Little timelines of the moments that matter</p>
                <p><strong>- work in progress - </strong></p>
                <hr />
            </div>

            <div className="topic-grid">
                {topics.map((topic) => (
                    <Link key={topic.id} to={ROUTES.topicDetail(topic.slug || topic.id)} className="topic-card">
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
