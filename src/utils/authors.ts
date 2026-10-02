/** Put View first and Mim second, keeping everyone else in their original order. */
export function orderViewMimFirst<T extends { name?: string | null }>(authors: T[] = []): T[] {
    if (!Array.isArray(authors)) return [];
    const matches = (author: T, name: string) => (author?.name || "").toLowerCase().trim() === name;
    const view = authors.find((author) => matches(author, "view"));
    const mim = authors.find((author) => matches(author, "mim"));
    const rest = authors.filter((author) => !matches(author, "view") && !matches(author, "mim"));
    return [...(view ? [view] : []), ...(mim ? [mim] : []), ...rest];
}
