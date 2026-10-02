import type { HTMLAttributes } from "react";
import { cx } from "./classNames";

export default function CardGrid({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cx("ui-card-grid", className)} {...props}>
            {children}
        </div>
    );
}
