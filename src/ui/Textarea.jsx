import "../styles/UI.css";

export default function Textarea({ className = "", ...props }) {
    return <textarea className={["ui-control", "ui-textarea", className].filter(Boolean).join(" ")} {...props} />;
}
