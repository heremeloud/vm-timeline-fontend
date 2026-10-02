import type { InputHTMLAttributes, ReactNode } from "react";
import "../styles/UI.css";
import { cx } from "./classNames";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
    label: ReactNode;
}

export default function Checkbox({ label, className = "", ...props }: CheckboxProps) {
    return (
        <label className={cx("ui-checkbox", className)}>
            <input type="checkbox" {...props} />
            <span>{label}</span>
        </label>
    );
}
