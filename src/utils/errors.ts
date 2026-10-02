import { isAxiosError } from "axios";

interface ValidationIssue {
    loc: Array<string | number>;
    msg: string;
}

/**
 * Turn a FastAPI error response into a user-facing message.
 * Handles both `detail: "text"` and pydantic's `detail: [{ loc, msg }]` shapes.
 */
export function errorDetail(error: unknown, fallback: string, separator = "; "): string {
    if (!isAxiosError<{ detail?: string | ValidationIssue[] }>(error)) return fallback;
    const detail = error.response?.data?.detail;
    if (Array.isArray(detail)) return detail.map((item) => `${item.loc.join(" → ")}: ${item.msg}`).join(separator);
    return detail || fallback;
}
