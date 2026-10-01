import { cloneElement, isValidElement, useId } from "react";
import "../styles/UI.css";

export default function FilterBar({ className = "", children, ...props }) {
    return <div className={["ui-filter-bar", className].filter(Boolean).join(" ")} {...props}>{children}</div>;
}

export function FilterRow({ className = "", children }) {
    return <div className={["ui-filter-row", className].filter(Boolean).join(" ")}>{children}</div>;
}

export function FilterField({ label, id, className = "", children }) {
    const generatedId = useId();
    const controlId = id || `ui-filter-${generatedId.replace(/:/g, "")}`;
    const control = isValidElement(children) && !children.props.id
        ? cloneElement(children, { id: controlId })
        : children;
    return (
        <div className={["ui-filter-field", className].filter(Boolean).join(" ")}>
            <label htmlFor={controlId}>{label}</label>
            {control}
        </div>
    );
}

export function FilterDivider({ className = "" }) {
    return <div className={["ui-filter-divider", className].filter(Boolean).join(" ")} aria-hidden="true" />;
}
