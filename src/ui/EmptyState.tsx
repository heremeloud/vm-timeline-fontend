import type { ReactNode } from "react";
import "../styles/UI.css";
import { cx } from "./classNames";

export interface EmptyStateProps {
    icon?: ReactNode;
    title: ReactNode;
    children?: ReactNode;
    action?: ReactNode;
    className?: string;
}

export default function EmptyState({ icon, title, children, action, className = "" }: EmptyStateProps) {
    return (
        <div className={cx("ui-empty-state", className)}>
            {icon && <div className="ui-empty-state__icon" aria-hidden="true">{icon}</div>}
            <h2 className="ui-empty-state__title">{title}</h2>
            {children && <div className="ui-empty-state__body">{children}</div>}
            {action && <div className="ui-empty-state__action">{action}</div>}
        </div>
    );
}
