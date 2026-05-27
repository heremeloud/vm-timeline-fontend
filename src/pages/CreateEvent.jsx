import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createEvent, getEvents } from "../api/eventsService";
import { getAuthors } from "../api/authorsService";
import { getProjects } from "../api/projectsService";
import { ROUTES } from "../routes";
import "../styles/EventForm.css";
import { EVENT_CATEGORIES } from "../constants/eventCategories";

export default function CreateEvent() {
    const navigate = useNavigate();

    const [authors, setAuthors] = useState([]);
    const [selectedAuthorIds, setSelectedAuthorIds] = useState([]);

    // Form fields
    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    const [location, setLocation] = useState("");
    const [keyword, setKeyword] = useState("");
    const [tagsInput, setTagsInput] = useState("");
    const [addViewMim, setAddViewMim] = useState(true);
    const [addViewMimTh, setAddViewMimTh] = useState(true);
    const [mediaURL, setMediaURL] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [announcementURL, setAnnouncementURL] = useState("");
    const [liveURLsInput, setLiveURLsInput] = useState("");
    const [projectId, setProjectId] = useState("");
    const [projects, setProjects] = useState([]);
    const [parentEventId, setParentEventId] = useState("");
    const [pressTours, setPressTours] = useState([]);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const [authRes, projRes, ptRes] = await Promise.all([
                    getAuthors(),
                    getProjects(),
                    getEvents({ category: "press tour", limit: 200, offset: 0, sort: "newest" }),
                ]);
                if (!cancelled) {
                    setAuthors(authRes.data || []);
                    setProjects(projRes.data || []);
                    setPressTours(ptRes.data || []);
                }
            } catch (err) {
                console.error("CreateEvent load error:", err);
                if (!cancelled) setAuthors([]);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, []);

    const tags = useMemo(() => {
        const base = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
        const defaults = [
            addViewMim ? "ViewMim" : null,
            addViewMimTh ? "วิวมิ้ม" : null,
        ].filter(Boolean);
        // merge, keeping order, no duplicates
        const seen = new Set(base.map((t) => t.toLowerCase()));
        for (const d of defaults) {
            if (!seen.has(d.toLowerCase())) base.push(d);
        }
        return base;
    }, [tagsInput, addViewMim, addViewMimTh]);

    function toggleAuthor(id) {
        setSelectedAuthorIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    }

    async function submit(e) {
        e.preventDefault();

        if (!name.trim()) {
            alert("Event name is required.");
            return;
        }

        try {
            await createEvent({
                name: name.trim(),
                category: category || null,
                location: location.trim() || null,
                keyword: keyword.trim() || null,
                tags,
                media_url: mediaURL.trim() || null,
                event_date: eventDate || null,
                announcement_url: announcementURL.trim() || null,
                live_urls: liveURLsInput.split("\n").map(u => u.trim()).filter(Boolean),
                author_ids: selectedAuthorIds,
                project_id: projectId ? Number(projectId) : null,
                parent_event_id: parentEventId ? Number(parentEventId) : null,
            });

            navigate(ROUTES.events);
        } catch (err) {
            console.error("CreateEvent submit error:", err);
            alert("Error creating event. Check console for details.");
        }
    }

    return (
        <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
            <h2>Create Event</h2>

            <form className="eventform-form" onSubmit={submit}>

                <div className="eventform-section">
                    <label>Event Name: *</label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="fan meeting, concert, etc."
                    />
                </div>

                <div className="eventform-section">
                    <label>Event Date (optional):</label>
                    <input
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        style={{ width: 180 }}
                    />
                </div>

                <div className="eventform-section">
                    <label>Category (optional):</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                    >
                        <option value="">— None —</option>
                        {EVENT_CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </div>

                <div className="eventform-section">
                    <label>Location (optional):</label>
                    <input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                    />
                </div>

                <div className="eventform-section">
                    <label>Keyword (optional):</label>
                    <input
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                    />
                </div>

                <div className="eventform-section">
                    <label>Tags (comma separated):</label>
                    <input
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        placeholder="bkk, stage, live"
                    />

                    <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontWeight: 400 }}>
                            <input
                                type="checkbox"
                                checked={addViewMim}
                                onChange={(e) => setAddViewMim(e.target.checked)}
                            />
                            <span>Add <strong>ViewMim</strong></span>
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontWeight: 400 }}>
                            <input
                                type="checkbox"
                                checked={addViewMimTh}
                                onChange={(e) => setAddViewMimTh(e.target.checked)}
                            />
                            <span>Add <strong>วิวมิ้ม</strong></span>
                        </label>
                    </div>
                </div>

                <div className="eventform-section">
                    <label>Event Photo URL (optional):</label>
                    <input
                        value={mediaURL}
                        onChange={(e) => setMediaURL(e.target.value)}
                        placeholder="https://..."
                    />
                </div>

                <div className="eventform-section">
                    <label>Announcement URL (optional):</label>
                    <input
                        value={announcementURL}
                        onChange={(e) => setAnnouncementURL(e.target.value)}
                        placeholder="https://..."
                    />
                </div>

                <div className="eventform-section">
                    <label>Live URLs (optional, one per line):</label>
                    <textarea
                        value={liveURLsInput}
                        onChange={(e) => setLiveURLsInput(e.target.value)}
                        placeholder={"https://youtube.com/...\nhttps://..."}
                        style={{ minHeight: 80 }}
                    />
                </div>

                <div className="eventform-section">
                    <label>Part of Press Tour (optional):</label>
                    <select value={parentEventId} onChange={(e) => setParentEventId(e.target.value)}>
                        <option value="">— none —</option>
                        {pressTours.map((pt) => (
                            <option key={pt.id} value={pt.id}>{pt.name}{pt.event_date ? ` (${pt.event_date})` : ""}</option>
                        ))}
                    </select>
                </div>

                <div className="eventform-section">
                    <label>Linked Project (optional):</label>
                    <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                        <option value="">— none —</option>
                        {projects.map((p) => (
                            <option key={p.id} value={p.id}>{p.title}{p.year ? ` (${p.year})` : ""}</option>
                        ))}
                    </select>
                </div>

                <div className="eventform-section">
                    <label>Participants:</label>
                    <div className="eventform-participants-box">
                        {authors.map((a) => (
                            <label key={a.id} className="eventform-participant-item">
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

                <div className="eventform-section">
                    <button type="submit">Save Event</button>
                </div>

            </form>
        </div>
    );
}
