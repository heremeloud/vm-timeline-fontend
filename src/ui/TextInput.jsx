import "../styles/UI.css";

export default function TextInput({ className = "", ...props }) {
    return <input className={["ui-control", className].filter(Boolean).join(" ")} {...props} />;
}
