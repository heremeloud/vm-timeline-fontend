import type { HTMLAttributes } from "react";
import "../styles/UI.css";
import { cx } from "./classNames";

export type Gap = "1" | "2" | "3" | "4";

export interface InlineProps extends HTMLAttributes<HTMLDivElement> {
    gap?: Gap;
}

export default function Inline({ gap = "2", className = "", children, ...props }: InlineProps) {
    return <div className={cx("ui-inline", `ui-gap-${gap}`, className)} {...props}>{children}</div>;
}
