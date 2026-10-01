import "../styles/UI.css";

export default function Button({
    variant = "secondary",
    size = "medium",
    className = "",
    type = "button",
    ...props
}) {
    const classes = [
        "ui-button",
        `ui-button--${variant}`,
        `ui-button--${size}`,
        className,
    ].filter(Boolean).join(" ");

    return <button type={type} className={classes} {...props} />;
}
