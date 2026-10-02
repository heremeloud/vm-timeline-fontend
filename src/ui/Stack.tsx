import type { HTMLAttributes } from "react";
import "../styles/UI.css";
import { cx } from "./classNames";
import type { Gap } from "./Inline";

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
    gap?: Gap;
}

export default function Stack({ gap = "3", className = "", children, ...props }: StackProps) {
    return <div className={cx("ui-stack", `ui-gap-${gap}`, className)} {...props}>{children}</div>;
}
