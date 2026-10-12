import type { ButtonHTMLAttributes, HTMLAttributes } from "react";
import { cx } from "./classNames";

export type ToggleVariant = "accent" | "neutral" | "success" | "danger";

export interface ToggleGroupProps extends HTMLAttributes<HTMLDivElement> {
    segmented?: boolean;
    /** Slim 20px pill switch for page-level view/sort choices (use with `segmented`). */
    slim?: boolean;
    /** Selected option is filled with the accent color and white text instead of the soft tint. */
    solid?: boolean;
    /** Rounded-rectangle shape with the light border of form controls, for use inside filter rows (with `segmented`). */
    boxed?: boolean;
}

export function ToggleGroup({ segmented = false, slim = false, solid = false, boxed = false, className = "", children, role = "group", ...props }: ToggleGroupProps) {
    return (
        <div className={cx("ui-toggle-group", segmented && "ui-toggle-group--segmented", slim && "ui-toggle-group--slim", solid && "ui-toggle-group--solid", boxed && "ui-toggle-group--boxed", className)} role={role} {...props}>
            {children}
        </div>
    );
}

export interface ToggleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    active?: boolean;
    variant?: ToggleVariant;
    /** Small pill with a single-weight border, for dense rows such as event date pickers. */
    compact?: boolean;
}

export default function ToggleButton({
    active = false,
    variant = "accent",
    compact = false,
    className = "",
    role,
    children,
    ...props
}: ToggleButtonProps) {
    const stateProps = role === "tab"
        ? { "aria-selected": active }
        : { "aria-pressed": active };

    return (
        <button
            type="button"
            role={role}
            className={cx("ui-toggle-button", `ui-toggle-button--${variant}`, compact && "ui-toggle-button--compact", className)}
            {...stateProps}
            {...props}
        >
            {children}
        </button>
    );
}
