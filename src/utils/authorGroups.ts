/**
 * Author groups an admin can show or hide in post lists. Each maps to an `Author.category`, except `temp`, which is a post's
 * own one-off author (no saved author). `main` is the series' lead artists (View, Mim, Vimmy), set per author in Manage Authors; `artist` is everyone else. The timeline offers the `timeline` groups; Manage Display offers all of them.
 */
export const AUTHOR_GROUPS = [
    { id: "main", label: "Main Artist", defaultOn: true, timeline: true },
    { id: "artist", label: "Artist", defaultOn: true, timeline: true },
    { id: "crew", label: "Crew", defaultOn: true, timeline: true },
    { id: "official", label: "Official Account", defaultOn: false, timeline: true },
    { id: "family_friend", label: "Family & Friends", defaultOn: true, timeline: false },
    { id: "fan", label: "Fan", defaultOn: true, timeline: false },
    { id: "temp", label: "Temporary Author", defaultOn: true, timeline: false },
] as const;

export type AuthorGroup = (typeof AUTHOR_GROUPS)[number];
export const TIMELINE_AUTHOR_GROUPS: readonly AuthorGroup[] = AUTHOR_GROUPS.filter((group) => group.timeline);

export type AuthorGroupId = (typeof AUTHOR_GROUPS)[number]["id"];
export type ShownAuthorGroups = Record<AuthorGroupId, boolean>;

const URL_PARAM = "authors";

export const defaultShownAuthorGroups = (): ShownAuthorGroups =>
    Object.fromEntries(AUTHOR_GROUPS.map((group) => [group.id, group.defaultOn])) as ShownAuthorGroups;

const isDefault = (shown: ShownAuthorGroups) => AUTHOR_GROUPS.every((group) => shown[group.id] === group.defaultOn);

/** `?authors=artist,official` lists the shown groups (`none` for no group); no param means the defaults. */
export function readShownAuthorGroups(params: URLSearchParams): ShownAuthorGroups {
    const value = params.get(URL_PARAM);
    if (value === null) return defaultShownAuthorGroups();
    const ids = new Set(value.split(",").map((id) => id.trim()));
    return Object.fromEntries(AUTHOR_GROUPS.map((group) => [group.id, ids.has(group.id)])) as ShownAuthorGroups;
}

export function writeShownAuthorGroups(params: URLSearchParams, shown: ShownAuthorGroups) {
    if (isDefault(shown)) {
        params.delete(URL_PARAM);
        return;
    }
    const ids = AUTHOR_GROUPS.filter((group) => shown[group.id]).map((group) => group.id);
    params.set(URL_PARAM, ids.length > 0 ? ids.join(",") : "none");
}

/** The author categories to send as `hide_author_categories`. */
export const hiddenAuthorCategories = (shown: ShownAuthorGroups): string[] =>
    AUTHOR_GROUPS.filter((group) => !shown[group.id]).map((group) => group.id);
