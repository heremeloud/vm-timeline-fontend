import "../styles/UI.css";

export default function Inline({ gap = "2", className = "", children, ...props }) {
    return <div className={["ui-inline", `ui-gap-${gap}`, className].filter(Boolean).join(" ")} {...props}>{children}</div>;
}
