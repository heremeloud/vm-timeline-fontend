import { useEffect, useMemo, useState } from "react";
import { getAdminProject, getProjects } from "../api/projectsService";
import { Button, Checkbox, Select } from "../ui";
import { addEntryLinks, entriesOnDate, hasEntryLink, listProjectEntries, projectEntryShortLabel, toggleEntryLink } from "../utils/projectEntries";
import type { Project, ProjectEntryLink } from "../types/models";
import "../styles/ProjectEntryPicker.css";

interface ProjectEntryPickerProps {
    value: ProjectEntryLink[];
    onChange: (links: ProjectEntryLink[]) => void;
    /** The post's date (YYYY-MM-DD); rows on this date are flagged, since a fitting and a workshop can share a day. */
    postedAt: string;
}

type ProjectSummary = Pick<Project, "id" | "title">;

/**
 * Link a post to rows of a series (fitting, workshop, Q day, episode), including rows that have no
 * hashtag or keyword. A post can be linked to several rows.
 */
export default function ProjectEntryPicker({ value, onChange, postedAt }: ProjectEntryPickerProps) {
    const [projects, setProjects] = useState<ProjectSummary[]>([]);
    const [details, setDetails] = useState<Record<number, Project>>({});
    const [projectId, setProjectId] = useState<number | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        getProjects({ category: "series" })
            .then((res) => setProjects((res.data || []).map(({ id, title }) => ({ id: Number(id), title }))))
            .catch((err) => {
                console.error("Could not load projects for linking:", err);
                setError("Could not load projects.");
            });
    }, []);

    // Load the rows of the project being browsed and of every project already linked (to name its chips).
    const neededIds = useMemo(
        () => [...new Set([...value.map((link) => link.project_id), ...(projectId != null ? [projectId] : [])])],
        [value, projectId],
    );
    useEffect(() => {
        neededIds.filter((id) => !details[id]).forEach((id) => {
            getAdminProject(id)
                .then((res) => setDetails((current) => ({ ...current, [id]: res.data.project })))
                .catch((err) => console.error("Could not load project rows:", err));
        });
    }, [neededIds, details]);

    const project = projectId != null ? details[projectId] : undefined;
    const options = useMemo(() => (project ? listProjectEntries(project) : []), [project]);
    const onDate = entriesOnDate(options, postedAt);
    const unlinkedOnDate = projectId == null ? [] : onDate.filter((option) =>
        !hasEntryLink(value, { project_id: projectId, entry_type: option.type, entry_number: option.number }));
    const groups = [...new Set(options.map((option) => option.group))];

    function chipLabel(link: ProjectEntryLink) {
        const title = details[link.project_id]?.title ?? `Project ${link.project_id}`;
        return `${title} ${projectEntryShortLabel(link.entry_type, link.entry_number)}`;
    }

    return (
        <div className="project-entry-picker">
            <label>Link to project rows <span className="form-optional">(optional)</span></label>
            <div className="eventform-field-note">
                Link this post to a fitting, workshop, Q day or episode, even when that row has no hashtag or keyword. Tick as many rows as apply.
            </div>
            {error && <p role="alert" className="project-entry-picker-error">{error}</p>}

            {value.length > 0 && (
                <div className="project-entry-picker-chips" aria-label="Linked project rows">
                    {value.map((link) => (
                        <span className="project-entry-picker-chip" key={`${link.project_id}-${link.entry_type}-${link.entry_number}`}>
                            {chipLabel(link)}
                            <button type="button" aria-label={`Unlink ${chipLabel(link)}`} onClick={() => onChange(toggleEntryLink(value, link))}>×</button>
                        </span>
                    ))}
                </div>
            )}

            <Select
                aria-label="Project to pick rows from"
                value={projectId ?? ""}
                onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : null)}
            >
                <option value="">-- Choose a series --</option>
                {projects.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </Select>

            {projectId != null && !project && <p className="project-entry-picker-status">Loading rows…</p>}
            {project && options.length === 0 && <p className="project-entry-picker-status">This series has no Q days, episodes, fittings or workshops yet.</p>}

            {unlinkedOnDate.length > 0 && projectId != null && (
                <div className="project-entry-picker-suggest">
                    <span>On this post's date ({postedAt}): <strong>{unlinkedOnDate.map((option) => option.shortLabel).join(", ")}</strong></span>
                    <Button size="small" variant="secondary" onClick={() => onChange(addEntryLinks(value, projectId, unlinkedOnDate))}>
                        Link {unlinkedOnDate.length > 1 ? "all" : "it"}
                    </Button>
                </div>
            )}

            {projectId != null && groups.map((group) => (
                <fieldset className="project-entry-picker-group" key={group}>
                    <legend>{group}</legend>
                    <div className="project-entry-picker-rows">
                        {options.filter((option) => option.group === group).map((option) => {
                            const link: ProjectEntryLink = { project_id: projectId, entry_type: option.type, entry_number: option.number };
                            return (
                                <Checkbox
                                    key={`${option.type}-${option.number}`}
                                    className={option.date && option.date === postedAt ? "is-same-date" : undefined}
                                    checked={hasEntryLink(value, link)}
                                    onChange={() => onChange(toggleEntryLink(value, link))}
                                    label={
                                        <>
                                            <strong title={option.label}>{option.shortLabel}</strong>
                                            {option.date && <span className="project-entry-picker-date">{option.date}</span>}
                                            {option.date && option.date === postedAt && <span className="project-entry-picker-same">same date</span>}
                                        </>
                                    }
                                />
                            );
                        })}
                    </div>
                </fieldset>
            ))}
        </div>
    );
}
