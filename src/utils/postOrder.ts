export type PostSort = "newest" | "oldest";

/**
 * Related-post endpoints always return the timeline's "newest" order. "Oldest first" is its exact mirror
 * (docs/post-ordering.md), so reversing the list gives the same result as the backend's oldest sort.
 */
export function orderRelatedPosts<T>(posts: T[], sort: PostSort): T[] {
    return sort === "oldest" ? [...posts].reverse() : posts;
}
