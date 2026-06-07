import { useEffect, useRef, useState } from "react";
import { getAuthors, updateAuthor, uploadAuthorPhoto } from "../api/authorsService";
import { VIEWMIM_FC } from "../constants/fcLinks";
import "../styles/Archive.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// If the URL is a backend-relative path (starts with /static/), prepend the API base
function resolvePhotoUrl(url) {
    if (!url) return null;
    if (url.startsWith("/static/")) return API_BASE + url;
    return url;
}

const SOCIAL_FIELDS = [
    { key: "twitter_url",   label: "Twitter / X",  imgSrc: "https://cdn.simpleicons.org/x/000000",        placeholder: "https://x.com/..." },
    { key: "instagram_url", label: "Instagram",     imgSrc: "https://cdn.simpleicons.org/instagram",      placeholder: "https://instagram.com/..." },
    { key: "tiktok_url",    label: "TikTok",        imgSrc: "https://cdn.simpleicons.org/tiktok/000000",  placeholder: "https://tiktok.com/@..." },
    { key: "gmmtv_url",     label: "GMMTV",         imgSrc: "/icons/gmmtv_logo.svg",                     placeholder: "https://www.gmmtv.com/..." },
    { key: "mydramalist_url", label: "MyDramaList", imgSrc: "https://mydramalist.com/favicon.ico",       placeholder: "https://mydramalist.com/people/..." },
    { key: "fc_url",        label: "Official FC",   imgSrc: null,                                         placeholder: "https://..." },
];

function formatBirthday(raw) {
    if (!raw) return null;
    const date = new Date(raw + "T00:00:00");
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function ProfileCard({ author: initialAuthor, defaultPhoto, fcLink, fcIcon = "🤎" }) {
    const isAdmin = !!localStorage.getItem("jwt");
    const [editing, setEditing] = useState(false);
    const [author, setAuthor] = useState(initialAuthor);
    const [draft, setDraft] = useState({});
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef(null);

    if (!author) return null;

    function startEdit() {
        setDraft({
            name: author.name || "",
            full_name: author.full_name || "",
            birthday: author.birthday || "",
            twitter_url: author.twitter_url || "",
            instagram_url: author.instagram_url || "",
            tiktok_url: author.tiktok_url || "",
            gmmtv_url: author.gmmtv_url || "",
            mydramalist_url: author.mydramalist_url || "",
            fc_url: author.fc_url || "",   // individual FC
        });
        setPhotoFile(null);
        setPhotoPreview(null);
        setEditing(true);
    }

    function cancelEdit() {
        setEditing(false);
        setDraft({});
        setPhotoFile(null);
        setPhotoPreview(null);
    }

    function handlePhotoChange(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
    }

    async function saveEdit() {
        setSaving(true);
        try {
            // Upload photo first if one was selected
            let updated = author;
            if (photoFile) {
                const res = await uploadAuthorPhoto(author.id, photoFile);
                updated = res.data;
            }
            // Save the text fields
            const res2 = await updateAuthor(updated.id, draft);
            setAuthor(res2.data);
            setEditing(false);
            setDraft({});
            setPhotoFile(null);
            setPhotoPreview(null);
        } catch (err) {
            console.error("Save failed:", err);
            alert("Save failed.");
        } finally {
            setSaving(false);
        }
    }

    const displayPhoto = resolvePhotoUrl(author.profile_photo_url) || defaultPhoto;
    const editPhoto = photoPreview || resolvePhotoUrl(author.profile_photo_url) || defaultPhoto;

    if (editing) {
        return (
            <div className="archive-card">
                {/* Photo upload */}
                <div
                    className="archive-photo-wrap archive-photo-upload"
                    onClick={() => fileInputRef.current?.click()}
                    title="Click to change photo"
                >
                    {editPhoto
                        ? <img src={editPhoto} alt="preview" className="archive-photo" />
                        : <div className="archive-photo-placeholder">{draft.name?.[0]}</div>
                    }
                    <div className="archive-photo-overlay">📷</div>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handlePhotoChange}
                />

                <div className="archive-edit-fields">
                    <div className="archive-edit-row">
                        <label>Display Name</label>
                        <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                    </div>
                    <div className="archive-edit-row">
                        <label>Full Name</label>
                        <input value={draft.full_name} onChange={(e) => setDraft({ ...draft, full_name: e.target.value })} placeholder="e.g. Ploypichaya Manassa" />
                    </div>
                    <div className="archive-edit-row">
                        <label>Birthday</label>
                        <input type="date" value={draft.birthday} onChange={(e) => setDraft({ ...draft, birthday: e.target.value })} />
                    </div>
                    {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
                        <div key={key} className="archive-edit-row">
                            <label>{label}</label>
                            <input value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} placeholder={placeholder} />
                        </div>
                    ))}
                </div>

                <div className="archive-edit-actions">
                    <button className="archive-save-btn" onClick={saveEdit} disabled={saving}>
                        {saving ? "Saving…" : "Save"}
                    </button>
                    <button className="archive-cancel-btn" onClick={cancelEdit} disabled={saving}>
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="archive-card">
            <div className="archive-photo-wrap">
                {displayPhoto
                    ? <img src={displayPhoto} alt={author.name} className="archive-photo" />
                    : <div className="archive-photo-placeholder">{author.name?.[0]}</div>
                }
            </div>

            <h2 className="archive-name">{author.name}</h2>

            {author.full_name && (
                <div className="archive-full-name">{author.full_name}</div>
            )}

            {author.birthday && (
                <div className="archive-birthday">🎂 {formatBirthday(author.birthday)}</div>
            )}

            <div className="archive-links">
                {SOCIAL_FIELDS.map(({ key, label, imgSrc }) => {
                    const url = author[key];
                    if (!url) return null;
                    return (
                        <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="archive-link">
                            {imgSrc
                                ? <img src={imgSrc} alt={label} className="archive-link-img" />
                                : <span className="archive-link-icon">{fcIcon}</span>
                            }
                            {label}
                            <span className="archive-link-arrow">↗</span>
                        </a>
                    );
                })}

            </div>

            {isAdmin && (
                <button className="archive-edit-btn" onClick={startEdit}>Edit</button>
            )}
        </div>
    );
}

export default function Archive() {
    const [view, setView] = useState(null);
    const [mim, setMim] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getAuthors().then((res) => {
            const authors = res.data || [];
            setView(authors.find((a) => a.name?.toLowerCase().trim() === "view") || null);
            setMim(authors.find((a) => a.name?.toLowerCase().trim() === "mim") || null);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) return <div style={{ padding: 20 }}>Loading…</div>;

    return (
        <div className="archive-container">
            <div className="archive-header">
                <h1 style={{ marginBottom: "0.2rem" }}>🤎ViewMim🤍</h1>
                <p className="archive-subtitle">View & Mim</p>
                <a href={VIEWMIM_FC.url} target="_blank" rel="noopener noreferrer" className="archive-shared-fc">
                    🐶🐝 {VIEWMIM_FC.label} ↗
                </a>
                <hr />
            </div>

            <div className="archive-grid">
                <ProfileCard author={view} defaultPhoto="/profiles/view_pfp.jpg" fcLink={VIEWMIM_FC} fcIcon="🤎" />
                <ProfileCard author={mim}  defaultPhoto="/profiles/mim_pfp.jpg"  fcLink={VIEWMIM_FC} fcIcon="🤍" />
            </div>
        </div>
    );
}
