import { Checkbox } from "../ui";
import { AUTHOR_GROUPS, TIMELINE_AUTHOR_GROUPS } from "../utils/authorGroups";
import type { AuthorGroupId, ShownAuthorGroups } from "../utils/authorGroups";
import "../styles/AuthorGroupFilters.css";

interface AuthorGroupFiltersProps {
    value: ShownAuthorGroups;
    onChange: (next: ShownAuthorGroups) => void;
    /** Offer every author type (Manage Display) instead of just the timeline's artist / crew / official. */
    allTypes?: boolean;
}

/** Admin checkboxes that show or hide posts by author group. */
export default function AuthorGroupFilters({ value, onChange, allTypes = false }: AuthorGroupFiltersProps) {
    const toggle = (id: AuthorGroupId, checked: boolean) => onChange({ ...value, [id]: checked });
    return (
        <div className="author-group-filters" role="group" aria-label="Show posts by">
            {(allTypes ? AUTHOR_GROUPS : TIMELINE_AUTHOR_GROUPS).map((group) => (
                <Checkbox
                    key={group.id}
                    className="author-group-filter"
                    label={group.label}
                    checked={value[group.id]}
                    onChange={(event) => toggle(group.id, event.target.checked)}
                />
            ))}
        </div>
    );
}
