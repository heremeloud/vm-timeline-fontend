import type { SelectHTMLAttributes } from "react";
import "../styles/UI.css";
import { cx } from "./classNames";

export default function Select({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select className={cx("ui-control", "ui-select", className)} {...props}>
            {children}
        </select>
    );
}
