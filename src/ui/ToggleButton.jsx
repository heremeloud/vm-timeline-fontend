export function ToggleGroup({ segmented = false, className = "", children, role = "group", ...props }) {
    const classes = [
        "ui-toggle-group",
        segmented ? "ui-toggle-group--segmented" : "",
        className,
    ].filter(Boolean).join(" ");

    return <div className={classes} role={role} {...props}>{children}</div>;
}

export default function ToggleButton({
    active = false,
    variant = "accent",
    className = "",
    role,
    children,
    ...props
}) {
    const classes = ["ui-toggle-button", `ui-toggle-button--${variant}`, className]
        .filter(Boolean)
        .join(" ");
    const stateProps = role === "tab"
        ? { "aria-selected": active }
        : { "aria-pressed": active };

    return (
        <button type="button" role={role} className={classes} {...stateProps} {...props}>
            {children}
        </button>
    );
}
