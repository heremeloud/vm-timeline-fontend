export function normalizeXStatusUrl(value) {
    const url = value?.trim();
    if (!url) return "";

    const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const match = withProtocol.match(
        /^https?:\/\/(?:www\.|mobile\.)?(?:x\.com|twitter\.com)\/([^/?#]+)\/status\/(\d+)/i,
    );

    if (!match) return url;
    return `https://x.com/${match[1]}/status/${match[2]}`;
}

export function normalizePostUrl(value, platform) {
    if (!value) return "";
    if (platform === "x") return normalizeXStatusUrl(value);

    if (platform === "ig") {
        const clean = value.trim().split(/[?#]/)[0].replace(/\/+$/, "");
        return clean.replace("https://instagram.com", "https://www.instagram.com");
    }

    if (platform === "tt") {
        let clean = value.trim().split("?")[0];
        clean = clean.replace("https://m.tiktok.com", "https://www.tiktok.com");
        if (!clean.startsWith("http")) clean = `https://${clean}`;
        return clean;
    }

    return value.trim();
}

export function detectPostPlatform(value) {
    const url = value?.trim() || "";
    return /^(?:https?:\/\/)?(?:www\.|mobile\.)?(?:x\.com|twitter\.com)\/[^/?#]+\/status\/\d+/i.test(url)
        ? "x"
        : /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|tv)\//i.test(url)
            ? "ig"
            : /^(?:https?:\/\/)?(?:www\.|m\.)?tiktok\.com\/@[^/?#]+\/video\/\d+/i.test(url)
                ? "tt"
                : null;
}

function extractHandle(value, platform, isProfileUrl = false) {
    const url = value?.trim();
    if (!url) return null;

    const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    try {
        const parts = new URL(withProtocol).pathname.split("/").filter(Boolean);
        if (platform === "x") return parts[0]?.replace(/^@/, "").toLowerCase() || null;
        if (platform === "tt") return parts[0]?.replace(/^@/, "").toLowerCase() || null;
        if (platform === "ig" && (isProfileUrl || !["p", "reel", "tv"].includes(parts[0]?.toLowerCase()))) {
            return parts[0]?.replace(/^@/, "").toLowerCase() || null;
        }
    } catch {
        return null;
    }
    return null;
}

export function detectPostAuthor(value, authors = []) {
    const platform = detectPostPlatform(value)
        || (/instagram\.com/i.test(value) ? "ig" : null);
    const postHandle = extractHandle(value, platform);
    if (!platform || !postHandle) return null;

    const profileField = platform === "x"
        ? "twitter_url"
        : platform === "tt"
            ? "tiktok_url"
            : "instagram_url";

    return authors.find((author) =>
        extractHandle(author?.[profileField], platform, true) === postHandle
    ) || null;
}

export function detectMediaAuthor(value, authors = []) {
    let filename = "";
    try {
        filename = decodeURIComponent(new URL(value.trim()).pathname.split("/").pop() || "");
    } catch {
        return null;
    }

    const escapedNamePattern = (name) => name
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("[-_. ]+");

    return [...authors]
        .sort((a, b) => (b.name?.length || 0) - (a.name?.length || 0))
        .find((author) => {
            if (!author?.name) return false;
            return new RegExp(`^${escapedNamePattern(author.name)}(?:[-_. ]|$)`, "i").test(filename);
        }) || null;
}

export function detectMediaDate(value) {
    let filename = "";
    try {
        filename = decodeURIComponent(new URL(value.trim()).pathname.split("/").pop() || "");
    } catch {
        return null;
    }

    const match = filename.match(/(?:^|[-_.])(\d{8}|\d{6})(?=[-_.]|$)/);
    if (!match) return null;

    const digits = match[1];
    const year = Number(digits.length === 8 ? digits.slice(0, 4) : `20${digits.slice(0, 2)}`);
    const month = Number(digits.length === 8 ? digits.slice(4, 6) : digits.slice(2, 4));
    const day = Number(digits.length === 8 ? digits.slice(6, 8) : digits.slice(4, 6));
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
        date.getUTCFullYear() !== year
        || date.getUTCMonth() !== month - 1
        || date.getUTCDate() !== day
    ) return null;

    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function normalizeSocialPostUrl(value) {
    const platform = detectPostPlatform(value);
    return platform ? normalizePostUrl(value, platform) : value?.trim() || "";
}

export function cleanPastedSocialUrls(event, setValue) {
    const pastedValue = event.clipboardData.getData("text");
    const cleanValue = pastedValue
        .split(/\r?\n/)
        .map(normalizeSocialPostUrl)
        .join("\n");
    if (cleanValue === pastedValue) return;

    event.preventDefault();
    const input = event.currentTarget;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    setValue(`${input.value.slice(0, start)}${cleanValue}${input.value.slice(end)}`);
}

export function cleanPastedPostUrl(event, platform, setValue, setPlatform, authors, setAuthor) {
    const pastedValue = event.clipboardData.getData("text");
    const detectedPlatform = detectPostPlatform(pastedValue);
    const cleanValue = normalizePostUrl(pastedValue, detectedPlatform || platform);

    if (cleanValue !== pastedValue) {
        event.preventDefault();
        setValue(cleanValue);
    }

    if (detectedPlatform) setPlatform?.(detectedPlatform);
    const detectedAuthor = detectPostAuthor(pastedValue, authors);
    if (detectedAuthor) setAuthor?.(detectedAuthor);
}
