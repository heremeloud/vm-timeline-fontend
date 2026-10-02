import { cloneElement, isValidElement, useId } from "react";
import type { ReactElement, ReactNode } from "react";
import "../styles/UI.css";
import { cx } from "./classNames";

interface ControlProps {
    id?: string;
    required?: boolean;
    "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
    "aria-describedby"?: string;
}

export interface FormFieldProps {
    id?: string;
    label: ReactNode;
    hint?: ReactNode;
    error?: ReactNode;
    required?: boolean;
    className?: string;
    children: ReactNode;
}

export default function FormField({
    id,
    label,
    hint,
    error,
    required = false,
    className = "",
    children,
}: FormFieldProps) {
    const generatedId = useId();
    const controlId = id || `ui-field-${generatedId.replace(/:/g, "")}`;
    const hintId = hint ? `${controlId}-hint` : undefined;
    const errorId = error ? `${controlId}-error` : undefined;
    const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
    const control = isValidElement<ControlProps>(children)
        ? cloneElement(children as ReactElement<ControlProps>, {
            id: children.props.id || controlId,
            required: children.props.required ?? required,
            "aria-invalid": error ? "true" : children.props["aria-invalid"],
            "aria-describedby": [children.props["aria-describedby"], describedBy].filter(Boolean).join(" ") || undefined,
        })
        : children;

    return (
        <div className={cx("ui-form-field", className)}>
            <label className="ui-form-field__label" htmlFor={controlId}>
                {label}
                {required && <span className="ui-form-field__required" aria-hidden="true"> *</span>}
            </label>
            {control}
            {hint && <div id={hintId} className="ui-form-field__hint">{hint}</div>}
            {error && <div id={errorId} className="ui-form-field__error" role="alert">{error}</div>}
        </div>
    );
}
