import { useState } from "react";
import type { PostSort } from "../utils/postOrder";

const STORAGE_KEY = "relatedPostsSort";

/** Related-posts sort order, remembered in this browser. */
export function usePostSort() {
    const [sort, setSortState] = useState<PostSort>(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) === "oldest" ? "oldest" : "newest";
        } catch {
            return "newest";
        }
    });
    const setSort = (next: PostSort) => {
        setSortState(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // storage unavailable (private mode); the choice just isn't remembered
        }
    };
    return [sort, setSort] as const;
}
