import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getSearchSettings, updateSearchSettings } from "../api/searchSettingsService";
import { setIdentityTags } from "../utils/eventTagLinks";
import { errorDetail } from "../utils/errors";
import type { SearchSettings, TypoTolerance } from "../types/models";
import { Alert, Button, FormField, Inline, Select, Stack, Textarea } from "../ui";

const TOLERANCE_LABELS: Record<TypoTolerance, string> = {
    off: "Off (exact words only)",
    normal: "Normal (one or two wrong letters)",
    loose: "Loose (more typos, more false matches)",
};

const toLines = (tags: string[]) => tags.join("\n");
const fromLines = (value: string) => value.split("\n").map((line) => line.trim()).filter(Boolean);

/** Admin editor for the event/project search rules; the written rules are in docs/search-rules.md. */
export default function SearchRulesSettings() {
    const [settings, setSettings] = useState<SearchSettings | null>(null);
    const [tagText, setTagText] = useState("");
    const [tolerance, setTolerance] = useState<TypoTolerance>("normal");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ variant: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        getSearchSettings()
            .then((res) => {
                setSettings(res.data);
                setTagText(toLines(res.data.identity_tags));
                setTolerance(res.data.typo_tolerance);
            })
            .catch((err) => {
                console.error("Search settings load failed:", err);
                setMessage({ variant: "error", text: errorDetail(err, "Could not load the search rules.") });
            });
    }, []);

    async function save(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const res = await updateSearchSettings({ identity_tags: fromLines(tagText), typo_tolerance: tolerance });
            setSettings(res.data);
            setTagText(toLines(res.data.identity_tags));
            setIdentityTags(res.data.identity_tags);
            setMessage({ variant: "success", text: "Search rules saved. Reload other open pages to apply the hashtag list there." });
        } catch (err) {
            console.error("Search settings save failed:", err);
            setMessage({ variant: "error", text: errorDetail(err, "Could not save the search rules.") });
        } finally {
            setSaving(false);
        }
    }

    return (
        <section className="eventform-section eventform-form">
            <h3>Search rules</h3>
            <form onSubmit={save}>
                <Stack gap="3">
                    <p className="eventform-field-note">
                        Identity hashtags are on almost every event, so they are ignored when searching tags and when linking a
                        hashtag to an event. They still match in names and keywords.
                    </p>
                    <FormField label="Identity hashtags" hint="One per line, with or without #. Not case sensitive.">
                        <Textarea rows={6} value={tagText} onChange={(e) => setTagText(e.target.value)} disabled={!settings} />
                    </FormField>
                    <FormField label="Typo tolerance" hint="How forgiving event and project search is of misspelled words.">
                        <Select value={tolerance} onChange={(e) => setTolerance(e.target.value as TypoTolerance)} disabled={!settings}>
                            {(settings?.typo_tolerance_options ?? ["normal"]).map((option) => (
                                <option key={option} value={option}>{TOLERANCE_LABELS[option]}</option>
                            ))}
                        </Select>
                    </FormField>
                    {message && <Alert variant={message.variant}>{message.text}</Alert>}
                    <Inline gap="2">
                        <Button variant="save" type="submit" disabled={!settings || saving}>{saving ? "Saving…" : "Save search rules"}</Button>
                        <Button
                            variant="ghost"
                            disabled={!settings || saving}
                            onClick={() => settings && setTagText(toLines(settings.default_identity_tags))}
                        >
                            Restore default hashtags
                        </Button>
                    </Inline>
                </Stack>
            </form>
        </section>
    );
}
