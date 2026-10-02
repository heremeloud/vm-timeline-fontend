import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { getAuthors, updateAuthor, uploadAuthorPhoto } from "../api/authorsService";
import { VIEWMIM_FC } from "../constants/fcLinks";
import { Button } from "../ui";
import { resolvePhotoUrl } from "../utils/media";
import type { Author } from "../types/models";
import "../styles/Archive.css";

type SocialKey = "twitter_url" | "instagram_url" | "tiktok_url" | "gmmtv_url" | "mydramalist_url" | "fc_url";
type DraftKey = SocialKey | "name" | "nickname" | "full_name" | "birthday" | "ig_pfp_url" | "twitter_pfp_url" | "tiktok_pfp_url";
type AuthorDraft = Record<DraftKey, string>;

const EMPTY_DRAFT: AuthorDraft = {
    name: "", nickname: "", full_name: "", birthday: "",
    ig_pfp_url: "", twitter_pfp_url: "", tiktok_pfp_url: "",
    twitter_url: "", instagram_url: "", tiktok_url: "", gmmtv_url: "", mydramalist_url: "", fc_url: "",
};

const SOCIAL_FIELDS: { key: SocialKey; label: string; imgSrc: string | null; placeholder: string }[] = [
    { key: "twitter_url",   label: "Twitter / X",  imgSrc: "https://cdn.simpleicons.org/x/000000",        placeholder: "https://x.com/..." },
    { key: "instagram_url", label: "Instagram",     imgSrc: "https://cdn.simpleicons.org/instagram",      placeholder: "https://instagram.com/..." },
    { key: "tiktok_url",    label: "TikTok",        imgSrc: "https://cdn.simpleicons.org/tiktok/000000",  placeholder: "https://tiktok.com/@..." },
    { key: "gmmtv_url",     label: "GMMTV",         imgSrc: "/icons/gmmtv_logo.svg",                     placeholder: "https://www.gmmtv.com/..." },
    { key: "mydramalist_url", label: "MyDramaList", imgSrc: "https://mydramalist.com/favicon.ico",       placeholder: "https://mydramalist.com/people/..." },
    { key: "fc_url",        label: "Official FC",   imgSrc: null,                                         placeholder: "https://..." },
];

function formatBirthday(raw: string) {
    if (!raw) return null;
    const date = new Date(raw + "T00:00:00");
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function splitBeforeSurname(fullName: string) {
    return fullName?.trim().replace(/\s+(\S+)$/, "\n$1");
}

interface ProfileCardProps {
    author: Author | null;
    defaultPhoto?: string;
    thaiFullName?: string;
    fcIcon?: string;
    className?: string;
}

function ProfileCard({ author, ...rest }: ProfileCardProps) {
    return author ? <ProfileCardContent author={author} {...rest} /> : null;
}

function ProfileCardContent({ author: initialAuthor, defaultPhoto, thaiFullName, fcIcon = "🤎", className = "" }: ProfileCardProps & { author: Author }) {
    const isAdmin = !!localStorage.getItem("jwt");
    const [editing, setEditing] = useState(false);
    const [author, setAuthor] = useState<Author>(initialAuthor);
    const [draft, setDraft] = useState<AuthorDraft>(EMPTY_DRAFT);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    function startEdit() {
        setDraft({
            name: author.name || "",
            nickname: author.nickname || "",
            full_name: author.full_name || "",
            birthday: author.birthday || "",
            ig_pfp_url: author.ig_pfp_url || "",
            twitter_pfp_url: author.twitter_pfp_url || "",
            tiktok_pfp_url: author.tiktok_pfp_url || "",
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
        setDraft(EMPTY_DRAFT);
        setPhotoFile(null);
        setPhotoPreview(null);
    }

    function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
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
            setDraft(EMPTY_DRAFT);
            setPhotoFile(null);
            setPhotoPreview(null);
        } catch (err) {
            console.error("Save failed:", err);
            alert("Save failed.");
        } finally {
            setSaving(false);
        }
    }

    const defaultProfilePhoto = author.profile_photo_url || author.ig_pfp_url || author.twitter_pfp_url;
    const displayPhoto = resolvePhotoUrl(defaultProfilePhoto) || defaultPhoto;
    const editPhoto = photoPreview || resolvePhotoUrl(defaultProfilePhoto) || defaultPhoto;
    const displayFullName = [author.nickname, author.full_name].filter(Boolean).join(" ");

    if (editing) {
        return (
            <div className={`archive-card ${className}`.trim()}>
                {/* Photo upload */}
                <div
                    className="archive-photo-wrap archive-photo-upload"
                    onClick={() => fileInputRef.current?.click()}
                    title="Click to change photo"
                >
                    {editPhoto
                        ? <img src={editPhoto} alt="preview" className="archive-photo" />
                        : <div className="archive-photo-placeholder">{draft.name[0]}</div>
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
                        <label>Nickname</label>
                        <input value={draft.nickname} onChange={(e) => setDraft({ ...draft, nickname: e.target.value })} placeholder="e.g. View" />
                    </div>
                    <div className="archive-edit-row">
                        <label>Full Name</label>
                        <input value={draft.full_name} onChange={(e) => setDraft({ ...draft, full_name: e.target.value })} placeholder="e.g. Benyapa Jeenprasom" />
                    </div>
                    <div className="archive-edit-row">
                        <label>Birthday</label>
                        <input type="date" value={draft.birthday} onChange={(e) => setDraft({ ...draft, birthday: e.target.value })} />
                    </div>
                    <div className="archive-edit-row">
                        <label>Instagram Profile Photo URL</label>
                        <input value={draft.ig_pfp_url} onChange={(e) => setDraft({ ...draft, ig_pfp_url: e.target.value })} placeholder="https://..." />
                    </div>
                    <div className="archive-edit-row">
                        <label>X Profile Photo URL</label>
                        <input value={draft.twitter_pfp_url} onChange={(e) => setDraft({ ...draft, twitter_pfp_url: e.target.value })} placeholder="https://..." />
                    </div>
                    <div className="archive-edit-row">
                        <label>TikTok Profile Photo URL</label>
                        <input value={draft.tiktok_pfp_url} onChange={(e) => setDraft({ ...draft, tiktok_pfp_url: e.target.value })} placeholder="https://..." />
                    </div>
                    {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
                        <div key={key} className="archive-edit-row">
                            <label>{label}</label>
                            <input value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} placeholder={placeholder} />
                        </div>
                    ))}
                </div>

                <div className="archive-edit-actions">
                    <Button variant="save" className="archive-save-btn" onClick={saveEdit} disabled={saving}>
                        {saving ? "Saving…" : "Save"}
                    </Button>
                    <Button variant="secondary" onClick={cancelEdit} disabled={saving}>
                        Cancel
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className={`archive-card ${className}`.trim()}>
            <div className="archive-photo-wrap">
                {displayPhoto
                    ? <img src={displayPhoto} alt={author.name} className="archive-photo" />
                    : <div className="archive-photo-placeholder">{author.name?.[0]}</div>
                }
            </div>

            <div className="archive-identity">
                <h2 className="archive-name">{author.name}</h2>

                {(thaiFullName || displayFullName) && (
                    <div className={`archive-full-names ${thaiFullName ? "archive-full-names--bilingual" : ""}`.trim()}>
                        {thaiFullName && (
                            <div className="archive-full-name archive-full-name--words" lang="th">
                                {thaiFullName.split(/\s+/).map((word: string) => (
                                    <span key={word}>{word}</span>
                                ))}
                            </div>
                        )}
                        {displayFullName && (
                            <div className="archive-full-name">
                                {thaiFullName ? splitBeforeSurname(displayFullName) : displayFullName}
                            </div>
                        )}
                    </div>
                )}

                {author.birthday && (
                    <div className="archive-birthday">🎂 {formatBirthday(author.birthday)}</div>
                )}
            </div>

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
                <Button variant="primary" size="small" className="archive-edit-btn" onClick={startEdit}>Edit</Button>
            )}
        </div>
    );
}

export default function Archive() {
    const [view, setView] = useState<Author | null>(null);
    const [mim, setMim] = useState<Author | null>(null);
    const [vimmy, setVimmy] = useState<Author | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getAuthors().then((res) => {
            const authors = res.data || [];
            setView(authors.find((a) => a.name?.toLowerCase().trim() === "view") || null);
            setMim(authors.find((a) => a.name?.toLowerCase().trim() === "mim") || null);
            setVimmy(authors.find((a) => a.name?.toLowerCase().trim() === "vimmy") || null);
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
                <ProfileCard
                    author={view}
                    defaultPhoto="/profiles/view_pfp.jpg"
                    thaiFullName="วิว เบญญาภา จีนประสม"
                    fcIcon="🤎"
                />
                <ProfileCard
                    author={mim}
                    defaultPhoto="/profiles/mim_pfp.jpg"
                    thaiFullName="มิ้ม รัตนวดี วงศ์ทอง"
                    fcIcon="🤍"
                />
                <ProfileCard author={vimmy} fcIcon="💜" className="archive-card--third" />
            </div>
        </div>
    );
}
