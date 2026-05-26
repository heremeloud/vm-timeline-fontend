import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createProject } from "../api/projectsService";
import { getAuthors } from "../api/authorsService";
import { ROUTES } from "../routes";
import "../styles/EventForm.css";

const PROJECT_CATEGORIES = ["series", "concert", "movie", "variety", "music video", "other"];

export default function CreateProject() {
    const navigate = useNavigate();
    const [authors, setAuthors] = useState([]);

    const [title, setTitle] = useState("");
    const [originalTitle, setOriginalTitle] = useState("");
    const [category, setCategory] = useState("");
    const [thumbnailUrl, setThumbnailUrl] = useState("");
    const [year, setYear] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [description, setDescription] = useState("");
    const [playlistsInput, setPlaylistsInput] = useState("");
    const [announcementUrl, setAnnouncementUrl] = useState("");
    const [tweetUrl, setTweetUrl] = useState("");
    const [mydramalistUrl, setMydramalistUrl] = useState("");
    const [selectedAuthorIds, setSelectedAuthorIds] = useState([]);

    useEffect(() => {
        getAuthors().then((res) => setAuthors(res.data || []));
    }, []);

    function toggleAuthor(id) {
        setSelectedAuthorIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    }

    async function submit(e) {
        e.preventDefault();
        try {
            await createProject({
                title,
                original_title: originalTitle || null,
                category: category || null,
                thumbnail_url: thumbnailUrl || null,
                year: year ? parseInt(year) : null,
                start_date: startDate || null,
                end_date: endDate || null,
                description: description || null,
                playlist_ids: playlistsInput.split("\n").map(s => s.trim()).filter(Boolean),
                announcement_url: announcementUrl || null,
                tweet_url: tweetUrl || null,
                author_ids: selectedAuthorIds,
            });
            navigate(ROUTES.projects);
        } catch (err) {
            console.error(err);
            alert("Error creating project.");
        }
    }

    return (
        <div className="eventform-container">
            <h2>Create Project</h2>
            <form className="eventform-form" onSubmit={submit}>

                <div className="eventform-section">
                    <label>Title *</label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Girl Rules Series" />
                </div>

                <div className="eventform-section">
                    <label>Original Title <span style={{ fontWeight: 400, opacity: 0.6 }}>(Thai)</span></label>
                    <input value={originalTitle} onChange={(e) => setOriginalTitle(e.target.value)} placeholder="e.g. สาวน้อยสุดเก่ง" />
                </div>

                <div className="eventform-section">
                    <label>Category</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)}>
                        <option value="">— none —</option>
                        {PROJECT_CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                        ))}
                    </select>
                </div>

                <div className="eventform-section">
                    <label>Thumbnail URL</label>
                    <input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://..." />
                </div>

                <div className="eventform-section">
                    <label>Year</label>
                    <input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2024" style={{ width: 120 }} />
                </div>

                <div className="eventform-section">
                    <label>Start Date</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: 180 }} />
                </div>

                <div className="eventform-section">
                    <label>End Date <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional — for date ranges)</span></label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: 180 }} />
                </div>

                <div className="eventform-section">
                    <label>Description</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Short description…" />
                </div>

                <div className="eventform-section">
                    <label>YouTube Playlist IDs <span style={{ fontWeight: 400, opacity: 0.6 }}>(one per line)</span></label>
                    <textarea
                        value={playlistsInput}
                        onChange={(e) => setPlaylistsInput(e.target.value)}
                        placeholder={"PLxxxxxxxx\nPLyyyyyyyy"}
                        style={{ minHeight: 70 }}
                    />
                </div>

                <div className="eventform-section">
                    <label>Announcement URL <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
                    <input value={announcementUrl} onChange={(e) => setAnnouncementUrl(e.target.value)} placeholder="https://..." />
                </div>

                <div className="eventform-section">
                    <label>Tweet URL <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional — media/teaser tweet)</span></label>
                    <input value={tweetUrl} onChange={(e) => setTweetUrl(e.target.value)} placeholder="https://x.com/..." />
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
                    </div>
                </div>

                <div className="eventform-section">
                    <button type="submit">Save Project</button>
                </div>

            </form>
        </div>
    );
}
