import { cloneElement, isValidElement, useId } from "react";
import "../styles/UI.css";

export default function FormField({
    id,
    label,
    hint,
    error,
    required = false,
    className = "",
    children,
}) {
    const generatedId = useId();
    const controlId = id || `ui-field-${generatedId.replace(/:/g, "")}`;
    const hintId = hint ? `${controlId}-hint` : undefined;
    const errorId = error ? `${controlId}-error` : undefined;
    const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
    const control = isValidElement(children)
        ? cloneElement(children, {
            id: children.props.id || controlId,
            required: children.props.required ?? required,
            "aria-invalid": error ? "true" : children.props["aria-invalid"],
            "aria-describedby": [children.props["aria-describedby"], describedBy].filter(Boolean).join(" ") || undefined,
        })
        : children;

    return (
        <div className={["ui-form-field", className].filter(Boolean).join(" ")}>
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
