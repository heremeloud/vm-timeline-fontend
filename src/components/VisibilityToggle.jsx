import "../styles/VisibilityToggle.css";

// The shared "Public" checkbox used across the admin surfaces.
export default function VisibilityToggle({ checked, onChange, disabled = false, label = "Public", title, ariaLabel, className = "" }) {
    return <label className={`visibility-toggle ${className}`.trim()} title={title ?? (checked ? "Visible to the public" : "Hidden from the public")}>
        <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} aria-label={ariaLabel} />
        <span>{label}</span>
    </label>;
}
