import "../styles/UI.css";

export default function DragHandle({
    label = "Drag to reorder",
    disabled = false,
    className = "",
    ...dragProps
}) {
    return (
        <button
            type="button"
            className={["ui-button", "ui-drag-handle", className].filter(Boolean).join(" ")}
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
