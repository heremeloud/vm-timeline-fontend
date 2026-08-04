const filenameSequence = (url = "") => {
    try {
        const filename = decodeURIComponent(new URL(url).pathname.split("/").pop() || "");
        const match = filename.match(/(?:^|[-_ ])(\d+)(?=\.[^.]+$)/);
        return match ? Number(match[1]) : null;
    } catch {
        return null;
    }
};

export const nextMediaSequence = (items = []) => {
    const used = new Set(items.map((item) => filenameSequence(item.url)).filter(Number.isInteger));
    let sequence = 1;
    while (used.has(sequence)) sequence += 1;
    return sequence;
};

export const appendUploadedUrls = (items, urls, emptyItem) => {
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
        return Number.isInteger(leftSequence) && Number.isInteger(rightSequence)
            ? leftSequence - rightSequence
            : 0;
    });
    return [...populated, ...empty];
};
