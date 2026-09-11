import { useEffect, useMemo, useRef, useState } from "react";
import { createAuthor, getAuthors, updateAuthor } from "../api/authorsService";
import Avatar from "../components/Avatar";
import VisibilityToggle from "../components/VisibilityToggle";
import "../styles/EventForm.css";

const CATEGORY_OPTIONS = [
    { value: "artist", label: "Artist" },
    { value: "crew", label: "Crew" },
    { value: "official", label: "Official Account" },
    { value: "family_friend", label: "Friends & Family" },
    { value: "fan", label: "Fan Account" },
];
const DEFAULT_CATEGORY = "artist";

const FIELD_GROUPS = [
    {
        title: "Identity",
        fields: [
            { key: "name", label: "Display Name", required: true },
            { key: "nickname", label: "Nickname" },
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
        category: author.category || DEFAULT_CATEGORY,
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
        category: draft.category || DEFAULT_CATEGORY,
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
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [draggedAuthorId, setDraggedAuthorId] = useState(null);
    const [dragTarget, setDragTarget] = useState(null);
    const [editingAuthorId, setEditingAuthorId] = useState(null);
    const dialogRef = useRef(null);

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

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (editingAuthorId !== null) {
            if (!dialog.open) dialog.showModal();
        } else if (dialog.open) {
            dialog.close();
        }
    }, [editingAuthorId]);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const handleClose = () => setEditingAuthorId(null);
        dialog.addEventListener("close", handleClose);
        return () => dialog.removeEventListener("close", handleClose);
    }, []);

    const categoryCounts = useMemo(() => {
        const counts = { all: authors.length };
        CATEGORY_OPTIONS.forEach((opt) => { counts[opt.value] = 0; });
        authors.forEach((author) => {
            const category = drafts[author.id]?.category || author.category || DEFAULT_CATEGORY;
            counts[category] = (counts[category] || 0) + 1;
        });
        return counts;
    }, [authors, drafts]);

    const reorderLocked = !!query.trim() || categoryFilter !== "all";

    const visibleAuthors = useMemo(() => {
        const term = query.trim().toLowerCase();
        return authors.filter((author) => {
            const category = drafts[author.id]?.category || author.category || DEFAULT_CATEGORY;
            if (categoryFilter !== "all" && category !== categoryFilter) return false;
            if (!term) return true;
            return [author.name, author.nickname, author.full_name, author.instagram_url, author.twitter_url]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(term));
        });
    }, [authors, query, categoryFilter, drafts]);

    function updateDraft(authorId, key, value) {
        setDrafts((current) => ({
            ...current,
            [authorId]: {
                ...current[authorId],
                [key]: value,
            },
        }));
    }

    function reorderAuthor(targetAuthorId, position) {
        if (!draggedAuthorId || draggedAuthorId === targetAuthorId || reorderLocked) return;

        const fromIndex = authors.findIndex((author) => author.id === draggedAuthorId);
        if (fromIndex < 0) return;

        const reordered = [...authors];
        const [moved] = reordered.splice(fromIndex, 1);
        const targetIndex = reordered.findIndex((author) => author.id === targetAuthorId);
        if (targetIndex < 0) return;
        reordered.splice(position === "after" ? targetIndex + 1 : targetIndex, 0, moved);
        setAuthors(reordered);
        setDrafts((currentDrafts) => {
            const nextDrafts = { ...currentDrafts };
            reordered.forEach((author, index) => {
                nextDrafts[author.id] = {
                    ...nextDrafts[author.id],
                    sort_order: index + 1,
                };
            });
            return nextDrafts;
        });
    }

    function addAuthor() {
        const temporaryId = `new-${Date.now()}`;
        const nextSortOrder = Math.max(
            0,
            ...authors.map((author) => Number(drafts[author.id]?.sort_order ?? author.sort_order ?? 0))
        ) + 1;
        const newAuthor = { id: temporaryId, isNew: true, name: "", sort_order: nextSortOrder };

        setAuthors((current) => [...current, newAuthor]);
        setDrafts((current) => ({ ...current, [temporaryId]: buildDraft(newAuthor) }));
        setQuery("");
        setCategoryFilter("all");
        setEditingAuthorId(temporaryId);
    }

    async function saveAuthor(author) {
        const draft = drafts[author.id];
        if (!draft?.name?.trim()) {
            alert("Display name is required.");
            return;
        }

        setSavingId(author.id);
        try {
            const res = author.isNew
                ? await createAuthor(buildPayload(draft))
                : await updateAuthor(author.id, buildPayload(draft));
            const updated = res.data;
            setAuthors((current) =>
                current
                    .map((row) => row.id === author.id ? updated : row)
                    .sort((a, b) => (a.sort_order ?? a.id) - (b.sort_order ?? b.id))
            );
            setDrafts((current) => ({
                ...Object.fromEntries(Object.entries(current).filter(([id]) => id !== String(author.id))),
                [updated.id]: buildDraft(updated),
            }));
            setEditingAuthorId((current) => current === author.id ? null : current);
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
            alert(invalidAuthor.isNew
                ? "Display name is required for the new author."
                : `Display name is required for author #${invalidAuthor.id}.`);
            return;
        }

        setSavingId("all");
        try {
            const responses = await Promise.all(
                authors.map((author) => author.isNew
                    ? createAuthor(buildPayload(drafts[author.id]))
                    : updateAuthor(author.id, buildPayload(drafts[author.id])))
            );
            const updatedAuthors = responses
                .map((response) => response.data)
                .sort((a, b) => (a.sort_order ?? a.id) - (b.sort_order ?? b.id));
            setAuthors(updatedAuthors);
            setDrafts(Object.fromEntries(updatedAuthors.map((author) => [author.id, buildDraft(author)])));
            setEditingAuthorId(null);
        } catch (err) {
            console.error("Save all authors failed:", err);
            alert("Could not save all authors.");
        } finally {
            setSavingId(null);
        }
    }

    if (loading) return <div style={{ padding: 20 }}>Loading authors...</div>;

    const editingAuthor = authors.find((author) => author.id === editingAuthorId) || null;
    const editingDraft = editingAuthor ? (drafts[editingAuthor.id] || buildDraft(editingAuthor)) : null;
    const editingSaving = editingAuthor && (savingId === editingAuthor.id || savingId === "all");

    return (
        <div className="manage-authors-page" style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
            <form id="manage-authors-save-form" onSubmit={saveAllAuthors} />
            <button
                id="manage-authors-add-button"
                type="button"
                onClick={addAuthor}
                hidden
            />
            <div className="manage-authors-toolbar">
                <div>
                    <h2 style={{ marginBottom: 4 }}>Manage Authors</h2>
                    <p style={{ marginTop: 0, color: "#777" }}>{authors.length} authors</p>
                </div>

                <div className="eventform-section" style={{ minWidth: 260, marginBottom: 0 }}>
                    <label>Search</label>
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Name, nickname, or social URL"
                    />
                </div>
            </div>

            <div className="manage-authors-filter-tabs" role="tablist" aria-label="Filter by category">
                <button
                    type="button"
                    role="tab"
                    aria-selected={categoryFilter === "all"}
                    className={`manage-authors-filter-tab${categoryFilter === "all" ? " is-active" : ""}`}
                    onClick={() => setCategoryFilter("all")}
                >
                    All <span className="manage-authors-filter-count">{categoryCounts.all}</span>
                </button>
                {CATEGORY_OPTIONS.map((opt) => (
                    <button
                        key={opt.value}
                        type="button"
                        role="tab"
                        aria-selected={categoryFilter === opt.value}
                        className={`manage-authors-filter-tab${categoryFilter === opt.value ? " is-active" : ""}`}
                        onClick={() => setCategoryFilter(opt.value)}
                    >
                        {opt.label} <span className="manage-authors-filter-count">{categoryCounts[opt.value] || 0}</span>
                    </button>
                ))}
            </div>

            {reorderLocked && (
                <p className="manage-authors-lock-note">Clear the search and set the category filter to "All" to drag-reorder authors.</p>
            )}

            <div className="manage-authors-list">
                {visibleAuthors.map((author) => {
                    const draft = drafts[author.id] || buildDraft(author);
                    const isDragging = draggedAuthorId === author.id;
                    const category = draft.category || DEFAULT_CATEGORY;

                    return (
                        <div
                            key={author.id}
                            data-author-id={author.id}
                            className={`manage-authors-row${isDragging ? " is-dragging" : ""}`}
                            onDragOver={(e) => {
                                if (!reorderLocked) {
                                    e.preventDefault();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const position = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
                                    setDragTarget({ id: author.id, position });
                                }
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                reorderAuthor(author.id, dragTarget?.position || "before");
                                setDraggedAuthorId(null);
                                setDragTarget(null);
                            }}
                        >
                            {dragTarget?.id === author.id && draggedAuthorId !== author.id && (
                                <div
                                    aria-hidden="true"
                                    style={{
                                        position: "absolute",
                                        left: 8,
                                        right: 8,
                                        [dragTarget.position === "before" ? "top" : "bottom"]: -5,
                                        height: 4,
                                        borderRadius: 999,
                                        background: "#a76719",
                                        boxShadow: "0 0 0 2px #fff8ef",
                                        zIndex: 5,
                                        pointerEvents: "none",
                                    }}
                                />
                            )}

                            <button
                                type="button"
                                className="manage-authors-drag-handle"
                                draggable={!reorderLocked}
                                onDragStart={(e) => {
                                    setDraggedAuthorId(author.id);
                                    e.dataTransfer.effectAllowed = "move";
                                    e.dataTransfer.setData("text/plain", String(author.id));
                                }}
                                onDragEnd={() => {
                                    setDraggedAuthorId(null);
                                    setDragTarget(null);
                                }}
                                title={reorderLocked ? "Clear search and category filter to reorder" : "Drag to change display order"}
                                aria-label="Drag to change display order"
                                style={{ cursor: reorderLocked ? "not-allowed" : "grab" }}
                            >
                                ⋮⋮
                            </button>

                            <div className="manage-authors-avatar">
                                <Avatar
                                    url={draft.profile_photo_url || draft.ig_pfp_url || draft.twitter_pfp_url}
                                    authorId={author.id}
                                    name={draft.name}
                                />
                            </div>

                            <div className="manage-authors-row-info">
                                <strong>
                                    {draft.name || (author.isNew ? "New Author" : `Author #${author.id}`)}
                                    {draft.nickname && <span className="manage-authors-nickname"> "{draft.nickname}"</span>}
                                </strong>
                                <div className="manage-authors-row-sub">{author.isNew ? "Not saved yet" : `ID ${author.id}`}</div>
                            </div>

                            <select
                                className={`author-category-select cat-${category}`}
                                value={category}
                                onChange={(e) => updateDraft(author.id, "category", e.target.value)}
                                aria-label={`Category for ${draft.name || "author"}`}
                            >
                                {CATEGORY_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>

                            <VisibilityToggle
                                className="manage-authors-row-toggle"
                                checked={!!draft.show_on_timeline}
                                onChange={(e) => updateDraft(author.id, "show_on_timeline", e.target.checked)}
                                label="Public"
                                title={draft.show_on_timeline ? "Visible on the public timeline" : "Hidden from the public timeline"}
                            />

                            <button
                                type="button"
                                className="manage-authors-row-edit"
                                onClick={() => setEditingAuthorId(author.id)}
                            >
                                Edit
                            </button>
                        </div>
                    );
                })}

                {visibleAuthors.length === 0 && (
                    <p style={{ color: "#777" }}>No authors match that search.</p>
                )}
            </div>

            <dialog
                ref={dialogRef}
                className="manage-authors-dialog"
                aria-labelledby="manage-authors-dialog-title"
                onClick={(e) => { if (e.target === dialogRef.current) dialogRef.current.close(); }}
            >
                <button
                    type="button"
                    className="manage-authors-dialog-close"
                    aria-label="Close editor"
                    onClick={() => dialogRef.current?.close()}
                >
                    ×
                </button>

                {editingAuthor && editingDraft && (
                    <>
                        <div className="manage-authors-dialog-header">
                            <Avatar
                                url={editingDraft.profile_photo_url || editingDraft.ig_pfp_url || editingDraft.twitter_pfp_url}
                                authorId={editingAuthor.id}
                                name={editingDraft.name}
                            />
                            <div>
                                <h3 id="manage-authors-dialog-title">
                                    {editingDraft.name || (editingAuthor.isNew ? "New Author" : `Author #${editingAuthor.id}`)}
                                </h3>
                                <span>{editingAuthor.isNew ? "Not saved yet" : `ID ${editingAuthor.id}`}</span>
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end", margin: "14px 0" }}>
                            <div className="eventform-section" style={{ margin: 0, minWidth: 180 }}>
                                <label>Category</label>
                                <select
                                    value={editingDraft.category || DEFAULT_CATEGORY}
                                    onChange={(e) => updateDraft(editingAuthor.id, "category", e.target.value)}
                                >
                                    {CATEGORY_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <VisibilityToggle
                                checked={!!editingDraft.show_on_timeline}
                                onChange={(e) => updateDraft(editingAuthor.id, "show_on_timeline", e.target.checked)}
                                label="Timeline Public"
                                title={editingDraft.show_on_timeline ? "Visible on the public timeline" : "Hidden from the public timeline"}
                            />
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
                                                value={editingDraft[field.key] || ""}
                                                onChange={(e) => updateDraft(editingAuthor.id, field.key, e.target.value)}
                                                required={field.required}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}

                        <div className="eventform-section" style={{ width: 190 }}>
                            <label style={{ whiteSpace: "nowrap" }}>Display Order <span style={{ fontWeight: 400, opacity: 0.65 }}>(lower first)</span></label>
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={editingDraft.sort_order}
                                onChange={(e) => updateDraft(editingAuthor.id, "sort_order", e.target.value)}
                            />
                        </div>

                        <div className="manage-authors-dialog-actions">
                            <button type="button" onClick={() => dialogRef.current?.close()}>Close</button>
                            <button type="button" disabled={editingSaving} onClick={() => saveAuthor(editingAuthor)}>
                                {editingSaving ? "Saving..." : "Save Author"}
                            </button>
                        </div>
                    </>
                )}
            </dialog>
        </div>
    );
}
