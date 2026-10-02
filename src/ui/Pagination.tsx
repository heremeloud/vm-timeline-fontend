import { useId } from "react";
import "../styles/UI.css";
import { cx } from "./classNames";

export interface PaginationProps {
    page: number;
    /** Shown as "Page 2 / 9" and used as the jump field's maximum when known. */
    lastPage?: number | null;
    onPrevious: () => void;
    onNext: () => void;
    previousDisabled?: boolean;
    nextDisabled?: boolean;
    /** The "Jump to" field is controlled by the page; it submits on Enter or blur. */
    jumpValue: string;
    onJumpChange: (value: string) => void;
    onJump: () => void;
    /** Keep the controls and jump field on one row, as Manage Display does. */
    inline?: boolean;
    className?: string;
}

/** Shared Timeline / Events / Manage Display pagination bar. */
export default function Pagination({
    page,
    lastPage = null,
    onPrevious,
    onNext,
    previousDisabled = page <= 1,
    nextDisabled = false,
    jumpValue,
    onJumpChange,
    onJump,
    inline = false,
    className = "",
}: PaginationProps) {
    const inputId = `pagination-jump-${useId().replace(/:/g, "")}`;

    return (
        <div className={cx("pagination-bar", inline && "pagination-bar--inline", className)}>
            <div className="pagination-controls">
                <button type="button" className="ui-button pagination-btn" onClick={onPrevious} disabled={previousDisabled}>
                    ‹ Prev
                </button>
                <span>
                    Page {page}
                    {lastPage ? ` / ${lastPage}` : ""}
                </span>
                <button type="button" className="ui-button pagination-btn" onClick={onNext} disabled={nextDisabled}>
                    Next ›
                </button>
            </div>
            <div className="pagination-jump">
                <label className="pagination-jump-label" htmlFor={inputId}>Jump to:</label>
                <input
                    id={inputId}
                    type="number"
                    min="1"
                    max={lastPage || undefined}
                    value={jumpValue}
                    onChange={(event) => onJumpChange(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") onJump();
                    }}
                    onBlur={() => {
                        if (jumpValue) onJump();
                    }}
                    className="jump-to-input"
                />
            </div>
        </div>
    );
}
