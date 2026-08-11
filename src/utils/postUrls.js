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

export function normalizeYouTubeVideoUrl(value) {
    const url = value?.trim();
    if (!url) return "";

    const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;

    try {
        const parsed = new URL(withProtocol);
        const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
        let videoId = "";

        if (hostname === "youtu.be") {
            videoId = parsed.pathname.split("/").filter(Boolean)[0] || "";
        } else if (hostname === "youtube.com" || hostname === "m.youtube.com") {
            const parts = parsed.pathname.split("/").filter(Boolean);
            if (parts[0] === "watch") {
                videoId = parsed.searchParams.get("v") || "";
            } else if (["shorts", "live", "embed"].includes(parts[0])) {
                videoId = parts[1] || "";
            }
        }

        return videoId
            ? `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`
            : url;
    } catch {
        return url;
    }
}

export function cleanPastedYouTubeUrl(event, setValue) {
    const pastedValue = event.clipboardData.getData("text");
    const cleanValue = normalizeYouTubeVideoUrl(pastedValue);
    if (cleanValue === pastedValue) return;

    event.preventDefault();
    setValue(cleanValue);
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

export function extractTikTokPostId(value) {
    return value?.match(/\/(?:video|photo)\/(\d+)/i)?.[1] || "";
}

export function detectPostPlatform(value) {
    const url = value?.trim() || "";
    return /^(?:https?:\/\/)?(?:www\.|mobile\.)?(?:x\.com|twitter\.com)\/[^/?#]+\/status\/\d+/i.test(url)
        ? "x"
        : /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|tv|channel)\//i.test(url)
            ? "ig"
            : /^(?:https?:\/\/)?(?:www\.|m\.)?tiktok\.com\/@[^/?#]+\/(?:video|photo)\/\d+/i.test(url)
                ? "tt"
                : null;
}

const X_EPOCH_MS = 1288834974657n;

function bangkokPartsFromEpochMs(epochMs) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
    }).formatToParts(new Date(Number(epochMs)));
    const value = (type) => parts.find((part) => part.type === type)?.value;
    return {
        date: `${value("year")}-${value("month")}-${value("day")}`,
        time: `${value("hour")}:${value("minute")}:${value("second")}`,
    };
}

export function utcToBangkokDateTime(utcValue) {
    if (!utcValue) return null;
    const epochMs = Date.parse(utcValue);
    return Number.isNaN(epochMs) ? null : bangkokPartsFromEpochMs(epochMs);
}

export function bangkokDateTimeToUtc(date, time) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || !/^\d{2}:\d{2}(?::\d{2})?$/.test(time || "")) return null;
    const normalizedTime = time.length === 5 ? `${time}:00` : time;
    const parsed = new Date(`${date}T${normalizedTime}+07:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

// X Snowflake IDs contain milliseconds; TikTok post IDs contain Unix seconds.
export function detectPostDateTime(value) {
    const platform = detectPostPlatform(value);
    if (!platform) return null;

    try {
        let epochMs;
        let estimated = false;
        if (platform === "ig") {
            const shortcode = value?.match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i)?.[1];
            if (!shortcode) return null; // Stories and broadcast messages intentionally stay date/order based.
            const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
            let mediaId = 0n;
            for (const character of shortcode) {
                const index = alphabet.indexOf(character);
                if (index < 0) return null;
                mediaId = mediaId * 64n + BigInt(index);
            }
            epochMs = (mediaId >> 23n) + 1314220021721n;
            estimated = true;
        } else {
            const id = platform === "x"
                ? value?.match(/\/status\/(\d+)/i)?.[1]
                : extractTikTokPostId(value);
            if (!id) return null;
            const numericId = BigInt(id);
            epochMs = platform === "x"
                ? (numericId >> 22n) + X_EPOCH_MS
                : (numericId >> 32n) * 1000n;
        }
        const earliest = Date.UTC(2006, 0, 1);
        const latest = Date.now() + 24 * 60 * 60 * 1000;
        if (Number(epochMs) < earliest || Number(epochMs) > latest) return null;
        return {
            ...bangkokPartsFromEpochMs(epochMs),
            utc: new Date(Number(epochMs)).toISOString(),
            platform,
            estimated,
        };
    } catch {
        return null;
    }
}

export function isInstagramChannelUrl(value) {
    return /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/channel\/[^/?#]+(?:\/[^/?#]+)?/i.test(value?.trim() || "");
}

export function isInstagramPostUrl(value) {
    return /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|tv)\/[^/?#]+/i.test(value?.trim() || "");
}

function extractHandle(value, platform, isProfileUrl = false) {
    const url = value?.trim();
    if (!url) return null;

    const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    try {
        const parts = new URL(withProtocol).pathname.split("/").filter(Boolean);
        if (platform === "x") return parts[0]?.replace(/^@/, "").toLowerCase() || null;
        if (platform === "tt") return parts[0]?.replace(/^@/, "").toLowerCase() || null;
        if (platform === "ig" && (isProfileUrl || !["p", "reel", "tv", "channel"].includes(parts[0]?.toLowerCase()))) {
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
