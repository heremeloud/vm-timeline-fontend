import { Link, useLocation } from "react-router-dom";
import type { LinkProps } from "react-router-dom";

/** A router `Link`; when it points at the page you are already on, a click scrolls to the top instead of doing nothing. */
export default function EventTagAnchor({ to, onClick, ...props }: LinkProps) {
    const location = useLocation();
    const samePage = typeof to === "string" && to === location.pathname;
    return (
        <Link
            to={to}
            onClick={(event) => {
                onClick?.(event);
                if (samePage && !event.defaultPrevented) {
                    event.preventDefault();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                }
            }}
            {...props}
        />
    );
}
