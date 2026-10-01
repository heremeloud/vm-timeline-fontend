import "../styles/UI.css";

export default function EmptyState({ icon, title, children, action, className = "" }) {
    return (
        <div className={["ui-empty-state", className].filter(Boolean).join(" ")}>
            {icon && <div className="ui-empty-state__icon" aria-hidden="true">{icon}</div>}
            <h2 className="ui-empty-state__title">{title}</h2>
            {children && <div className="ui-empty-state__body">{children}</div>}
            {action && <div className="ui-empty-state__action">{action}</div>}
        </div>
    );
}
