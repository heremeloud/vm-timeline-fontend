import type { ButtonHTMLAttributes } from "react";
import "../styles/UI.css";
import { cx } from "./classNames";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "add" | "insert" | "save";
export type ButtonSize = "small" | "medium" | "large";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
}

export default function Button({
    variant = "secondary",
    size = "medium",
    className = "",
    type = "button",
    ...props
}: ButtonProps) {
    return <button type={type} className={cx("ui-button", `ui-button--${variant}`, `ui-button--${size}`, className)} {...props} />;
}
