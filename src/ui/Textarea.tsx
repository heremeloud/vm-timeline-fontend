import type { TextareaHTMLAttributes } from "react";
import "../styles/UI.css";
import { cx } from "./classNames";

export default function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea className={cx("ui-control", "ui-textarea", className)} {...props} />;
}
