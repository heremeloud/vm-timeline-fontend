import { NavLink } from "react-router-dom";
import "../styles/Header.css";
import { ROUTES } from "../routes";

export default function Header() {
    return (
        <header className="main-header">
            <div className="header-inner">
                <h2 className="site-title">ViewMim Archive</h2>

                <nav className="nav-links">
                    <NavLink
                        to={ROUTES.home}
                        className={({ isActive }) =>
                            isActive ? "nav-link active" : "nav-link"
                        }
                        end
                    >
                        Timeline
                    </NavLink>

                    <NavLink
                        to={ROUTES.events}
                        className={({ isActive }) =>
                            isActive ? "nav-link active" : "nav-link"
                        }
                    >
                        Events
                    </NavLink>

                    <NavLink
                        to={ROUTES.projects}
                        className={({ isActive }) =>
                            isActive ? "nav-link active" : "nav-link"
                        }
                    >
                        Projects
                    </NavLink>
                </nav>
            </div>
        </header>
    );
}
