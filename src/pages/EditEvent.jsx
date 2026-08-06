import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getAdminEvent, updateEvent, getEvents } from "../api/eventsService";
import { getAuthors } from "../api/authorsService";
import { getProjects } from "../api/projectsService";
import { ROUTES } from "../routes";
import FocalPointPicker from "../components/FocalPointPicker";
import "../styles/EventForm.css";
import { EVENT_CATEGORIES, EVENT_SUBCATEGORIES, formatEventSubcategory } from "../constants/eventCategories";
import { cleanPastedSocialUrls, normalizeSocialPostUrl } from "../utils/postUrls";
import { formatEventDateRange, getEventStartDate } from "../utils/eventDateRange";
import EventMediaFields, { cleanEventMediaItems, normalizeEventMediaItems } from "../components/EventMediaFields";

const DEFAULT_TAG_OPTIONS = [
    { key: "viewmim", label: "ViewMim", value: "ViewMim", defaultChecked: false, row: "couple" },
    { key: "viewmim-th", label: "วิวมิ้ม", value: "วิวมิ้ม", defaultChecked: false, row: "couple" },
    { key: "vimmy", label: "VIMMY", value: "VIMMY", defaultChecked: false, row: "couple" },
    { key: "viewbenyapa", label: "viewbenyapa", value: "viewbenyapa", defaultChecked: false, row: "view" },
    { key: "view-th", label: "วิวเบญญาภา", value: "วิวเบญญาภา", defaultChecked: false, row: "view" },
    { key: "view-fandom", label: "สระอิของวว", value: "สระอิของวว", defaultChecked: false, row: "view" },
    { key: "mimrattanawadee", label: "mimrattanawadee", value: "mimrattanawadee", defaultChecked: false, row: "mim" },
    { key: "mim-th", label: "มิ้มรัตนวดี", value: "มิ้มรัตนวดี", defaultChecked: false, row: "mim" },
    { key: "mim-fandom", label: "ด้อมเป็ดจิ๋ว", value: "ด้อมเป็ดจิ๋ว", defaultChecked: false, row: "mim" },
];

const getLocalToday = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60 * 1000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

export default function EditEvent() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const routerLocation = useLocation();
    const [searchParams] = useSearchParams();
    const returnTo = routerLocation.state?.returnTo || searchParams.get("returnTo");
    const safeReturnTo = returnTo?.startsWith("/") && !returnTo.startsWith("//")
        ? returnTo
        : ROUTES.events;

    const [loading, setLoading] = useState(true);
    const [authors, setAuthors] = useState([]);

    // Form fields
    const [name, setName] = useState("");
    const [englishName, setEnglishName] = useState("");
    const [category, setCategory] = useState("");
    const [subcategory, setSubcategory] = useState("");
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
    const [liveMediaItems, setLiveMediaItems] = useState(() => normalizeEventMediaItems());
    const [selectedAuthorIds, setSelectedAuthorIds] = useState([]);
    const [projectId, setProjectId] = useState("");
    const [projects, setProjects] = useState([]);
    const [parentEventId, setParentEventId] = useState("");
    const [pressTours, setPressTours] = useState([]);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const [aRes, eRes, pRes, ptRes] = await Promise.all([
                    getAuthors(),
                    getAdminEvent(eventId),
                    getProjects(),
                    getEvents({ category: "press tour", limit: 200, offset: 0, sort: "newest" }),
                ]);

                if (cancelled) return;

                setAuthors(aRes.data || []);
                setProjects(pRes.data || []);
                setPressTours(ptRes.data || []);

                const ev = eRes.data?.event;
                if (!ev) throw new Error("Event not found");

                setName(ev.name || "");
                setEnglishName(ev.english_name || "");
                setCategory(ev.category || "");
                setSubcategory(ev.subcategory || "");
                setLocation(ev.location || "");
                setKeyword(ev.keyword || "");
                setMediaURL(ev.media_url || "");
                setMediaFocalX(ev.media_focal_x ?? 50);
                setMediaFocalY(ev.media_focal_y ?? 50);
                setStartDate(getEventStartDate(ev));
                setEndDate(ev.end_date || "");
                setAnnouncementURLsInput((ev.announcement_urls || []).join("\n"));
                setPrivateNotes(ev.private_notes || "");
                setLiveMediaItems(normalizeEventMediaItems(ev.live_media_items || ev.live_urls));

                const tags = ev.tags || [];
                const defaultTagByValue = new Map(
                    DEFAULT_TAG_OPTIONS.map((tag) => [tag.value.toLowerCase(), tag])
                );
                const selectedDefaultTags = Object.fromEntries(
                    DEFAULT_TAG_OPTIONS.map((tag) => [tag.key, false])
                );
                const otherTags = tags.filter((t) => {
                    const defaultTag = defaultTagByValue.get(t.toLowerCase());
                    if (!defaultTag) return true;
                    selectedDefaultTags[defaultTag.key] = true;
                    return false;
                });
                setDefaultTags(selectedDefaultTags);
                setTagsInput(otherTags.join(", "));

                const ids = (ev.authors || []).map((x) => x.id);
                setSelectedAuthorIds(ids);
                setProjectId(ev.project_id ? String(ev.project_id) : "");
                setParentEventId(ev.parent_event_id ? String(ev.parent_event_id) : "");

                setLoading(false);
            } catch (err) {
                console.error("EditEvent load error:", err);
                alert("Failed to load event.");
                navigate(ROUTES.events);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [eventId, navigate]);

    const tags = useMemo(() => {
        const base = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
        const defaults = DEFAULT_TAG_OPTIONS
            .filter((tag) => defaultTags[tag.key])
            .map((tag) => tag.value);
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

    async function save(e) {
        e.preventDefault();

        if (!name.trim()) {
            alert("Event name is required.");
            return;
        }

        try {
            await updateEvent(eventId, {
                name: name.trim(),
                english_name: englishName.trim() || null,
                category: category || null,
                subcategory: subcategory || null,
                location: location.trim() || null,
                keyword: keyword.trim() || null,
                tags,
                media_url: mediaURL.trim() || null,
                media_focal_x: mediaURL.trim() ? mediaFocalX : null,
                media_focal_y: mediaURL.trim() ? mediaFocalY : null,
                start_date: startDate || null,
                end_date: endDate || null,
                announcement_urls: announcementURLsInput.split("\n").map(normalizeSocialPostUrl).filter(Boolean),
                private_notes: privateNotes.trim() || null,
                live_media_items: cleanEventMediaItems(liveMediaItems),
                author_ids: selectedAuthorIds,
                project_id: projectId ? Number(projectId) : null,
                parent_event_id: parentEventId ? Number(parentEventId) : null,
            });
            navigate(safeReturnTo, { replace: true });
        } catch (err) {
            console.error("EditEvent save error:", err);
            alert("Failed to save event: " + (err.response?.data?.detail || err.message));
        }
    }

    if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

    return (
        <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
            <h2>Edit Event #{eventId}</h2>

            <form id="edit-event-form" className="eventform-form" onSubmit={save}>

                <div className="eventform-section">
                    <label>Event Name / Thai Name <span className="form-required">*</span></label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                <div className="eventform-section">
                    <label>English Event Name <span className="form-optional">(optional)</span></label>
                    <input
                        value={englishName}
                        onChange={(e) => setEnglishName(e.target.value)}
                        placeholder="Shown on the public events list"
                    />
                </div>

                <div className="eventform-section">
                    <div className="eventform-event-date-fields">
                        <div>
                            <label>Start Date <span className="form-optional">(optional)</span></label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label>End Date <span className="form-optional">(optional)</span></label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <label className="eventform-today-toggle">
                            <input
                                type="checkbox"
                                checked={startDate === getLocalToday()}
                                onChange={(e) => setStartDate(e.target.checked ? getLocalToday() : "")}
                            />
                            Today
                        </label>
                    </div>
                </div>

                <div className="eventform-section">
                    <label>Category <span className="form-optional">(optional)</span></label>
                    <select
                        value={category}
                        onChange={(e) => {
                            setCategory(e.target.value);
                            setSubcategory("");
                        }}
                    >
                        <option value="">-- None --</option>
                        {EVENT_CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </div>

                {EVENT_SUBCATEGORIES[category]?.length > 0 && (
                    <div className="eventform-section">
                        <label>Subcategory <span className="form-optional">(optional)</span></label>
                        <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
                            <option value="">-- None --</option>
                            {EVENT_SUBCATEGORIES[category].map((value) => (
                                <option key={value} value={value}>
                                    {formatEventSubcategory(value)}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="eventform-section">
                    <label>Location <span className="form-optional">(optional)</span></label>
                    <input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                    />
                </div>

                <div className="eventform-section">
                    <label>Keyword <span className="form-optional">(optional)</span></label>
                    <input
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                    />
                </div>

                <div className="eventform-section">
                    <label>Tags <span className="form-optional">(optional, comma separated)</span></label>
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
                    <label>Event Photo URL <span className="form-optional">(optional)</span></label>
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
                    <label>Announcement URLs <span className="form-optional">(optional, private, one per line)</span></label>
                    <textarea
                        value={announcementURLsInput}
                        onChange={(e) => setAnnouncementURLsInput(e.target.value)}
                        onPaste={(e) => cleanPastedSocialUrls(e, setAnnouncementURLsInput)}
                        placeholder={"https://...\nhttps://..."}
                        style={{ minHeight: 80 }}
                    />
                </div>

                <div className="eventform-section">
                    <label>Private Notes <span className="form-optional">(optional, not shown publicly)</span></label>
                    <textarea
                        value={privateNotes}
                        onChange={(e) => setPrivateNotes(e.target.value)}
                        placeholder="Notes for your own reference..."
                        style={{ minHeight: 120 }}
                    />
                </div>

                <EventMediaFields items={liveMediaItems} onChange={setLiveMediaItems} />

                <div className="eventform-section">
                    <label>Part of Press Tour <span className="form-optional">(optional)</span></label>
                    <select value={parentEventId} onChange={(e) => setParentEventId(e.target.value)}>
                        <option value="">-- None --</option>
                        {pressTours.filter(pt => String(pt.id) !== eventId).map((pt) => (
                            <option key={pt.id} value={pt.id}>{pt.name}{formatEventDateRange(pt) ? ` (${formatEventDateRange(pt)})` : ""}</option>
                        ))}
                    </select>
                </div>

                <div className="eventform-section">
                    <label>Linked Project <span className="form-optional">(optional)</span></label>
                    <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                        <option value="">-- None --</option>
                        {projects.map((p) => (
                            <option key={p.id} value={p.id}>{p.title}{p.year ? ` (${p.year})` : ""}</option>
                        ))}
                    </select>
                </div>

                <div className="eventform-section">
                    <label>Participants</label>
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

                <div className="eventform-section">
                    <button type="submit" className="form-primary-submit">Save Changes</button>
                </div>

            </form>
        </div>
    );
}
