import { cloneElement, isValidElement, useId } from "react";
import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import "../styles/UI.css";
import { cx } from "./classNames";

export default function FilterBar({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cx("ui-filter-bar", className)} {...props}>{children}</div>;
}

export function FilterRow({ className = "", children }: { className?: string; children?: ReactNode }) {
    return <div className={cx("ui-filter-row", className)}>{children}</div>;
}

export interface FilterFieldProps {
    label: ReactNode;
    id?: string;
    className?: string;
    children: ReactNode;
}

export function FilterField({ label, id, className = "", children }: FilterFieldProps) {
    const generatedId = useId();
    const controlId = id || `ui-filter-${generatedId.replace(/:/g, "")}`;
    const control = isValidElement<{ id?: string }>(children) && !children.props.id
        ? cloneElement(children as ReactElement<{ id?: string }>, { id: controlId })
        : children;
    return (
        <div className={cx("ui-filter-field", className)}>
            <label htmlFor={controlId}>{label}</label>
            {control}
        </div>
    );
}

export function FilterDivider({ className = "" }: { className?: string }) {
    return <div className={cx("ui-filter-divider", className)} aria-hidden="true" />;
}
