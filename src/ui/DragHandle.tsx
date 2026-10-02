import type { ButtonHTMLAttributes } from "react";
import "../styles/UI.css";
import { cx } from "./classNames";

export interface DragHandleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "draggable" | "aria-label"> {
    label?: string;
}

export default function DragHandle({
    label = "Drag to reorder",
    disabled = false,
    className = "",
    ...dragProps
}: DragHandleProps) {
    return (
        <button
            type="button"
            className={cx("ui-button", "ui-drag-handle", className)}
            draggable={!disabled}
            disabled={disabled}
            aria-label={label}
            title={label}
            {...dragProps}
        >
            <span aria-hidden="true">⋮⋮</span>
        </button>
    );
}
