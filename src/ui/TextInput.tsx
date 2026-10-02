import type { InputHTMLAttributes } from "react";
import "../styles/UI.css";
import { cx } from "./classNames";

export default function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
    return <input className={cx("ui-control", className)} {...props} />;
}
