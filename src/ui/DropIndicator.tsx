import "../styles/UI.css";
import { cx } from "./classNames";

export interface DropIndicatorProps {
    /** Which edge of the hovered row the dragged item will land on. */
    position: "before" | "after";
    /** Use the tighter offset for lists whose rows sit closer together. */
    compact?: boolean;
}

/**
 * The bar shown on a row while another row is dragged over it.
 * The row must be `position: relative`; the row stays responsible for `onDragOver` and `onDrop`.
 */
export default function DropIndicator({ position, compact = false }: DropIndicatorProps) {
    return (
        <div
            aria-hidden="true"
            className={cx("ui-drop-indicator", `ui-drop-indicator--${position}`, compact && "ui-drop-indicator--compact")}
        />
    );
}
