import { Link } from "react-router-dom";
import { ROUTES } from "../routes";

export default function AdminQuickActions() {
    if (!localStorage.getItem("jwt")) return null;

    return (
        <nav className="admin-quick-actions" aria-label="Admin shortcuts">
            <Link className="admin-quick-button" to={ROUTES.manageDisplay} aria-label="Manage Display" title="Manage Display">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="13" rx="2" />
                    <path d="M8 21h8M12 17v4" />
                </svg>
            </Link>
            <Link className="admin-quick-button" to={ROUTES.manageAuthors} aria-label="Manage Authors" title="Manage Authors">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
                </svg>
            </Link>
        </nav>
    );
}
