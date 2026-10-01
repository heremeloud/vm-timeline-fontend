import "../styles/UI.css";

export default function Badge({ variant = "neutral", className = "", children, ...props }) {
    return (
        <span className={["ui-badge", `ui-badge--${variant}`, className].filter(Boolean).join(" ")} {...props}>
            {children}
        </span>
    );
}
