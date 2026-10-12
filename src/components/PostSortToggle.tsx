import { ToggleButton, ToggleGroup } from "../ui";
import "../styles/PostSortToggle.css";
import type { PostSort } from "../utils/postOrder";

interface PostSortToggleProps {
    value: PostSort;
    onChange: (sort: PostSort) => void;
    /** Rounded rectangle that matches filter-row dropdowns; the default is the pill used under headings. */
    boxed?: boolean;
}

export default function PostSortToggle({ value, onChange, boxed = false }: PostSortToggleProps) {
    return (
        <ToggleGroup segmented slim solid boxed={boxed} className="post-sort-toggle" aria-label="Sort posts">
            <ToggleButton active={value === "newest"} onClick={() => onChange("newest")}>Newest</ToggleButton>
            <ToggleButton active={value === "oldest"} onClick={() => onChange("oldest")}>Oldest</ToggleButton>
        </ToggleGroup>
    );
}
