import type { ReactNode } from "react";
import "../styles/UI.css";
import { cx } from "./classNames";

export type AlertVariant = "info" | "success" | "warning" | "error";

export interface AlertProps {
    variant?: AlertVariant;
    title?: ReactNode;
    className?: string;
    children?: ReactNode;
}

export default function Alert({ variant = "info", title, className = "", children }: AlertProps) {
    return (
        <div className={cx("ui-alert", `ui-alert--${variant}`, className)} role={variant === "error" ? "alert" : "status"}>
            {title && <strong className="ui-alert__title">{title}</strong>}
            <div>{children}</div>
        </div>
    );
}
