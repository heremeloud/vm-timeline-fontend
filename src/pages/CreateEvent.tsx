import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createEvent, getEvents } from "../api/eventsService";
import { getAuthors } from "../api/authorsService";
import { getProjects } from "../api/projectsService";
import { ROUTES } from "../routes";
import EventPhotoFields from "../components/EventPhotoFields";
import { cleanEventPhotos } from "../utils/eventPhotos";
import "../styles/EventForm.css";
import useEventCategories from "../hooks/useEventCategories";
import { cleanPastedSocialUrls, normalizeSocialPostUrl } from "../utils/postUrls";
import { formatEventDateRange } from "../utils/eventDateRange";
import EventMediaFields, { cleanEventMediaItems, normalizeEventMediaItems } from "../components/EventMediaFields";
import { cleanEventDateItems, emptyEventDateItem } from "../utils/eventDateItems";
import { Button, Checkbox, FormField, Select, Textarea } from "../ui";
import DefaultTagRow from "../components/DefaultTagRow";
import { DEFAULT_TAG_OPTIONS } from "../constants/eventTags";
import { getLocalToday } from "../utils/dates";
import type { EventDateItemForm } from "../utils/eventDateItems";
import type { EventMediaItem } from "../components/EventMediaFields";
import type { Author, Event, EventPhoto, Id, Project } from "../types/models";

type DateMode = "range" | "dates";

export default function CreateEvent() {
    const navigate = useNavigate();
    const { categories: eventCategories } = useEventCategories();

    const [authors, setAuthors] = useState<Author[]>([]);
    const [selectedAuthorIds, setSelectedAuthorIds] = useState<Id[]>([]);

    // Form fields
    const [name, setName] = useState("");
    const [englishName, setEnglishName] = useState("");
    const [category, setCategory] = useState<string | null>(null);
    const [subcategory, setSubcategory] = useState("");
    const [location, setLocation] = useState("");
    const [keyword, setKeyword] = useState("");
    const [tagsInput, setTagsInput] = useState("");
    const [defaultTags, setDefaultTags] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(DEFAULT_TAG_OPTIONS.map((tag) => [tag.key, tag.defaultChecked]))
    );
    const [photos, setPhotos] = useState<EventPhoto[]>([{ url: "", focal_x: 50, focal_y: 50 }]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [dateMode, setDateMode] = useState<DateMode>("range");
    const [dateItems, setDateItems] = useState<EventDateItemForm[]>(() => [emptyEventDateItem()]);
    const dates = dateItems.map((item) => item.date);
    const [announcementURLsInput, setAnnouncementURLsInput] = useState("");
    const [publicAnnouncementUrl, setPublicAnnouncementUrl] = useState("");
    const [interviewContent, setInterviewContent] = useState("");
    const [showInterviewContent, setShowInterviewContent] = useState(false);
    const [privateNotes, setPrivateNotes] = useState("");
    const [liveMediaItems, setLiveMediaItems] = useState<EventMediaItem[]>(() => normalizeEventMediaItems());
    const [projectId, setProjectId] = useState("");
    const [projects, setProjects] = useState<Project[]>([]);
    const [parentEventId, setParentEventId] = useState("");
    const [pressTours, setPressTours] = useState<Event[]>([]);

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

    const selectedCategory = category ?? eventCategories.find((item) => item.is_default)?.value ?? "";
    const isInterview = selectedCategory.toLowerCase() === "interview" || subcategory.toLowerCase() === "interview";
    const subcategoryOptions = eventCategories.find((item) => item.value === selectedCategory)?.subcategories ?? [];
    const announcementUrls = useMemo(
        () => announcementURLsInput.split("\n").map(normalizeSocialPostUrl).filter(Boolean),
        [announcementURLsInput],
    );

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

    function toggleAuthor(id: Id) {
        setSelectedAuthorIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    }

    function toggleDefaultTag(key: string) {
        setDefaultTags((prev) => ({ ...prev, [key]: !prev[key] }));
    }

    async function submit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (!name.trim()) {
            alert("Event name is required.");
            return;
        }

        const invalidPhotoDate = photos.some(photo => photo.url.trim() && photo.date && (
            dateMode === "dates" ? !dates.includes(photo.date)
                : !startDate || photo.date < startDate || photo.date > (endDate || startDate)
        ));
        if (invalidPhotoDate) {
            alert("Each photo’s calendar date must be one of the event dates. Update or clear the photo date before saving.");
            return;
        }

        try {
            await createEvent({
                name: name.trim(),
                english_name: englishName.trim() || null,
                category: selectedCategory || null,
                subcategory: subcategory || null,
                location: location.trim() || null,
                keyword: keyword.trim() || null,
                tags,
                photo_items: cleanEventPhotos(photos),
                dates: dateMode === "dates" ? dates.filter(Boolean) : [],
                date_items: dateMode === "dates" ? cleanEventDateItems(dateItems) : [],
                start_date: dateMode === "range" ? startDate || null : null,
                end_date: dateMode === "range" ? endDate || null : null,
                announcement_urls: announcementUrls,
                public_announcement_url: announcementUrls.includes(normalizeSocialPostUrl(publicAnnouncementUrl))
                    ? normalizeSocialPostUrl(publicAnnouncementUrl)
                    : null,
                interview_content: interviewContent.trim() || null,
                show_interview_content: Boolean(interviewContent.trim()) && showInterviewContent,
                private_notes: privateNotes.trim() || null,
                live_media_items: cleanEventMediaItems(liveMediaItems, dateMode === "dates" ? dates : []),
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
                    <label>Event Name / Thai Name <span className="form-required">*</span></label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="fan meeting, concert, etc."
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
                    <label>Date selection</label>
                    <select value={dateMode} onChange={e => setDateMode(e.target.value as DateMode)}>
                        <option value="range">Single date or date range</option>
                        <option value="dates">Separate dates</option>
                    </select>
                    {dateMode === "dates" ? (
                        <div>
                            {dateItems.map((item, index) => (
                                <div className="eventform-date-row eventform-date-row--event-occurrence" key={index}>
                                    <input type="date" aria-label={`Event date ${index + 1}`} value={item.date}
                                        onChange={e => setDateItems(dateItems.map((row, i) => i === index ? { ...row, date: e.target.value } : row))} />
                                    <input aria-label={`Keyword for event date ${index + 1}`} value={item.keyword}
                                        placeholder="Keyword (optional)"
                                        onChange={e => setDateItems(dateItems.map((row, i) => i === index ? { ...row, keyword: e.target.value } : row))} />
                                    <input aria-label={`Hashtag for event date ${index + 1}`} value={item.hashtag}
                                        placeholder="Hashtag (optional)"
                                        onChange={e => setDateItems(dateItems.map((row, i) => i === index ? { ...row, hashtag: e.target.value } : row))} />
                                    <Button variant="danger" size="small" onClick={() => setDateItems(dateItems.filter((_, i) => i !== index))}>Remove</Button>
                                </div>
                            ))}
                            <Button variant="add" size="small" onClick={() => setDateItems([...dateItems, emptyEventDateItem()])}>+ Add date</Button>
                        </div>
                    ) : (
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
                    )}
                </div>

                <div className="eventform-section">
                    <label>Category <span className="form-optional">(optional)</span></label>
                    <select
                        value={selectedCategory}
                        onChange={(e) => {
                            setCategory(e.target.value);
                            setSubcategory("");
                        }}
                    >
                        <option value="">-- None --</option>
                        {eventCategories.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </div>

                {subcategoryOptions.length > 0 && (
                    <div className="eventform-section">
                        <label>Subcategory <span className="form-optional">(optional)</span></label>
                        <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
                            <option value="">-- None --</option>
                            {subcategoryOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
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
                    <label>Event-wide Keyword <span className="form-optional">(optional fallback)</span></label>
                    <input
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                    />
                </div>

                <div className="eventform-section">
                    <label>Event-wide Hashtags <span className="form-optional">(optional fallback, comma separated)</span></label>
                    <input
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        placeholder="bkk, stage, live"
                    />

                    <DefaultTagRow row="couple" checked={defaultTags} onToggle={toggleDefaultTag} />
                    <DefaultTagRow row="view" checked={defaultTags} onToggle={toggleDefaultTag} />
                    <DefaultTagRow row="mim" checked={defaultTags} onToggle={toggleDefaultTag} />
                </div>

                <EventPhotoFields photos={photos} onChange={setPhotos} dates={dates} dateMode={dateMode} startDate={startDate} endDate={endDate} />

                <div className="eventform-section">
                    <label>Announcement URLs <span className="form-optional">(optional, private unless selected below, one per line)</span></label>
                    <textarea
                        value={announcementURLsInput}
                        onChange={(e) => setAnnouncementURLsInput(e.target.value)}
                        onPaste={(e) => cleanPastedSocialUrls(e, setAnnouncementURLsInput)}
                        placeholder={"https://...\nhttps://..."}
                        style={{ minHeight: 80 }}
                    />
                    <FormField
                        className="eventform-public-announcement"
                        label="Public announcement card"
                        hint="Select one announcement to show publicly. X/Twitter links appear as an embedded tweet."
                    >
                        <Select
                            value={publicAnnouncementUrl}
                            disabled={announcementUrls.length === 0}
                            onChange={(e) => setPublicAnnouncementUrl(e.target.value)}
                        >
                            <option value="">Do not display an announcement</option>
                            {announcementUrls.map((url) => <option key={url} value={url}>{url}</option>)}
                        </Select>
                    </FormField>
                </div>

                {isInterview && (
                    <div className="eventform-section eventform-interview-content">
                        <FormField
                            label={<>Interview content <span className="form-optional">(optional, private by default)</span></>}
                            hint="Save the article text, transcript, or translated interview here. Line breaks are preserved."
                        >
                            <Textarea
                                value={interviewContent}
                                onChange={(e) => setInterviewContent(e.target.value)}
                                rows={12}
                            />
                        </FormField>
                        <Checkbox
                            className="eventform-show-interview-content"
                            checked={showInterviewContent}
                            disabled={!interviewContent.trim()}
                            onChange={(e) => setShowInterviewContent(e.target.checked)}
                            label="Show this content publicly on the event detail page"
                        />
                    </div>
                )}

                <div className="eventform-section">
                    <label>Private Notes <span className="form-optional">(optional, not shown publicly)</span></label>
                    <textarea
                        value={privateNotes}
                        onChange={(e) => setPrivateNotes(e.target.value)}
                        placeholder="Notes for your own reference..."
                        style={{ minHeight: 120 }}
                    />
                </div>

                <EventMediaFields
                    items={liveMediaItems}
                    dateOptions={dateMode === "dates" ? dates.filter(Boolean) : []}
                    onChange={setLiveMediaItems}
                />

                <div className="eventform-section">
                    <label>Part of Press Tour <span className="form-optional">(optional)</span></label>
                    <select value={parentEventId} onChange={(e) => setParentEventId(e.target.value)}>
                        <option value="">-- None --</option>
                        {pressTours.map((pt) => (
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
                    <Button type="submit" variant="save" size="large">Save Event</Button>
                </div>

            </form>
        </div>
    );
}
