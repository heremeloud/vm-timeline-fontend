import "../styles/UI.css";

export default function Alert({ variant = "info", title, className = "", children }) {
    return (
        <div className={["ui-alert", `ui-alert--${variant}`, className].filter(Boolean).join(" ")} role={variant === "error" ? "alert" : "status"}>
            {title && <strong className="ui-alert__title">{title}</strong>}
            <div>{children}</div>
        </div>
    );
}
