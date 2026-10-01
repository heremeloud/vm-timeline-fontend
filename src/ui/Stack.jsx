import "../styles/UI.css";

export default function Stack({ gap = "3", className = "", children, ...props }) {
    return <div className={["ui-stack", `ui-gap-${gap}`, className].filter(Boolean).join(" ")} {...props}>{children}</div>;
}
