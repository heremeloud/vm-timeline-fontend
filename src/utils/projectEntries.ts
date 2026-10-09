import type { ProjectEntryType } from "../routes";
import type { Project, ProjectEntryLink } from "../types/models";

/** One row of a series a post can be linked to, as shown in the post form's picker. */
export interface ProjectEntryOption {
    type: ProjectEntryType;
    number: number;
    /** "Fitting Day 1", "Workshop Day 2", "Prep Day 1", "Q5", "EP3" */
    label: string;
    /** "F1", "W2", "P1", "Q5", "EP3": what the forms show */
    shortLabel: string;
    date: string;
    hashtag: string;
    group: "Fitting & Workshop" | "Filming Q Days" | "Episodes";
}

/** Q days and episodes are numbered with a short prefix; fitting, workshop and prep rows are spelled out as days. */
const SHORT_PREFIX: Partial<Record<ProjectEntryType, string>> = { filming: "Q", episodes: "EP" };
const DAY_NAME: Partial<Record<ProjectEntryType, string>> = { fitting: "Fitting Day", workshop: "Workshop Day", prep: "Prep Day" };

/** Compact label for the admin forms, where space is tight: F1, W2, P1, Q5, EP3. Visitors see the full `projectEntryLabel`. */
const FORM_PREFIX: Record<ProjectEntryType, string> = { fitting: "F", workshop: "W", prep: "P", filming: "Q", episodes: "EP" };

export function projectEntryShortLabel(type: ProjectEntryType, number: number) {
    return `${FORM_PREFIX[type]}${number}`;
}

/**
 * The prefix of a label in the project page's tables: "Q", "EP", and for a fitting / workshop / prep day "D" (like "Q1" and "EP1").
 * When the project has days of more than one type, a letter says which ("F D", "W D", "P D"); the full name ("Fitting Day 1") is
 * `projectEntryLabel`, used for tooltips and the related-posts page.
 */
export function projectEntryTablePrefix(type: ProjectEntryType, withTypeLetter: boolean) {
    if (type === "filming") return "Q";
    if (type === "episodes") return "EP";
    return withTypeLetter ? `${FORM_PREFIX[type]} D` : "D";
}

export function projectEntryDayLabel(type: ProjectEntryType, number: number, withTypeLetter: boolean) {
    return `${projectEntryTablePrefix(type, withTypeLetter)}${number}`;
}

export function projectEntryLabel(type: ProjectEntryType, number: number) {
    const dayName = DAY_NAME[type];
    return dayName ? `${dayName} ${number}` : `${SHORT_PREFIX[type] ?? ""}${number}`;
}

/** All linkable rows of a project, in page order: fitting & workshop, Q days, then episodes. */
export function listProjectEntries(project: Pick<Project, "fitting_workshops" | "filming_days" | "episode_metadata">): ProjectEntryOption[] {
    const clean = (value?: string | null) => (value || "").trim().replace(/^#/, "");
    return [
        ...(project.fitting_workshops || []).map((row): ProjectEntryOption => ({
            type: row.kind, number: row.number, label: projectEntryLabel(row.kind, row.number), shortLabel: projectEntryShortLabel(row.kind, row.number),
            date: row.date || "", hashtag: clean(row.hashtag), group: "Fitting & Workshop",
        })),
        ...(project.filming_days || []).map((row): ProjectEntryOption => ({
            type: "filming", number: row.q_number, label: projectEntryLabel("filming", row.q_number), shortLabel: projectEntryShortLabel("filming", row.q_number),
            date: row.filming_date || "", hashtag: clean(row.hashtag), group: "Filming Q Days",
        })),
        ...(project.episode_metadata || []).map((row): ProjectEntryOption => ({
            type: "episodes", number: row.episode_number, label: projectEntryLabel("episodes", row.episode_number), shortLabel: projectEntryShortLabel("episodes", row.episode_number),
            date: row.air_date || "", hashtag: clean(row.hashtag), group: "Episodes",
        })),
    ];
}

export interface AdjacentProjectEntries {
    previous: ProjectEntryOption | null;
    next: ProjectEntryOption | null;
}

/** Previous and next rows in the same project-detail section as the current row. */
export function adjacentProjectEntries(
    project: Pick<Project, "fitting_workshops" | "filming_days" | "episode_metadata">,
    currentType: ProjectEntryType,
    currentNumber: number,
    isNavigable: (entry: ProjectEntryOption) => boolean = () => true,
): AdjacentProjectEntries {
    const entries = listProjectEntries(project);
    const current = entries.find((entry) => entry.type === currentType && entry.number === currentNumber);
    if (!current) return { previous: null, next: null };

    const sectionEntries = entries.filter((entry) => entry.group === current.group);
    const currentIndex = sectionEntries.findIndex((entry) => entry.type === currentType && entry.number === currentNumber);
    return {
        previous: sectionEntries.slice(0, currentIndex).reverse().find(isNavigable) ?? null,
        next: sectionEntries.slice(currentIndex + 1).find(isNavigable) ?? null,
    };
}

export function parseEntryLinks(json: string | null | undefined): ProjectEntryLink[] {
    try {
        const items: unknown = JSON.parse(json || "[]");
        if (!Array.isArray(items)) return [];
        return (items as Partial<ProjectEntryLink>[]).filter(
            (item): item is ProjectEntryLink => item.project_id != null && !!item.entry_type && item.entry_number != null,
        );
    } catch {
        return [];
    }
}

export const serializeEntryLinks = (links: ProjectEntryLink[]) => JSON.stringify(links);

const sameLink = (a: ProjectEntryLink, b: ProjectEntryLink) =>
    a.project_id === b.project_id && a.entry_type === b.entry_type && a.entry_number === b.entry_number;

export const hasEntryLink = (links: ProjectEntryLink[], link: ProjectEntryLink) => links.some((item) => sameLink(item, link));

/** Add the link if missing, otherwise remove it. */
export function toggleEntryLink(links: ProjectEntryLink[], link: ProjectEntryLink): ProjectEntryLink[] {
    return hasEntryLink(links, link) ? links.filter((item) => !sameLink(item, link)) : [...links, link];
}

/** Rows whose date is the post's date: a fitting and a workshop can share a day, so there may be several. */
export function entriesOnDate(options: ProjectEntryOption[], date: string) {
    return date ? options.filter((option) => option.date === date) : [];
}

/** Add every given row of a project to the links, keeping the ones already there. */
export function addEntryLinks(links: ProjectEntryLink[], projectId: number, options: ProjectEntryOption[]): ProjectEntryLink[] {
    return options.reduce((next, option) => {
        const link: ProjectEntryLink = { project_id: projectId, entry_type: option.type, entry_number: option.number };
        return hasEntryLink(next, link) ? next : [...next, link];
    }, links);
}
