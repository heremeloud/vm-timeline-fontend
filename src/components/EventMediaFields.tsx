import { cleanPastedYouTubeUrl, normalizeYouTubeVideoUrl } from "../utils/postUrls";
import { Button, FormField, Select, TextInput } from "../ui";
import type { EventMediaDisplayType } from "../types/models";

export interface EventMediaItem {
    url: string;
    date: string;
    keyword: string;
    hashtag: string;
    display_type: EventMediaDisplayType;
}

type RawMediaItem = string | Partial<Record<keyof EventMediaItem, string | null>> | null | undefined;

const emptyMediaItem = (): EventMediaItem => ({ url: "", date: "", keyword: "", hashtag: "", display_type: "auto" });

function normalizeDisplayType(value?: string | null): EventMediaDisplayType {
    if (value === "article" || value === "tweet" || value === "youtube") return value;
    return "auto";
}

// Shared with event form loaders; keeping it beside the field shape prevents drift.
// eslint-disable-next-line react-refresh/only-export-components
export function normalizeEventMediaItems(items: RawMediaItem[] = []): EventMediaItem[] {
    const normalized = items
        .map((item) => typeof item === "string" ? { ...emptyMediaItem(), url: item } : ({
            url: item?.url || "",
            date: item?.date || "",
            keyword: item?.keyword || "",
            hashtag: item?.hashtag || "",
            display_type: normalizeDisplayType(item?.display_type),
        }));
    return normalized.length ? normalized : [emptyMediaItem()];
}

// eslint-disable-next-line react-refresh/only-export-components
export function cleanEventMediaItems(items: EventMediaItem[] = [], allowedDates?: string[]) {
    const allowedDateSet = allowedDates ? new Set(allowedDates.filter(Boolean)) : null;
    return items
        .map((item) => ({
            url: normalizeYouTubeVideoUrl(item.url),
            date: item.date && (!allowedDateSet || allowedDateSet.has(item.date)) ? item.date : null,
            keyword: item.keyword.trim() || null,
            hashtag: item.hashtag.trim().replace(/^#+/, "") || null,
            display_type: item.display_type,
        }))
        .filter((item) => item.url);
}

interface EventMediaFieldsProps {
    items: EventMediaItem[];
    dateOptions?: string[];
    onChange: (items: EventMediaItem[]) => void;
}

export default function EventMediaFields({ items, dateOptions = [], onChange }: EventMediaFieldsProps) {
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
            <p className="eventform-field-note">Add an article, tweet, or YouTube URL and choose how it should appear on the event card.</p>
            <div className="eventmedia-list">
                {items.map((item, index) => (
                    <div key={index} className="eventmedia-item">
                        <strong>Media {index + 1}</strong>
                        <div className="eventmedia-primary-fields">
                            <FormField label="URL">
                                <TextInput
                                    type="url"
                                    value={item.url}
                                    onChange={(e) => update(index, "url", e.target.value)}
                                    onPaste={(e) => cleanPastedYouTubeUrl(e, (value) => update(index, "url", value))}
                                    placeholder="https://..."
                                />
                            </FormField>
                            <FormField label="Display as">
                                <Select
                                    value={item.display_type}
                                    onChange={(e) => update(index, "display_type", e.target.value as EventMediaDisplayType)}
                                >
                                    <option value="auto">Auto-detect</option>
                                    <option value="article">Article link</option>
                                    <option value="tweet">Tweet card</option>
                                    <option value="youtube">YouTube video</option>
                                </Select>
                            </FormField>
                            {dateOptions.length > 0 && (
                                <FormField label={<>Event date <span className="form-optional">(optional)</span></>}>
                                    <Select
                                        value={dateOptions.includes(item.date) ? item.date : ""}
                                        onChange={(e) => update(index, "date", e.target.value)}
                                    >
                                        <option value="">All dates / General media</option>
                                        {dateOptions.map((date) => (
                                            <option key={date} value={date}>{date}</option>
                                        ))}
                                    </Select>
                                </FormField>
                            )}
                        </div>
                        <div className="eventmedia-secondary-fields">
                            <FormField label={<>Keyword <span className="form-optional">(optional)</span></>}>
                                <TextInput value={item.keyword} onChange={(e) => update(index, "keyword", e.target.value)} />
                            </FormField>
                            <FormField label={<>Hashtag <span className="form-optional">(optional)</span></>}>
                                <TextInput value={item.hashtag} onChange={(e) => update(index, "hashtag", e.target.value)} placeholder="Without #" />
                            </FormField>
                        </div>
                        <Button variant="danger" size="small" onClick={() => remove(index)}>Remove media</Button>
                    </div>
                ))}
                <Button variant="add" size="small" onClick={() => onChange([...items, emptyMediaItem()])}>+ Add media</Button>
            </div>
        </div>
    );
}
