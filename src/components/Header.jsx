import { NavLink } from "react-router-dom";
import "../styles/Header.css";

export default function Header() {
    return (
        <header className="main-header">
            <div className="header-inner">
                <h2 className="site-title">ViewMim Archive</h2>

                <nav className="nav-links">
                    <NavLink
                        to="/"
                        className={({ isActive }) =>
                            isActive ? "nav-link active" : "nav-link"
                        }
                        end
                    >
                        SNS Timeline
                    </NavLink>

                    <NavLink
                        to="/events"
                        className={({ isActive }) =>
                            isActive ? "nav-link active" : "nav-link"
                        }
                    >
                        Events
                    </NavLink>
                </nav>
            </div>
        </header>
    );
}
