import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createEvent, getEvents } from "../api/eventsService";
import { getAuthors } from "../api/authorsService";
import { getProjects } from "../api/projectsService";
import { ROUTES } from "../routes";
import FocalPointPicker from "../components/FocalPointPicker";
import "../styles/EventForm.css";
import { EVENT_CATEGORIES } from "../constants/eventCategories";
import { formatEventDateRange } from "../utils/eventDateRange";

const DEFAULT_TAG_OPTIONS = [
    { key: "viewmim", label: "ViewMim", value: "ViewMim", defaultChecked: true, row: "couple" },
    { key: "viewmim-th", label: "วิวมิ้ม", value: "วิวมิ้ม", defaultChecked: true, row: "couple" },
    { key: "vimmy", label: "VIMMY", value: "VIMMY", defaultChecked: false, row: "couple" },
    { key: "viewbenyapa", label: "viewbenyapa", value: "viewbenyapa", defaultChecked: false, row: "view" },
    { key: "view-th", label: "วิวเบญญาภา", value: "วิวเบญญาภา", defaultChecked: false, row: "view" },
    { key: "view-fandom", label: "สระอิของวว", value: "สระอิของวว", defaultChecked: false, row: "view" },
    { key: "mimrattanawadee", label: "mimrattanawadee", value: "mimrattanawadee", defaultChecked: false, row: "mim" },
    { key: "mim-th", label: "มิ้มรัตนวดี", value: "มิ้มรัตนวดี", defaultChecked: false, row: "mim" },
    { key: "mim-fandom", label: "ด้อมเป็ดจิ๋ว", value: "ด้อมเป็ดจิ๋ว", defaultChecked: false, row: "mim" },
];

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
    const [defaultTags, setDefaultTags] = useState(() =>
        Object.fromEntries(DEFAULT_TAG_OPTIONS.map((tag) => [tag.key, tag.defaultChecked]))
    );
    const [mediaURL, setMediaURL] = useState("");
    const [mediaFocalX, setMediaFocalX] = useState(50);
    const [mediaFocalY, setMediaFocalY] = useState(50);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [announcementURLsInput, setAnnouncementURLsInput] = useState("");
    const [privateNotes, setPrivateNotes] = useState("");
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
        const defaults = DEFAULT_TAG_OPTIONS
            .filter((tag) => defaultTags[tag.key])
            .map((tag) => tag.value);
        // merge, keeping order, no duplicates
        const seen = new Set(base.map((t) => t.toLowerCase()));
        for (const d of defaults) {
            if (!seen.has(d.toLowerCase())) base.push(d);
        }
        return base;
    }, [tagsInput, defaultTags]);

    function toggleAuthor(id) {
        setSelectedAuthorIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    }

    function toggleDefaultTag(key) {
        setDefaultTags((prev) => ({ ...prev, [key]: !prev[key] }));
    }

    function renderDefaultTagRow(row) {
        return (
            <div style={{ display: "flex", gap: 20, marginTop: 8, flexWrap: "wrap" }}>
                {DEFAULT_TAG_OPTIONS.filter((tag) => tag.row === row).map((tag) => (
                    <label key={tag.key} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontWeight: 400 }}>
                        <input
                            type="checkbox"
                            checked={!!defaultTags[tag.key]}
                            onChange={() => toggleDefaultTag(tag.key)}
                        />
                        <span>Add <strong>{tag.label}</strong></span>
                    </label>
                ))}
            </div>
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
                media_focal_x: mediaURL.trim() ? mediaFocalX : null,
                media_focal_y: mediaURL.trim() ? mediaFocalY : null,
                start_date: startDate || null,
                end_date: endDate || null,
                announcement_urls: announcementURLsInput.split("\n").map(u => u.trim()).filter(Boolean),
                private_notes: privateNotes.trim() || null,
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
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            style={{ width: 180 }}
                        />
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            style={{ width: 180 }}
                        />
                    </div>
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

                    {renderDefaultTagRow("couple")}
                    {renderDefaultTagRow("view")}
                    {renderDefaultTagRow("mim")}
                </div>

                <div className="eventform-section">
                    <label>Event Photo URL (optional):</label>
                    <input
                        value={mediaURL}
                        onChange={(e) => setMediaURL(e.target.value)}
                        placeholder="https://..."
                    />
                    <FocalPointPicker
                        imageUrl={mediaURL.trim()}
                        x={mediaFocalX}
                        y={mediaFocalY}
                        onChange={(nx, ny) => {
                            setMediaFocalX(nx);
                            setMediaFocalY(ny);
                        }}
                    />
                </div>

                <div className="eventform-section">
                    <label>Announcement URLs (private, one per line):</label>
                    <textarea
                        value={announcementURLsInput}
                        onChange={(e) => setAnnouncementURLsInput(e.target.value)}
                        placeholder={"https://...\nhttps://..."}
                        style={{ minHeight: 80 }}
                    />
                </div>

                <div className="eventform-section">
                    <label>Private Notes (not shown publicly):</label>
                    <textarea
                        value={privateNotes}
                        onChange={(e) => setPrivateNotes(e.target.value)}
                        placeholder="Notes for your own reference..."
                        style={{ minHeight: 120 }}
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
                            <option key={pt.id} value={pt.id}>{pt.name}{formatEventDateRange(pt) ? ` (${formatEventDateRange(pt)})` : ""}</option>
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
