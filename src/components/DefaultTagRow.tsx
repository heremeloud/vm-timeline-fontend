import { DEFAULT_TAG_OPTIONS } from "../constants/eventTags";
import type { DefaultTagOption } from "../constants/eventTags";

interface DefaultTagRowProps {
    row: DefaultTagOption["row"];
    checked: Record<string, boolean>;
    onToggle: (key: string) => void;
}

/** One row of "Add #tag" shortcut checkboxes on the event forms. */
export default function DefaultTagRow({ row, checked, onToggle }: DefaultTagRowProps) {
    return (
        <div className="eventform-default-tags">
            {DEFAULT_TAG_OPTIONS.filter((tag) => tag.row === row).map((tag) => (
                <label key={tag.key}>
                    <input type="checkbox" checked={!!checked[tag.key]} onChange={() => onToggle(tag.key)} />
                    <span>Add <strong>{tag.label}</strong></span>
                </label>
            ))}
        </div>
    );
}
