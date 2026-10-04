import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminProjects, getProjects, updateProject } from "../api/projectsService";
import { ROUTES } from "../routes";
import Avatar from "../components/Avatar";
import { PROJECT_CATEGORIES } from "../constants/projectCategories";
import { CardGrid, FilterBar, FilterField, FloatingActionLink, Select } from "../ui";
import { formatCardDateRange } from "../utils/cardDate";
import { orderViewMimFirst } from "../utils/authors";
import type { Id, Project } from "../types/models";
import "../styles/Home.css";
import "../styles/Projects.css";
import { isAdminView } from "../utils/adminView";

export default function Projects() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [categoryFilter, setCategoryFilter] = useState("");
    const [savingVisibilityId, setSavingVisibilityId] = useState<Id | null>(null);
    const isAdmin = isAdminView();

    async function toggleVisibility(project: Project) {
        const nextValue = !project.is_visible;
        setSavingVisibilityId(project.id);
        try {
            await updateProject(project.id, { is_visible: nextValue });
            setProjects((current) => current.map((item) =>
                item.id === project.id ? { ...item, is_visible: nextValue } : item
            ));
        } catch (err) {
            console.error("Project visibility update failed:", err);
            alert("Could not update this project's public visibility.");
        } finally {
            setSavingVisibilityId(null);
        }
    }

    useEffect(() => {
        async function load() {
            try {
                const res = isAdmin
                    ? await getAdminProjects({ limit: 500, category: categoryFilter || undefined })
                    : await getProjects({ category: categoryFilter || undefined });
                setProjects(res.data || []);
            } catch (err) {
                console.error("Load projects failed:", err);
                setProjects([]);
            }
        }

        load();
    }, [categoryFilter, isAdmin]);

    return (
        <div className="home-container">
            <div className="home-header">
                <h1 style={{ marginBottom: "0.2rem" }}>ViewMim</h1>
                <h1 style={{ marginTop: "0.2rem" }}>🤎Projects🤍</h1>
                <p>Series, songs, concerts and more</p>
                {/* <p><strong>- work in progress - </strong></p> */}
                <hr />
            </div>

            {/* Filter */}
            <FilterBar>
                <FilterField label="Category">
                    <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                        <option value="">-- All --</option>
                        {PROJECT_CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                        ))}
                    </Select>
                </FilterField>
            </FilterBar>

            {/* Project Cards Grid */}
            <CardGrid>
                {projects.map((p) => (
                    <div key={p.id} className={`project-card-shell ${isAdmin ? "project-card-shell--admin" : ""}`.trim()}>
                    <div className="project-card">
                        <Link
                            to={ROUTES.projectDetail(p.slug || p.id)}
                            className="project-card-link-overlay"
                            aria-label={`View ${p.title}`}
                        />
                        <div className="project-card-thumb">
                            {p.thumbnail_url
                                ? (
                                    <img
                                        src={p.thumbnail_url}
                                        alt={p.title}
                                        style={{
                                            objectPosition: `${p.thumbnail_focal_x ?? 50}% ${p.thumbnail_focal_y ?? 50}%`,
                                        }}
                                    />
                                )
                                : <div className="project-card-thumb-placeholder">🎬</div>
                            }
                        </div>

                        <div className="project-card-body">
                            <div className="project-card-topline">
                                <span className={`project-card-category ${p.category ? "" : "project-card-category--empty"}`}>
                                    {p.category ? p.category.toUpperCase() : "\u00a0"}
                                </span>
                                {isAdmin && (
                                    <label className="project-visibility-toggle" title={p.is_visible ? "Visible to the public" : "Hidden from the public"}>
                                        <input
                                            type="checkbox"
                                            checked={p.is_visible !== false}
                                            disabled={savingVisibilityId === p.id}
                                            onChange={() => toggleVisibility(p)}
                                            aria-label={`Show ${p.title} to the public`}
                                        />
                                        <span>{savingVisibilityId === p.id ? "Saving…" : "Public"}</span>
                                    </label>
                                )}
                            </div>

                            <div className="project-card-title">{p.title}</div>

                            <div className={`project-card-parent ${p.parent_project ? "" : "project-card-parent--empty"}`}>
                                {p.parent_project ? `↩ ${p.parent_project.title}` : "\u00a0"}
                            </div>

                            <div className={`project-card-year ${p.start_date || p.year ? "" : "project-card-year--empty"}`}>
                                {formatCardDateRange(p) || "\u00a0"}
                            </div>

                            {p.authors?.length > 0 && (
                                <div className="project-card-authors">
                                    {orderViewMimFirst(p.authors).map((a) => (
                                        <Avatar
                                            key={a.id}
                                            url={a.profile_photo_url}
                                            authorId={a.id}
                                            name={a.name}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    </div>
                ))}
            </CardGrid>

            {isAdmin && (
                <FloatingActionLink to={ROUTES.createProject} label="Create project" />
            )}
        </div>
    );
}
