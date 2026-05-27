import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProjects } from "../api/projectsService";
import { ROUTES } from "../routes";
import Avatar from "../components/Avatar";
import { PROJECT_CATEGORIES } from "../constants/projectCategories";
import "../styles/Home.css";
import "../styles/Projects.css";

function orderViewMimFirst(authors = []) {
    if (!Array.isArray(authors)) return [];
    const isView = (a) => (a?.name || "").toLowerCase().trim() === "view";
    const isMim = (a) => (a?.name || "").toLowerCase().trim() === "mim";
    const view = authors.find(isView);
    const mim = authors.find(isMim);
    const rest = authors.filter((a) => !isView(a) && !isMim(a));
    return [...(view ? [view] : []), ...(mim ? [mim] : []), ...rest];
}

export default function Projects() {
    const [projects, setProjects] = useState([]);
    const [categoryFilter, setCategoryFilter] = useState("");
    const isAdmin = !!localStorage.getItem("jwt");

    async function load() {
        try {
            const res = await getProjects({ category: categoryFilter || undefined });
            setProjects(res.data || []);
        } catch (err) {
            console.error("Load projects failed:", err);
            setProjects([]);
        }
    }

    useEffect(() => {
        load();
    }, [categoryFilter]);

    return (
        <div className="home-container">
            <div className="home-header">
                <h1 style={{ marginBottom: "0.2rem" }}>ViewMim</h1>
                <h1 style={{ marginTop: "0.2rem" }}>🤎Projects🤍</h1>
                <p>Series, music, concert and more</p>
                <p><strong>- work in progress - </strong></p>
                <hr />
            </div>

            {/* Filter */}
            <div className="filter-bar">
                <div className="filter-group">
                    <label>Category</label>
                    <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                        <option value="">All</option>
                        {PROJECT_CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Project Cards Grid */}
            <div className="projects-grid">
                {projects.map((p) => (
                    <Link key={p.id} to={ROUTES.projectDetail(p.id)} className="project-card">
                        <div className="project-card-thumb">
                            {p.thumbnail_url
                                ? <img src={p.thumbnail_url} alt={p.title} />
                                : <div className="project-card-thumb-placeholder">🎬</div>
                            }
                        </div>

                        <div className="project-card-body">
                            {p.category && (
                                <span className="project-card-category">
                                    {p.category.toUpperCase()}
                                </span>
                            )}

                            <div className="project-card-title">{p.title}</div>

                            {p.parent_project && (
                                <div className="project-card-parent">
                                    ↩ {p.parent_project.title}
                                </div>
                            )}

                            {(p.start_date || p.year) && (
                                <div className="project-card-year">
                                    {p.start_date
                                        ? p.start_date + (p.end_date ? ` – ${p.end_date}` : "")
                                        : p.year}
                                </div>
                            )}

                            {p.authors?.length > 0 && (
                                <div className="project-card-authors">
                                    {orderViewMimFirst(p.authors).map((a) => (
                                        <Avatar
                                            key={a.id}
                                            url={a.profile_photo_url}
                                            authorId={a.id}
                                            name={a.name}
                                            size={22}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </Link>
                ))}
            </div>

            {isAdmin && (
                <Link to={ROUTES.createProject}>
                    <button className="fab-button">+</button>
                </Link>
            )}
        </div>
    );
}
