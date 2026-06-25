import { useEffect, useMemo, useState } from "react";
import { getAuthors, updateAuthor } from "../api/authorsService";
import Avatar from "../components/Avatar";
import "../styles/EventForm.css";

const TEXT_FIELDS = [
    { key: "name", label: "Display Name", required: true },
    { key: "full_name", label: "Full Name" },
    { key: "profile_photo_url", label: "Profile Photo URL" },
    { key: "ig_pfp_url", label: "Instagram PFP URL" },
    { key: "twitter_pfp_url", label: "Twitter / X PFP URL" },
    { key: "tiktok_pfp_url", label: "TikTok PFP URL" },
    { key: "birthday", label: "Birthday", type: "date" },
    { key: "twitter_url", label: "Twitter / X URL" },
    { key: "instagram_url", label: "Instagram URL" },
    { key: "tiktok_url", label: "TikTok URL" },
    { key: "gmmtv_url", label: "GMMTV URL" },
    { key: "mydramalist_url", label: "MyDramaList URL" },
    { key: "fc_url", label: "Official FC URL" },
];

function buildDraft(author) {
    return TEXT_FIELDS.reduce((draft, field) => {
        draft[field.key] = author[field.key] || "";
        return draft;
    }, {
        show_on_timeline: !!author.show_on_timeline,
    });
}

function buildPayload(draft) {
    return TEXT_FIELDS.reduce((payload, field) => {
        const value = draft[field.key]?.trim?.() ?? "";
        payload[field.key] = field.required ? value : value || null;
        return payload;
    }, {
        show_on_timeline: !!draft.show_on_timeline,
    });
}

export default function ManageAuthors() {
    const [authors, setAuthors] = useState([]);
    const [drafts, setDrafts] = useState({});
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState(null);
    const [query, setQuery] = useState("");

    useEffect(() => {
        async function loadAuthors() {
            try {
                const res = await getAuthors();
                const rows = res.data || [];
                setAuthors(rows);
                setDrafts(Object.fromEntries(rows.map((author) => [author.id, buildDraft(author)])));
            } catch (err) {
                console.error("Load authors failed:", err);
                alert("Could not load authors.");
            } finally {
                setLoading(false);
            }
        }

        loadAuthors();
    }, []);

    const visibleAuthors = useMemo(() => {
        const term = query.trim().toLowerCase();
        if (!term) return authors;
        return authors.filter((author) =>
            [author.name, author.full_name, author.instagram_url, author.twitter_url]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(term))
        );
    }, [authors, query]);

    function updateDraft(authorId, key, value) {
        setDrafts((current) => ({
            ...current,
            [authorId]: {
                ...current[authorId],
                [key]: value,
            },
        }));
    }

    async function saveAuthor(author) {
        const draft = drafts[author.id];
        if (!draft?.name?.trim()) {
            alert("Display name is required.");
            return;
        }

        setSavingId(author.id);
        try {
            const res = await updateAuthor(author.id, buildPayload(draft));
            const updated = res.data;
            setAuthors((current) =>
                current.map((row) => row.id === updated.id ? updated : row)
            );
            setDrafts((current) => ({
                ...current,
                [updated.id]: buildDraft(updated),
            }));
        } catch (err) {
            console.error("Save author failed:", err);
            alert("Could not save author.");
        } finally {
            setSavingId(null);
        }
    }

    if (loading) return <div style={{ padding: 20 }}>Loading authors...</div>;

    return (
        <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "end", flexWrap: "wrap" }}>
                <div>
                    <h2 style={{ marginBottom: 4 }}>Manage Authors</h2>
                    <p style={{ marginTop: 0, color: "#777" }}>{authors.length} authors</p>
                </div>

                <div className="eventform-section" style={{ minWidth: 260, marginBottom: 0 }}>
                    <label>Search</label>
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Name or social URL"
                    />
                </div>
            </div>

            <div style={{ display: "grid", gap: 16, marginTop: 20 }}>
                {visibleAuthors.map((author) => {
                    const draft = drafts[author.id] || buildDraft(author);
                    const saving = savingId === author.id;

                    return (
                        <div
                            key={author.id}
                            style={{
                                border: "1px solid rgba(0, 0, 0, 0.14)",
                                borderRadius: 8,
                                padding: 14,
                                display: "grid",
                                gap: 14,
                            }}
                        >
                            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                <Avatar
                                    url={draft.profile_photo_url || draft.ig_pfp_url || draft.twitter_pfp_url}
                                    authorId={author.id}
                                    name={draft.name}
                                />
                                <div>
                                    <strong>{draft.name || `Author #${author.id}`}</strong>
                                    <div style={{ fontSize: "0.85rem", color: "#777" }}>ID {author.id}</div>
                                </div>
                            </div>

                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                                    gap: 12,
                                }}
                            >
                                {TEXT_FIELDS.map((field) => (
                                    <div className="eventform-section" key={field.key} style={{ marginBottom: 0 }}>
                                        <label>{field.label}</label>
                                        <input
                                            type={field.type || "text"}
                                            value={draft[field.key] || ""}
                                            onChange={(e) => updateDraft(author.id, field.key, e.target.value)}
                                            required={field.required}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                                <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 0 }}>
                                    <input
                                        type="checkbox"
                                        checked={!!draft.show_on_timeline}
                                        onChange={(e) => updateDraft(author.id, "show_on_timeline", e.target.checked)}
                                    />
                                    Show on timeline
                                </label>

                                <button type="button" disabled={saving} onClick={() => saveAuthor(author)}>
                                    {saving ? "Saving..." : "Save Author"}
                                </button>
                            </div>
                        </div>
                    );
                })}

                {visibleAuthors.length === 0 && (
                    <p style={{ color: "#777" }}>No authors match that search.</p>
                )}
            </div>
        </div>
    );
}
