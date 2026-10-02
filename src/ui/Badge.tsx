import type { HTMLAttributes } from "react";
import "../styles/UI.css";
import { cx } from "./classNames";

export type BadgeVariant = "neutral" | "accent" | "info" | "success" | "warning" | "danger";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
}

export default function Badge({ variant = "neutral", className = "", children, ...props }: BadgeProps) {
    return (
        <span className={cx("ui-badge", `ui-badge--${variant}`, className)} {...props}>
            {children}
        </span>
    );
}
