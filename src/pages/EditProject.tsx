import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAdminProject, updateProject, getProjects } from "../api/projectsService";
import { getAuthors } from "../api/authorsService";
import { ROUTES } from "../routes";
import { PROJECT_CATEGORIES } from "../constants/projectCategories";
import { cleanPastedSocialUrls, cleanPastedYouTubeUrl, extractPlaylistId, normalizeSocialPostUrl, normalizeYouTubeVideoUrl } from "../utils/postUrls";
import { slugify } from "../utils/slugify";
import { errorDetail } from "../utils/errors";
import SeriesMetadataFields from "../components/SeriesMetadataFields";
import type { EpisodeRow, FilmingDayRow, FittingWorkshopRow } from "../components/SeriesMetadataFields";
import type { Author, Id, Project } from "../types/models";
import { Button, FocalPointPicker } from "../ui";
import "../styles/EventForm.css";

export default function EditProject() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [authors, setAuthors] = useState<Author[]>([]);

    const [title, setTitle] = useState("");
    const [originalTitle, setOriginalTitle] = useState("");
    const [hashtag, setHashtag] = useState("");
    const [slug, setSlug] = useState("");
    const [category, setCategory] = useState("");
    const [thumbnailUrl, setThumbnailUrl] = useState("");
    const [thumbnailFocalX, setThumbnailFocalX] = useState(50);
    const [thumbnailFocalY, setThumbnailFocalY] = useState(50);
    const [year, setYear] = useState("");
    const [episodeCount, setEpisodeCount] = useState("");
    const [filmingDays, setFilmingDays] = useState<FilmingDayRow[]>([]);
    const [episodes, setEpisodes] = useState<EpisodeRow[]>([]);
    const [fittingWorkshops, setFittingWorkshops] = useState<FittingWorkshopRow[]>([]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [description, setDescription] = useState("");
    const [playlists, setPlaylists] = useState([{ name: "", id: "" }]);
    const [announcementUrl, setAnnouncementUrl] = useState("");
    const [tweetUrl, setTweetUrl] = useState("");
    const [tweetLabel, setTweetLabel] = useState("");
    const [youtubeUrl, setYoutubeUrl] = useState("");
    const [youtubeLabel, setYoutubeLabel] = useState("");
    const [mydramalistUrl, setMydramalistUrl] = useState("");
    const [gmmtvUrl, setGmmtvUrl] = useState("");
    const [officialTwitterUrl, setOfficialTwitterUrl] = useState("");
    const [spotifyUrl, setSpotifyUrl] = useState("");
    const [appleMusicUrl, setAppleMusicUrl] = useState("");
    const [parentProjectId, setParentProjectId] = useState("");
    const [allProjects, setAllProjects] = useState<Project[]>([]);
    const [selectedAuthorIds, setSelectedAuthorIds] = useState<Id[]>([]);

    useEffect(() => {
        async function load() {
            const [authRes, projRes, allProjRes] = await Promise.all([
                getAuthors(),
                getAdminProject(projectId ?? ""),
                getProjects(),
            ]);
            setAllProjects(allProjRes.data || []);
            setAuthors(authRes.data || []);

            const p = projRes.data.project;
            setTitle(p.title || "");
            setOriginalTitle(p.original_title || "");
            setHashtag(p.hashtag || "");
            setSlug(p.slug || "");
            setCategory(p.category || "");
            setThumbnailUrl(p.thumbnail_url || "");
            setThumbnailFocalX(p.thumbnail_focal_x ?? 50);
            setThumbnailFocalY(p.thumbnail_focal_y ?? 50);
            setYear(p.year ? String(p.year) : "");
            setEpisodeCount(p.episode_count ? String(p.episode_count) : "");
            setFilmingDays((p.filming_days || []).map((row) => ({
                q_number: String(row.q_number),
                filming_date: row.filming_date || "",
                hashtag: row.hashtag || "",
                keyword: row.keyword || "",
            })));
            setEpisodes((p.episode_metadata || []).map((row) => ({
                episode_number: String(row.episode_number),
                air_date: row.air_date || "",
                title: row.title || "",
                hashtag: row.hashtag || "",
                keyword: row.keyword || "",
            })));
            setFittingWorkshops((p.fitting_workshops || []).map((row) => ({
                kind: row.kind,
                number: String(row.number),
                date: row.date || "",
                hashtag: row.hashtag || "",
                keyword: row.keyword || "",
            })));
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
            setTweetLabel(p.tweet_label || "");
            setYoutubeUrl(p.youtube_url || "");
            setYoutubeLabel(p.youtube_label || "");
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



    function toggleAuthor(id: Id) {
        setSelectedAuthorIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    }

    async function save(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        try {
            await updateProject(projectId ?? "", {
                title,
                original_title: originalTitle || null,
                hashtag,
                slug: slug || null,
                category: category || null,
                thumbnail_url: thumbnailUrl || null,
                thumbnail_focal_x: thumbnailUrl.trim() ? thumbnailFocalX : null,
                thumbnail_focal_y: thumbnailUrl.trim() ? thumbnailFocalY : null,
                year: year ? parseInt(year) : null,
                episode_count: category === "series" && episodeCount ? parseInt(episodeCount) : 0,
                filming_days: category === "series" ? filmingDays.map((row) => ({ ...row, q_number: parseInt(row.q_number) })) : [],
                episode_metadata: category === "series" ? episodes.map((row) => ({ ...row, episode_number: parseInt(row.episode_number) })) : [],
                fitting_workshops: category === "series" ? fittingWorkshops.map((row) => ({ ...row, number: parseInt(row.number) })) : [],
                start_date: startDate || null,
                end_date: endDate || null,
                description: description || null,
                playlist_ids: playlists.filter(p => p.id.trim()).map(p => ({
                    id: p.id.trim(),
                    ...(p.name.trim() ? { name: p.name.trim() } : {}),
                })),
                announcement_url: normalizeSocialPostUrl(announcementUrl) || null,
                tweet_url: tweetUrl || null,
                tweet_label: tweetLabel,
                youtube_url: normalizeYouTubeVideoUrl(youtubeUrl) || null,
                youtube_label: youtubeLabel,
                mydramalist_url: mydramalistUrl || null,
                gmmtv_url: gmmtvUrl || null,
                official_twitter_url: category === "series" ? officialTwitterUrl || null : null,
                spotify_url: category === "song" ? spotifyUrl || null : "",
                apple_music_url: category === "song" ? appleMusicUrl || null : "",
                parent_project_id: parentProjectId ? parseInt(parentProjectId) : null,
                author_ids: selectedAuthorIds,
            });
            navigate(ROUTES.projectDetail(slug || projectId || ""));
        } catch (err) {
            console.error(err);
            alert(errorDetail(err, "Error saving project.", "\n"));
        }
    }

    if (loading) return <div style={{ padding: 20 }}>Loading…</div>;

    return (
        <div className="eventform-container">
            <h2>Edit Project #{projectId}</h2>
            <form id="edit-project-form" className="eventform-form" onSubmit={save}>

                <div className="eventform-section">
                    <label>Title <span className="form-required">*</span></label>
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
                    <label>Primary Hashtag <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
                    <input value={hashtag} onChange={(e) => setHashtag(e.target.value)} placeholder="BakeLoveFeeling" />
                    <div className="eventform-field-note">Enter without # - it is added when displayed and copied.</div>
                </div>

                <div className="eventform-section">
                    <label>URL Slug</label>
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
                        <option value="">-- None --</option>
                        {PROJECT_CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                        ))}
                    </select>
                </div>

                <div className="eventform-section">
                    <label>Part of Project <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional - e.g. OST of a series)</span></label>
                    <select value={parentProjectId} onChange={(e) => setParentProjectId(e.target.value)}>
                        <option value="">-- None --</option>
                        {allProjects.filter((p) => String(p.id) !== projectId).map((p) => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                    </select>
                </div>

                <div className="eventform-section project-year-dates-row">
                    <div>
                        <label>Year</label>
                        <input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2024" />
                    </div>
                    <div>
                        <div className="project-date-inputs">
                            <div><label>Project Dates <span style={{ fontWeight: 400 }}>Start Date</span></label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                            <div><label style={{ fontWeight: 400 }}>End Date <span style={{ opacity: 0.6 }}>(optional)</span></label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
                        </div>
                    </div>
                </div>

                {category === "series" && (
                    <div className="eventform-section">
                        <label>Number of Episodes <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
                        <input
                            type="number"
                            min="1"
                            step="1"
                            value={episodeCount}
                            onChange={(e) => setEpisodeCount(e.target.value)}
                            placeholder="12"
                            style={{ width: 120 }}
                        />
                    </div>
                )}

                {category === "series" && (
                    <SeriesMetadataFields
                        filmingDays={filmingDays}
                        setFilmingDays={setFilmingDays}
                        episodes={episodes}
                        setEpisodes={setEpisodes}
                        fittingWorkshops={fittingWorkshops}
                        setFittingWorkshops={setFittingWorkshops}
                        episodeCount={episodeCount}
                        primaryHashtag={hashtag}
                        startDate={startDate}
                        inferOptionalFields
                    />
                )}


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

                {category === "song" && (
                    <>
                        <div className="eventform-section">
                            <label>Spotify URL <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional - track)</span></label>
                            <input value={spotifyUrl} onChange={(e) => setSpotifyUrl(e.target.value)} placeholder="https://open.spotify.com/..." />
                        </div>

                        <div className="eventform-section">
                            <label>Apple Music URL <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional - track)</span></label>
                            <input value={appleMusicUrl} onChange={(e) => setAppleMusicUrl(e.target.value)} placeholder="https://music.apple.com/..." />
                        </div>
                    </>
                )}

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
                                placeholder="Enter a display name"
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
                                <Button
                                    variant="danger"
                                    size="small"
                                    onClick={() => setPlaylists(playlists.filter((_, j) => j !== i))}
                                    style={{ flexShrink: 0 }}
                                    aria-label={`Remove playlist ${i + 1}`}
                                >✕</Button>
                            )}
                        </div>
                    ))}
                    <Button
                        variant="add"
                        size="small"
                        onClick={() => setPlaylists([...playlists, { name: "", id: "" }])}
                        style={{ marginTop: 2 }}
                    >+ Add playlist</Button>
                </div>

                <div className="eventform-section">
                    <label>Announcement URL <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
                    <input
                        value={announcementUrl}
                        onChange={(e) => setAnnouncementUrl(e.target.value)}
                        onPaste={(e) => cleanPastedSocialUrls(e, setAnnouncementUrl)}
                        placeholder="https://..."
                    />
                </div>

                <div className="eventform-section">
                    <label>X Media URL <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional - media/teaser post)</span></label>
                    <input value={tweetUrl} onChange={(e) => setTweetUrl(e.target.value)} placeholder="https://x.com/..." />
                    <input value={tweetLabel} onChange={(e) => setTweetLabel(e.target.value)} placeholder="Media name (defaults to Tweet)" style={{ marginTop: 6 }} />
                </div>

                <div className="eventform-section">
                    <label>YouTube Video URL <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional - single video, no playlist)</span></label>
                    <input
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        onPaste={(e) => cleanPastedYouTubeUrl(e, setYoutubeUrl)}
                        placeholder="https://www.youtube.com/watch?v=..."
                    />
                    <input value={youtubeLabel} onChange={(e) => setYoutubeLabel(e.target.value)} placeholder="Media name (defaults to Video)" style={{ marginTop: 6 }} />
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
                    <Button type="submit" variant="save" size="large">Save Changes</Button>
                </div>

            </form>
        </div>
    );
}
