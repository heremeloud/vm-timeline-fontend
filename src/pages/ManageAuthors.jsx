import { useEffect, useMemo, useState } from "react";
import { getAuthors, updateAuthor } from "../api/authorsService";
import Avatar from "../components/Avatar";
import "../styles/EventForm.css";

const FIELD_GROUPS = [
    {
        title: "Identity",
        fields: [
            { key: "name", label: "Display Name", required: true },
            { key: "full_name", label: "Full Name" },
            { key: "birthday", label: "Birthday", type: "date" },
        ],
    },
    {
        title: "Profile Images",
        fields: [
            { key: "profile_photo_url", label: "Default Profile Photo URL" },
            { key: "ig_pfp_url", label: "Instagram PFP URL" },
            { key: "twitter_pfp_url", label: "Twitter / X PFP URL" },
            { key: "tiktok_pfp_url", label: "TikTok PFP URL" },
        ],
    },
    {
        title: "Social Profiles",
        fields: [
            { key: "instagram_url", label: "Instagram URL" },
            { key: "broadcast_channel_name", label: "Broadcast Channel Name" },
            { key: "twitter_url", label: "Twitter / X URL" },
            { key: "tiktok_url", label: "TikTok URL" },
            { key: "gmmtv_url", label: "GMMTV URL" },
            { key: "mydramalist_url", label: "MyDramaList URL" },
            { key: "fc_url", label: "Official FC URL" },
        ],
    },
];

const TEXT_FIELDS = FIELD_GROUPS.flatMap((group) => group.fields);

function buildDraft(author) {
    return TEXT_FIELDS.reduce((draft, field) => {
        draft[field.key] = author[field.key] || "";
        return draft;
    }, {
        show_on_timeline: !!author.show_on_timeline,
        sort_order: author.sort_order ?? author.id ?? 0,
    });
}

function buildPayload(draft) {
    return TEXT_FIELDS.reduce((payload, field) => {
        const value = draft[field.key]?.trim?.() ?? "";
        payload[field.key] = field.required ? value : value || null;
        return payload;
    }, {
        show_on_timeline: !!draft.show_on_timeline,
        sort_order: Math.max(0, Math.floor(Number(draft.sort_order) || 0)),
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
                current
                    .map((row) => row.id === updated.id ? updated : row)
                    .sort((a, b) => (a.sort_order ?? a.id) - (b.sort_order ?? b.id))
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

    async function saveAllAuthors(e) {
        e.preventDefault();
        const invalidAuthor = authors.find((author) => !drafts[author.id]?.name?.trim());
        if (invalidAuthor) {
            alert(`Display name is required for author #${invalidAuthor.id}.`);
            return;
        }

        setSavingId("all");
        try {
            const responses = await Promise.all(
                authors.map((author) => updateAuthor(author.id, buildPayload(drafts[author.id])))
            );
            const updatedAuthors = responses
                .map((response) => response.data)
                .sort((a, b) => (a.sort_order ?? a.id) - (b.sort_order ?? b.id));
            setAuthors(updatedAuthors);
            setDrafts(Object.fromEntries(updatedAuthors.map((author) => [author.id, buildDraft(author)])));
        } catch (err) {
            console.error("Save all authors failed:", err);
            alert("Could not save all authors.");
        } finally {
            setSavingId(null);
        }
    }

    if (loading) return <div style={{ padding: 20 }}>Loading authors...</div>;

    return (
        <div className="manage-authors-page" style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
            <form id="manage-authors-save-form" onSubmit={saveAllAuthors} />
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
                    const saving = savingId === author.id || savingId === "all";

                    return (
                        <div
                            key={author.id}
                            style={{
                                border: "1px solid rgba(0, 0, 0, 0.14)",
                                borderRadius: 8,
                                padding: 14,
                                display: "grid",
                                gap: 19,
                                position: "relative",
                            }}
                        >
                            <label className="author-visibility-toggle" title={draft.show_on_timeline ? "Visible on the public timeline" : "Hidden from the public timeline"}>
                                <input
                                    type="checkbox"
                                    checked={!!draft.show_on_timeline}
                                    onChange={(e) => updateDraft(author.id, "show_on_timeline", e.target.checked)}
                                />
                                <span>Timeline Public</span>
                            </label>

                            <div className="manage-author-header" style={{ display: "flex", gap: 14, alignItems: "center", paddingRight: 112 }}>
                                <Avatar
                                    url={draft.profile_photo_url || draft.ig_pfp_url || draft.twitter_pfp_url}
                                    authorId={author.id}
                                    name={draft.name}
                                />
                                <div>
                                    <strong className="manage-author-name">{draft.name || `Author #${author.id}`}</strong>
                                    <div style={{ fontSize: "0.85rem", color: "#777" }}>ID {author.id}</div>
                                </div>
                            </div>

                            {FIELD_GROUPS.map((group) => (
                                <section key={group.title} style={{ display: "grid", gap: 0 }}>
                                    <h3 style={{ margin: "0 0 -2px", fontSize: "0.78rem", lineHeight: 1, color: "#777", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                        {group.title}
                                    </h3>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", columnGap: 12, rowGap: 0 }}>
                                        {group.fields.map((field) => (
                                            <div className="eventform-section" key={field.key} style={{ marginBottom: 0 }}>
                                                <label>
                                                    {field.label} {field.required && <span className="form-required">*</span>}
                                                </label>
                                                <input
                                                    type={field.type || "text"}
                                                    value={draft[field.key] || ""}
                                                    onChange={(e) => updateDraft(author.id, field.key, e.target.value)}
                                                    required={field.required}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ))}

                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "end", flexWrap: "wrap", paddingTop: 4 }}>
                                <div className="eventform-section" style={{ width: 190, marginBottom: 0 }}>
                                    <label style={{ whiteSpace: "nowrap" }}>Display Order <span style={{ fontWeight: 400, opacity: 0.65 }}>(lower first)</span></label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={draft.sort_order}
                                        onChange={(e) => updateDraft(author.id, "sort_order", e.target.value)}
                                    />
                                </div>
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
