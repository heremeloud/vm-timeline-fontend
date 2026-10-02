import { extractTikTokPostId, normalizePostUrl } from "./postUrls";

/** One media row while editing an Instagram story or broadcast-channel post. */
export interface StoryItem {
    url: string;
    text: string;
    translation: string;
    note: string;
    attachment_type?: string;
    deleteFromR2: boolean;
}

export const emptyStoryItem = (): StoryItem => ({ url: "", text: "", translation: "", note: "", attachment_type: "screenshot", deleteFromR2: false });

export const getStoryItemCount = (quantity: number | string) =>
    Math.min(100, Math.max(1, Math.floor(Number(quantity) || 1)));

/** `…/story_07.jpg` + 2 → `…/story_09.jpg`; empty when the URL has no numeric file suffix. */
export const getSequentialStoryUrl = (url: string, offset: number) => {
    const cleanUrl = url.trim();
    const match = cleanUrl.match(/^(.*?)(\d+)(\.[^/.?#]+)([?#].*)?$/);
    if (!match) return "";

    const [, prefix, numberText, extension, suffix = ""] = match;
    const nextNumber = String(Number(numberText) + offset).padStart(numberText.length, "0");
    return `${prefix}${nextNumber}${extension}${suffix}`;
};

export const normalizeInstagramURL = (url: string) => normalizePostUrl(url, "ig");

export const normalizeTikTokURL = (url: string) => {
    if (!url) return "";
    let clean = url.trim().split("?")[0];
    clean = clean.replace("https://m.tiktok.com", "https://www.tiktok.com");
    if (!clean.startsWith("http")) clean = "https://" + clean;
    return clean;
};

/** The platform's own post ID: tweet ID, Instagram shortcode, or TikTok video ID. */
export const extractExternalId = (url: string, platform: string) => {
    if (!url) return "";

    if (platform === "ig") {
        const channelMatch = url.match(/\/channel\/[^/]+\/([^/?#]+)/i);
        if (channelMatch) return channelMatch[1];
        const parts = url.split("/p/");
        return parts[1]?.split("/")[0] || "";
    }

    if (platform === "x") {
        const parts = url.split("/status/");
        return parts[1]?.split("?")[0] || "";
    }

    if (platform === "tt") {
        return extractTikTokPostId(url);
    }

    return "";
};
