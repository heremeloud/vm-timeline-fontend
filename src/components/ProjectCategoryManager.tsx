import { useState } from "react";
import type { FormEvent } from "react";
import {
    createProjectCategory,
    deleteProjectCategory,
    updateProjectCategory,
} from "../api/projectCategoriesService";
import { errorDetail } from "../utils/errors";
import type { Id, ProjectCategoryOption } from "../types/models";
import VisibilityToggle from "./VisibilityToggle";
import { Alert, Button, DragHandle, DropIndicator, Inline, reorderItems } from "../ui";

type SavedCategory = ProjectCategoryOption & { id: Id };
type DropPosition = "before" | "after";

interface ProjectCategoryManagerProps {
    categories: ProjectCategoryOption[];
    loading: boolean;
    reload: () => Promise<void>;
}

/** Add, rename, reorder and delete project categories (Manage Display → Projects). */
export default function ProjectCategoryManager({ categories, loading, reload }: ProjectCategoryManagerProps) {
    const saved = categories.filter((category): category is SavedCategory => category.id != null);
    const [newCategory, setNewCategory] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [editingId, setEditingId] = useState<Id | null>(null);
    const [editName, setEditName] = useState("");
    const [editLabel, setEditLabel] = useState("");
    const [draggedId, setDraggedId] = useState<Id | null>(null);
    const [dropTarget, setDropTarget] = useState<{ id: Id; position: DropPosition } | null>(null);

    async function run(action: () => Promise<unknown>) {
        setSaving(true);
        setError("");
        try {
            await action();
            await reload();
            return true;
        } catch (err) {
            console.error("Project category update failed:", err);
            setError(errorDetail(err, "Could not update project categories."));
            return false;
        } finally {
            setSaving(false);
        }
    }

    async function addCategory(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!newCategory.trim()) return;
        if (await run(() => createProjectCategory({ name: newCategory }))) setNewCategory("");
    }

    function startEditing(category: SavedCategory) {
        setEditingId(category.id);
        setEditName(category.value);
        setEditLabel(category.label);
    }

    async function saveEdit(category: SavedCategory) {
        const changes = {
            ...(editName.trim() !== category.value && !category.is_protected ? { name: editName } : {}),
            ...(editLabel.trim() !== category.label ? { label: editLabel } : {}),
        };
        if (Object.keys(changes).length === 0 || await run(() => updateProjectCategory(category.id, changes))) setEditingId(null);
    }

    async function removeCategory(category: SavedCategory) {
        if (!confirm(`Delete the “${category.label}” category? Categories used by projects cannot be deleted.`)) return;
        await run(() => deleteProjectCategory(category.id));
    }

    function dropCategory(targetId: Id, position: DropPosition) {
        if (draggedId == null || draggedId === targetId) return;
        const from = saved.findIndex((item) => item.id === draggedId);
        let to = saved.findIndex((item) => item.id === targetId);
        if (position === "after" && from > to) to += 1;
        if (position === "before" && from < to) to -= 1;
        const reordered = reorderItems(saved, from, to);
        void run(() => Promise.all(reordered.map((item, index) =>
            item.sort_order === index ? Promise.resolve() : updateProjectCategory(item.id, { sort_order: index })
        )));
        setDraggedId(null);
        setDropTarget(null);
    }

    return (
        <section className="eventform-section eventform-form">
            <h3 style={{ marginBottom: 4 }}>Project categories</h3>
            <p className="eventform-field-note">
                Drag categories into the order used by the Projects filter and the project forms. Hiding a category only removes it
                from the public Projects filter; its projects still appear and you can still choose it in the project forms. “Series” is built in:
                you can change its label, but it can't be renamed or deleted.
            </p>
            {error && <Alert variant="error">{error}</Alert>}
            <form className="event-setup-add-row" onSubmit={addCategory}>
                <label style={{ flex: "1 1 220px" }}>
                    New category
                    <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="e.g. Commercial" maxLength={60} />
                </label>
                <Button variant="add" size="large" className="event-setup-add-button" type="submit" disabled={saving || !newCategory.trim()}>+ Add category</Button>
            </form>
            <div className="manage-authors-list">
                {loading ? <p>Loading...</p> : saved.map((category) => {
                    const position = dropTarget?.id === category.id ? dropTarget.position : null;
                    const editing = editingId === category.id;
                    return (
                        <div
                            key={category.id}
                            className={`manage-authors-row${draggedId === category.id ? " is-dragging" : ""}`}
                            onDragOver={(event) => {
                                event.preventDefault();
                                const rect = event.currentTarget.getBoundingClientRect();
                                setDropTarget({ id: category.id, position: event.clientY < rect.top + rect.height / 2 ? "before" : "after" });
                            }}
                            onDrop={(event) => {
                                event.preventDefault();
                                dropCategory(category.id, dropTarget?.position || "before");
                            }}
                        >
                            {position && draggedId !== category.id && <DropIndicator position={position} compact />}
                            <DragHandle
                                onDragStart={(event) => {
                                    setDraggedId(category.id);
                                    event.dataTransfer.effectAllowed = "move";
                                    event.dataTransfer.setData("text/plain", String(category.id));
                                }}
                                onDragEnd={() => { setDraggedId(null); setDropTarget(null); }}
                                label={`Drag ${category.label} to reorder`}
                            />
                            {editing ? (
                                <>
                                    <div className="manage-authors-row-info" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                        <label>
                                            Display label
                                            <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} maxLength={60} />
                                        </label>
                                        <label>
                                            Stored name
                                            <input
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                disabled={category.is_protected}
                                                maxLength={60}
                                            />
                                        </label>
                                    </div>
                                    <Button variant="save" size="small" disabled={saving} onClick={() => void saveEdit(category)}>Save</Button>
                                    <Button variant="ghost" size="small" disabled={saving} onClick={() => setEditingId(null)}>Cancel</Button>
                                </>
                            ) : (
                                <>
                                    <div className="manage-authors-row-info">
                                        <strong>{category.label}</strong>
                                        <div className="manage-authors-row-sub">
                                            {category.project_count ?? 0} project{category.project_count === 1 ? "" : "s"} · stored as “{category.value}”
                                            {category.is_protected ? " · built in" : ""}
                                        </div>
                                    </div>
                                    <Inline className="manage-display-actions">
                                        <VisibilityToggle
                                            className="manage-display-public-toggle"
                                            checked={category.is_visible !== false}
                                            disabled={saving}
                                            onChange={(e) => void run(() => updateProjectCategory(category.id, { is_visible: e.target.checked }))}
                                            label="Public"
                                            title={category.is_visible === false ? "Hidden from the public Projects filter" : "Shown in the public Projects filter"}
                                        />
                                    </Inline>
                                    <button type="button" className="manage-authors-row-edit" onClick={() => startEditing(category)}>Edit</button>
                                    <Button
                                        variant="danger"
                                        size="small"
                                        className="manage-display-delete"
                                        disabled={saving || category.is_protected}
                                        onClick={() => void removeCategory(category)}
                                    >
                                        Delete
                                    </Button>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
