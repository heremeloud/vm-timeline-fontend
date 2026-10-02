import type { ChangeEventHandler } from "react";
import "../styles/VisibilityToggle.css";

interface VisibilityToggleProps {
    checked: boolean;
    onChange: ChangeEventHandler<HTMLInputElement>;
    disabled?: boolean;
    label?: string;
    title?: string;
    ariaLabel?: string;
    className?: string;
}

// The shared "Public" checkbox used across the admin surfaces.
export default function VisibilityToggle({ checked, onChange, disabled = false, label = "Public", title, ariaLabel, className = "" }: VisibilityToggleProps) {
    return <label className={`visibility-toggle ${className}`.trim()} title={title ?? (checked ? "Visible to the public" : "Hidden from the public")}>
        <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} aria-label={ariaLabel} />
        <span>{label}</span>
    </label>;
}
