import type { ButtonHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import type { LinkProps } from "react-router-dom";
import "../styles/UI.css";
import { cx } from "./classNames";

interface FloatingActionBase {
    /** The accessible name; the visible content is always a "+". */
    label: string;
    className?: string;
}

export type FloatingActionButtonProps = FloatingActionBase
    & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label" | "className">;

export type FloatingActionLinkProps = FloatingActionBase
    & Omit<LinkProps, "children" | "aria-label" | "className">;

/** The round "+" create control pinned to the page edge; use the link form for navigation. */
export function FloatingActionButton({ label, className = "", ...props }: FloatingActionButtonProps) {
    return (
        <button type="button" className={cx("ui-fab", className)} aria-label={label} title={label} {...props}>
            +
        </button>
    );
}

export function FloatingActionLink({ label, className = "", ...props }: FloatingActionLinkProps) {
    return (
        <Link className={cx("ui-fab", className)} aria-label={label} title={label} {...props}>
            +
        </Link>
    );
}
