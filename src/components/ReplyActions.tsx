import type { ReactNode } from "react";
import { Button } from "../ui";
import "../styles/ReplyActions.css";

interface ReplyAdminActionsProps {
    onEdit: () => void;
    onDelete: () => void;
}

/** Edit / Delete controls under a reply; shown to the signed-in admin only. */
export function ReplyAdminActions({ onEdit, onDelete }: ReplyAdminActionsProps) {
    if (!localStorage.getItem("jwt")) return null;

    return (
        <div className="reply-admin-actions">
            <Button variant="primary" size="small" onClick={onEdit}>Edit</Button>
            <Button variant="danger" size="small" onClick={onDelete}>Delete</Button>
        </div>
    );
}

interface ReplyEditActionsProps {
    onSave: () => void;
    onCancel: () => void;
    children?: ReactNode;
}

/** Save / Cancel row at the bottom of an inline reply editor. */
export function ReplyEditActions({ onSave, onCancel, children }: ReplyEditActionsProps) {
    return (
        <div className="reply-edit-actions">
            <Button variant="save" size="small" onClick={onSave}>Save</Button>
            <Button variant="secondary" size="small" onClick={onCancel}>Cancel</Button>
            {children}
        </div>
    );
}
