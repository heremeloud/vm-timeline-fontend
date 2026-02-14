import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/api";
import "../styles/EventForm.css";

export default function EditEvent() {
    const { eventId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [authors, setAuthors] = useState([]);

    // Form fields
    const [name, setName] = useState("");
    const [location, setLocation] = useState("");
    const [keyword, setKeyword] = useState("");
    const [tagsInput, setTagsInput] = useState("");
    const [mediaURL, setMediaURL] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [announcementURL, setAnnouncementURL] = useState("");
    const [liveURL, setLiveURL] = useState(""); 
    const [selectedAuthorIds, setSelectedAuthorIds] = useState([]);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const [aRes, eRes] = await Promise.all([
                    api.get("/authors/"),
                    api.get(`/events/${eventId}`),
                ]);

                if (cancelled) return;

                setAuthors(aRes.data || []);

                const ev = eRes.data?.event;
                if (!ev) throw new Error("Event not found");

                setName(ev.name || "");
                setLocation(ev.location || "");
                setKeyword(ev.keyword || "");
                setMediaURL(ev.media_url || "");
                setEventDate(ev.event_date || "");
                setAnnouncementURL(ev.announcement_url || "");
                setLiveURL(ev.live_url || ""); 

                const tags = ev.tags || [];
                setTagsInput(tags.join(", "));

                const ids = (ev.authors || []).map((x) => x.id);
                setSelectedAuthorIds(ids);

                setLoading(false);
            } catch (err) {
                console.error("EditEvent load error:", err);
                alert("Failed to load event.");
                navigate("/events");
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [eventId, navigate]);

    const tags = useMemo(() => {
        return tagsInput
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
    }, [tagsInput]);

    function toggleAuthor(id) {
        setSelectedAuthorIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    }

    async function save(e) {
        e.preventDefault();

        if (!name.trim()) {
            alert("Event name is required.");
            return;
        }

        try {
            await api.patch(`/events/${eventId}`, {
                name: name.trim(),
                location: location.trim() || null,
                keyword: keyword.trim() || null,
                tags,
                media_url: mediaURL.trim() || null,
                event_date: eventDate || null,
                announcement_url: announcementURL.trim() || null,
                live_url: liveURL.trim() || null, 
                author_ids: selectedAuthorIds,
            });

            navigate("/events");
        } catch (err) {
            console.error("EditEvent save error:", err);
            alert("Failed to save event. Check console for details.");
        }
    }

    if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

    return (
        <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
            <h2>Edit Event #{eventId}</h2>

            <form onSubmit={save}>
                <label>Event Name: *</label>
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ width: "100%" }}
                />

                <br />
                <br />

                <label>Event Date (optional):</label>
                <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                />

                <br />
                <br />

                <label>Location (optional):</label>
                <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    style={{ width: "100%" }}
                />

                <br />
                <br />

                <label>Keyword (optional):</label>
                <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    style={{ width: "100%" }}
                />

                <br />
                <br />

                <label>Tags (comma separated):</label>
                <input
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="bkk, stage, live"
                    style={{ width: "100%" }}
                />

                <br />
                <br />

                <label>Event Photo URL (optional):</label>
                <input
                    value={mediaURL}
                    onChange={(e) => setMediaURL(e.target.value)}
                    placeholder="https://..."
                    style={{ width: "100%" }}
                />

                <br />
                <br />

                <label>Announcement URL (optional):</label>
                <input
                    value={announcementURL}
                    onChange={(e) => setAnnouncementURL(e.target.value)}
                    placeholder="https://..."
                    style={{ width: "100%" }}
                />

                <br />
                <br />

                <label>Live URL (optional):</label>
                <input
                    value={liveURL}
                    onChange={(e) => setLiveURL(e.target.value)}
                    placeholder="https://youtube.com/... (or any live link)"
                    style={{ width: "100%" }}
                />

                <br />
                <br />

                <div className="eventform-section">
                    <label>Participants:</label>

                    <div className="eventform-participants-box">
                        {authors.map((a) => (
                            <label
                                key={a.id}
                                className="eventform-participant-item"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedAuthorIds.includes(a.id)}
                                    onChange={() => toggleAuthor(a.id)}
                                />
                                <span>{a.name}</span>
                            </label>
                        ))}

                        {authors.length === 0 && (
                            <div style={{ opacity: 0.6 }}>
                                No authors available.
                            </div>
                        )}
                    </div>
                </div>

                <br />

                <button type="submit">Save Changes</button>
            </form>
        </div>
    );
}
