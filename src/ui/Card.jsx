import { createElement } from "react";
import "../styles/UI.css";

export default function Card({ as = "section", className = "", children, ...props }) {
    return createElement(as, {
        ...props,
        className: ["ui-card", className].filter(Boolean).join(" "),
    }, children);
}
