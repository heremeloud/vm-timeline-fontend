export default function CardGrid({ className = "", children, ...props }) {
    const classes = ["ui-card-grid", className].filter(Boolean).join(" ");

    return (
        <div className={classes} {...props}>
            {children}
        </div>
    );
}
