import "../styles/UI.css";

export default function Checkbox({ label, className = "", ...props }) {
    return (
        <label className={["ui-checkbox", className].filter(Boolean).join(" ")}>
            <input type="checkbox" {...props} />
            <span>{label}</span>
        </label>
    );
}
