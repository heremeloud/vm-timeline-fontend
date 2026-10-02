import { Link } from "react-router-dom";
import type { LinkProps } from "react-router-dom";
import "../styles/UI.css";
import { cx } from "./classNames";
import type { ButtonSize, ButtonVariant } from "./Button";

export interface ButtonLinkProps extends LinkProps {
    variant?: ButtonVariant;
    size?: ButtonSize;
}

/** A router link that looks and focuses like a `Button`; use it for navigation actions. */
export default function ButtonLink({
    variant = "secondary",
    size = "medium",
    className = "",
    ...props
}: ButtonLinkProps) {
    return <Link className={cx("ui-button", `ui-button--${variant}`, `ui-button--${size}`, className)} {...props} />;
}
