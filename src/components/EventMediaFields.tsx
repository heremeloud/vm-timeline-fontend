import { cleanPastedYouTubeUrl, normalizeYouTubeVideoUrl } from "../utils/postUrls";
import { Button } from "../ui";

export interface EventMediaItem {
    url: string;
    keyword: string;
    hashtag: string;
}

type RawMediaItem = string | Partial<Record<keyof EventMediaItem, string | null>> | null | undefined;

const emptyMediaItem = (): EventMediaItem => ({ url: "", keyword: "", hashtag: "" });

// Shared with event form loaders; keeping it beside the field shape prevents drift.
// eslint-disable-next-line react-refresh/only-export-components
export function normalizeEventMediaItems(items: RawMediaItem[] = []): EventMediaItem[] {
    const normalized = items
        .map((item) => typeof item === "string" ? { ...emptyMediaItem(), url: item } : ({
            url: item?.url || "",
            keyword: item?.keyword || "",
            hashtag: item?.hashtag || "",
        }));
    return normalized.length ? normalized : [emptyMediaItem()];
}

// eslint-disable-next-line react-refresh/only-export-components
export function cleanEventMediaItems(items: EventMediaItem[] = []) {
    return items
        .map((item) => ({
            url: normalizeYouTubeVideoUrl(item.url),
            keyword: item.keyword.trim() || null,
            hashtag: item.hashtag.trim().replace(/^#+/, "") || null,
        }))
        .filter((item) => item.url);
}

interface EventMediaFieldsProps {
    items: EventMediaItem[];
    onChange: (items: EventMediaItem[]) => void;
}

export default function EventMediaFields({ items, onChange }: EventMediaFieldsProps) {
    function update(index: number, field: keyof EventMediaItem, value: string) {
        onChange(items.map((item, i) => i === index ? { ...item, [field]: value } : item));
    }

    function remove(index: number) {
        const next = items.filter((_, i) => i !== index);
        onChange(next.length ? next : [emptyMediaItem()]);
    }

    return (
        <div className="eventform-section">
            <label>Media <span className="form-optional">(optional)</span></label>
            <div style={{ display: "grid", gap: 12 }}>
                {items.map((item, index) => (
                    <div key={index} style={{ display: "grid", gap: 8, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
                        <strong>Media {index + 1}</strong>
                        <input
                            value={item.url}
                            onChange={(e) => update(index, "url", e.target.value)}
                            onPaste={(e) => cleanPastedYouTubeUrl(e, (value) => update(index, "url", value))}
                            placeholder="https://youtube.com/..."
                        />
                        <input value={item.keyword} onChange={(e) => update(index, "keyword", e.target.value)} placeholder="Keyword (optional)" />
                        <input value={item.hashtag} onChange={(e) => update(index, "hashtag", e.target.value)} placeholder="Hashtag without # (optional)" />
                        <Button variant="danger" size="small" onClick={() => remove(index)}>Remove media</Button>
                    </div>
                ))}
                <Button variant="add" size="small" onClick={() => onChange([...items, emptyMediaItem()])}>+ Add media</Button>
            </div>
        </div>
    );
}
