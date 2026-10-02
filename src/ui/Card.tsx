import { createElement } from "react";
import type { ElementType, HTMLAttributes } from "react";
import "../styles/UI.css";
import { cx } from "./classNames";

export interface CardProps extends HTMLAttributes<HTMLElement> {
    as?: ElementType;
}

export default function Card({ as = "section", className = "", children, ...props }: CardProps) {
    return createElement(as, {
        ...props,
        className: cx("ui-card", className),
    }, children);
}
