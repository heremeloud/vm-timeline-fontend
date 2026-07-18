import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAdminProject, updateProject, getProjects } from "../api/projectsService";
import { getAuthors } from "../api/authorsService";
import { ROUTES } from "../routes";
import { PROJECT_CATEGORIES } from "../constants/projectCategories";
import FocalPointPicker from "../components/FocalPointPicker";
import "../styles/EventForm.css";

function slugify(value) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export default function EditProject() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [authors, setAuthors] = useState([]);

    const [title, setTitle] = useState("");
    const [originalTitle, setOriginalTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [category, setCategory] = useState("");
    const [thumbnailUrl, setThumbnailUrl] = useState("");
    const [thumbnailFocalX, setThumbnailFocalX] = useState(50);
    const [thumbnailFocalY, setThumbnailFocalY] = useState(50);
    const [year, setYear] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [description, setDescription] = useState("");
    const [playlists, setPlaylists] = useState([{ name: "", id: "" }]);
    const [announcementUrl, setAnnouncementUrl] = useState("");
    const [tweetUrl, setTweetUrl] = useState("");
    const [youtubeUrl, setYoutubeUrl] = useState("");
    const [mydramalistUrl, setMydramalistUrl] = useState("");
    const [gmmtvUrl, setGmmtvUrl] = useState("");
    const [officialTwitterUrl, setOfficialTwitterUrl] = useState("");
    const [spotifyUrl, setSpotifyUrl] = useState("");
    const [appleMusicUrl, setAppleMusicUrl] = useState("");
    const [parentProjectId, setParentProjectId] = useState("");
    const [allProjects, setAllProjects] = useState([]);
    const [selectedAuthorIds, setSelectedAuthorIds] = useState([]);

    useEffect(() => {
        async function load() {
            const [authRes, projRes, allProjRes] = await Promise.all([
                getAuthors(),
                getAdminProject(projectId),
                getProjects(),
            ]);
            setAllProjects(allProjRes.data || []);
            setAuthors(authRes.data || []);

            const p = projRes.data.project;
            setTitle(p.title || "");
            setOriginalTitle(p.original_title || "");
            setSlug(p.slug || "");
            setCategory(p.category || "");
            setThumbnailUrl(p.thumbnail_url || "");
            setThumbnailFocalX(p.thumbnail_focal_x ?? 50);
            setThumbnailFocalY(p.thumbnail_focal_y ?? 50);
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
            setYoutubeUrl(p.youtube_url || "");
            setMydramalistUrl(p.mydramalist_url || "");
            setGmmtvUrl(p.gmmtv_url || "");
            setOfficialTwitterUrl(p.official_twitter_url || "");
            setSpotifyUrl(p.spotify_url || "");
            setAppleMusicUrl(p.apple_music_url || "");
            setParentProjectId(p.parent_project_id ? String(p.parent_project_id) : "");
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
                slug: slug || null,
                category: category || null,
                thumbnail_url: thumbnailUrl || null,
                thumbnail_focal_x: thumbnailUrl.trim() ? thumbnailFocalX : null,
                thumbnail_focal_y: thumbnailUrl.trim() ? thumbnailFocalY : null,
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
                youtube_url: youtubeUrl || null,
                mydramalist_url: mydramalistUrl || null,
                gmmtv_url: gmmtvUrl || null,
                official_twitter_url: category === "series" ? officialTwitterUrl || null : null,
                spotify_url: spotifyUrl || null,
                apple_music_url: appleMusicUrl || null,
                parent_project_id: parentProjectId ? parseInt(parentProjectId) : null,
                author_ids: selectedAuthorIds,
            });
            navigate(ROUTES.projectDetail(slug || projectId));
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
                    <input
                        value={title}
                        onChange={(e) => {
                            const nextTitle = e.target.value;
                            setTitle(nextTitle);
                            if (!slug.trim()) setSlug(slugify(nextTitle));
                        }}
                        required
                    />
                </div>

                <div className="eventform-section">
                    <label>Original Title <span style={{ fontWeight: 400, opacity: 0.6 }}>(Thai)</span></label>
                    <input value={originalTitle} onChange={(e) => setOriginalTitle(e.target.value)} placeholder="e.g. สาวน้อยสุดเก่ง" />
                </div>

                <div className="eventform-section">
                    <label>URL slug</label>
                    <input
                        value={slug}
                        onChange={(e) => setSlug(slugify(e.target.value))}
                        placeholder="girl-rules-series"
                    />
                    <div style={{ fontSize: "0.85rem", opacity: 0.7, marginTop: 4 }}>
                        Public URL: /projects/{slug || "your-project-slug"}
                    </div>
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
                    <FocalPointPicker
                        imageUrl={thumbnailUrl.trim()}
                        x={thumbnailFocalX}
                        y={thumbnailFocalY}
                        onChange={(nx, ny) => {
                            setThumbnailFocalX(nx);
                            setThumbnailFocalY(ny);
                        }}
                    />
                </div>

                <div className="eventform-section">
                    <label>GMMTV Official URL <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
                    <input value={gmmtvUrl} onChange={(e) => setGmmtvUrl(e.target.value)} placeholder="https://www.gmmtv.com/..." />
                </div>

                {category === "series" && (
                    <div className="eventform-section">
                        <label>Official Series Twitter / X Account <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
                        <input value={officialTwitterUrl} onChange={(e) => setOfficialTwitterUrl(e.target.value)} placeholder="https://x.com/seriesaccount" />
                    </div>
                )}

                <div className="eventform-section">
                    <label>MyDramaList URL <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
                    <input value={mydramalistUrl} onChange={(e) => setMydramalistUrl(e.target.value)} placeholder="https://mydramalist.com/..." />
                </div>

                <div className="eventform-section">
                    <label>Spotify URL <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional — album or track)</span></label>
                    <input value={spotifyUrl} onChange={(e) => setSpotifyUrl(e.target.value)} placeholder="https://open.spotify.com/..." />
                </div>

                <div className="eventform-section">
                    <label>Apple Music URL <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional — album or track)</span></label>
                    <input value={appleMusicUrl} onChange={(e) => setAppleMusicUrl(e.target.value)} placeholder="https://music.apple.com/..." />
                </div>

                <div className="eventform-section">
                    <label>Part of Project <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional — e.g. OST of a series)</span></label>
                    <select value={parentProjectId} onChange={(e) => setParentProjectId(e.target.value)}>
                        <option value="">— none —</option>
                        {allProjects.filter((p) => String(p.id) !== projectId).map((p) => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                    </select>
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
                    <label>YouTube Video URL <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional — single video, no playlist)</span></label>
                    <input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
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
