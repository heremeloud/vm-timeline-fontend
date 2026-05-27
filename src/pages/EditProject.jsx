import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProject, updateProject } from "../api/projectsService";
import { getAuthors } from "../api/authorsService";
import { ROUTES } from "../routes";
import "../styles/EventForm.css";

const PROJECT_CATEGORIES = ["series", "concert", "movie", "variety", "music video", "other"];

export default function EditProject() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [authors, setAuthors] = useState([]);

    const [title, setTitle] = useState("");
    const [originalTitle, setOriginalTitle] = useState("");
    const [category, setCategory] = useState("");
    const [thumbnailUrl, setThumbnailUrl] = useState("");
    const [year, setYear] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [description, setDescription] = useState("");
    const [playlists, setPlaylists] = useState([{ name: "", id: "" }]);
    const [announcementUrl, setAnnouncementUrl] = useState("");
    const [tweetUrl, setTweetUrl] = useState("");
    const [mydramalistUrl, setMydramalistUrl] = useState("");
    const [gmmtvUrl, setGmmtvUrl] = useState("");
    const [selectedAuthorIds, setSelectedAuthorIds] = useState([]);

    useEffect(() => {
        async function load() {
            const [authRes, projRes] = await Promise.all([
                getAuthors(),
                getProject(projectId),
            ]);
            setAuthors(authRes.data || []);

            const p = projRes.data.project;
            setTitle(p.title || "");
            setOriginalTitle(p.original_title || "");
            setCategory(p.category || "");
            setThumbnailUrl(p.thumbnail_url || "");
            setYear(p.year ? String(p.year) : "");
            setStartDate(p.start_date || "");
            setEndDate(p.end_date || "");
            setDescription(p.description || "");
            // playlists comes back as [{name?, id}] objects from the API
            const loaded = (p.playlists || []).map(entry =>
                typeof entry === "string"
                    ? { name: "", id: entry }
                    : { name: entry.name || "", id: entry.id || "" }
            );
            setPlaylists(loaded.length > 0 ? loaded : [{ name: "", id: "" }]);
            setAnnouncementUrl(p.announcement_url || "");
            setTweetUrl(p.tweet_url || "");
            setMydramalistUrl(p.mydramalist_url || "");
            setGmmtvUrl(p.gmmtv_url || "");
            setSelectedAuthorIds((p.authors || []).map((a) => a.id));
            setLoading(false);
        }
        load();
    }, [projectId]);

    function extractPlaylistId(input) {
        try {
            const url = new URL(input.trim());
            const list = url.searchParams.get("list");
            if (list) return list;
        } catch {}
        return input.trim();
    }

    function toggleAuthor(id) {
        setSelectedAuthorIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    }

    async function save(e) {
        e.preventDefault();
        try {
            await updateProject(projectId, {
                title,
                original_title: originalTitle || null,
                category: category || null,
                thumbnail_url: thumbnailUrl || null,
                year: year ? parseInt(year) : null,
                start_date: startDate || null,
                end_date: endDate || null,
                description: description || null,
                playlist_ids: playlists.filter(p => p.id.trim()).map(p => ({
                    id: p.id.trim(),
                    ...(p.name.trim() ? { name: p.name.trim() } : {}),
                })),
                announcement_url: announcementUrl || null,
                tweet_url: tweetUrl || null,
                mydramalist_url: mydramalistUrl || null,
                gmmtv_url: gmmtvUrl || null,
                author_ids: selectedAuthorIds,
            });
            navigate(ROUTES.projectDetail(projectId));
        } catch (err) {
            console.error(err);
            alert("Error saving project.");
        }
    }

    if (loading) return <div style={{ padding: 20 }}>Loading…</div>;

    return (
        <div className="eventform-container">
            <h2>Edit Project #{projectId}</h2>
            <form className="eventform-form" onSubmit={save}>

                <div className="eventform-section">
                    <label>Title *</label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} required />
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
                    <label>GMMTV Official URL <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
                    <input value={gmmtvUrl} onChange={(e) => setGmmtvUrl(e.target.value)} placeholder="https://www.gmmtv.com/..." />
                </div>

                <div className="eventform-section">
                    <label>MyDramaList URL <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
                    <input value={mydramalistUrl} onChange={(e) => setMydramalistUrl(e.target.value)} placeholder="https://mydramalist.com/..." />
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
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                </div>

                <div className="eventform-section">
                    <label>YouTube Playlists</label>
                    {playlists.map((pl, i) => (
                        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                            <input
                                value={pl.name}
                                onChange={(e) => {
                                    const next = [...playlists];
                                    next[i] = { ...next[i], name: e.target.value };
                                    setPlaylists(next);
                                }}
                                placeholder="Name (optional)"
                                style={{ flex: 1 }}
                            />
                            <input
                                value={pl.id}
                                onChange={(e) => {
                                    const next = [...playlists];
                                    next[i] = { ...next[i], id: extractPlaylistId(e.target.value) };
                                    setPlaylists(next);
                                }}
                                placeholder="PLxxxxxxxx or paste full URL"
                                style={{ flex: 1 }}
                            />
                            {playlists.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => setPlaylists(playlists.filter((_, j) => j !== i))}
                                    style={{ color: "red", background: "none", border: "1px solid red", borderRadius: 4, cursor: "pointer", padding: "0 8px", flexShrink: 0 }}
                                >✕</button>
                            )}
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={() => setPlaylists([...playlists, { name: "", id: "" }])}
                        style={{ fontSize: "0.85rem", marginTop: 2, cursor: "pointer" }}
                    >+ Add playlist</button>
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
                    <button type="submit">Save Changes</button>
                </div>

            </form>
        </div>
    );
}
