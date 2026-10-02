interface UrlItem {
    url: string;
}

const filenameSequence = (url = ""): number | null => {
    try {
        const filename = decodeURIComponent(new URL(url).pathname.split("/").pop() || "");
        const match = filename.match(/(?:^|[-_ ])(\d+)(?=\.[^.]+$)/);
        return match ? Number(match[1]) : null;
    } catch {
        return null;
    }
};

export const nextMediaSequence = (items: UrlItem[] = []) => {
    const used = new Set(items.map((item) => filenameSequence(item.url)).filter((value): value is number => value !== null));
    let sequence = 1;
    while (used.has(sequence)) sequence += 1;
    return sequence;
};

export const appendUploadedUrls = <T extends UrlItem>(items: T[], urls: string[], emptyItem: () => T): T[] => {
    const next = [...items];
    urls.forEach((url) => {
        const emptyIndex = next.findIndex((item) => !item.url.trim());
        if (emptyIndex >= 0) next[emptyIndex] = { ...next[emptyIndex], url };
        else next.push({ ...emptyItem(), url });
    });

    const populated = next.filter((item) => item.url.trim());
    const empty = next.filter((item) => !item.url.trim());
    populated.sort((left, right) => {
        const leftSequence = filenameSequence(left.url);
        const rightSequence = filenameSequence(right.url);
        return leftSequence !== null && rightSequence !== null
            ? leftSequence - rightSequence
            : 0;
    });
    return [...populated, ...empty];
};
