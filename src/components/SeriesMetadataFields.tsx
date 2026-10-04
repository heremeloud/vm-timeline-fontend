import { useState } from "react";
import type { Dispatch, FocusEvent, MouseEvent, SetStateAction } from "react";
import { Button } from "../ui";
import type { FittingWorkshopKind } from "../types/models";

/** Form-state rows: every field is a string while editing and parsed on save. */
export interface FilmingDayRow {
    q_number: string;
    filming_date: string;
    hashtag: string;
    keyword: string;
}

export interface EpisodeRow {
    episode_number: string;
    air_date: string;
    title: string;
    hashtag: string;
    keyword: string;
}

export interface FittingWorkshopRow {
    kind: FittingWorkshopKind;
    number: string;
    date: string;
    hashtag: string;
    keyword: string;
}

type TaggedRow = { hashtag: string; keyword: string };

const emptyQ = (): FilmingDayRow => ({ q_number: "", filming_date: "", hashtag: "", keyword: "" });
const emptyEpisode = (episodeNumber: number | string = ""): EpisodeRow => ({ episode_number: String(episodeNumber), air_date: "", title: "", hashtag: "", keyword: "" });

/** Short hashtag suffix per type (SeriesF1, SeriesW1, SeriesP1); the visible names are "Fitting Day 1" etc. */
const FITTING_WORKSHOP_PREFIX: Record<FittingWorkshopKind, string> = { fitting: "F", workshop: "W", prep: "P" };
const FITTING_WORKSHOP_NAME: Record<FittingWorkshopKind, string> = { fitting: "Fitting Day", workshop: "Workshop Day", prep: "Prep Day" };
const FITTING_WORKSHOP_SHORT_NAME: Record<FittingWorkshopKind, string> = { fitting: "Fitting", workshop: "Workshop", prep: "Prep" };
const FITTING_WORKSHOP_KINDS = ["fitting", "workshop", "prep"] as const;

const emptyFittingWorkshop = (kind: FittingWorkshopKind, number: number | string = ""): FittingWorkshopRow => ({ kind, number: String(number), date: "", hashtag: "", keyword: "" });

function nextFittingWorkshopNumber(rows: FittingWorkshopRow[], kind: FittingWorkshopKind) {
    const numbers = rows.filter((row) => row.kind === kind).map((row) => Number(row.number)).filter((number) => Number.isInteger(number) && number > 0);
    return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
}

function defaultFittingWorkshopHashtag(primaryHashtag: string | null | undefined, kind: FittingWorkshopKind, number: number | string) {
    const base = (primaryHashtag || "").trim().replace(/^#/, "").replace(/\s+/g, "");
    return base ? `${base}${FITTING_WORKSHOP_PREFIX[kind]}${number}` : "";
}

function focusTextEnd(event: MouseEvent<HTMLInputElement> | FocusEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const end = input.value.length;
    requestAnimationFrame(() => {
        input.setSelectionRange(end, end);
        input.scrollLeft = input.scrollWidth;
    });
}

function updateRow<T>(rows: T[], setRows: (rows: T[]) => void, index: number, field: keyof T, value: string) {
    const next = [...rows];
    next[index] = { ...next[index], [field]: value };
    setRows(next);
}

function updateIndexedNumber<T extends TaggedRow>(rows: T[], setRows: (rows: T[]) => void, index: number, numberField: keyof T, value: string, prefix: string) {
    const next = [...rows];
    const row = { ...next[index], [numberField]: value };
    if (/^\d{1,2}$/.test(value)) {
        const ending = new RegExp(`${prefix}\\d+$`, "i");
        for (const field of ["hashtag", "keyword"] as const) {
            if ((row[field] || "").trim().match(ending)) {
                row[field] = row[field].replace(ending, `${prefix}${value}`);
            }
        }
    }
    next[index] = row;
    setRows(next);
}

function RemoveButton({ onClick }: { onClick: () => void }) {
    return (
        <Button variant="danger" size="small" className="series-metadata-remove" onClick={onClick} aria-label="Remove row" title="Remove row">
            ✕
        </Button>
    );
}

function nextEpisodeNumber(episodes: EpisodeRow[]) {
    const used = new Set(episodes.map((row) => Number(row.episode_number)).filter(Number.isInteger));
    let number = 1;
    while (used.has(number)) number += 1;
    return number;
}

function nextQNumber(filmingDays: FilmingDayRow[]) {
    const numbers = filmingDays
        .map((row) => Number(row.q_number))
        .filter((number) => Number.isInteger(number) && number > 0);
    return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
}

function hashtagBase(primaryHashtag: string | null | undefined) {
    return (primaryHashtag || "").trim().replace(/^#/, "").replace(/\s+/g, "");
}

function defaultEpisodeHashtag(primaryHashtag: string | null | undefined, episodeNumber: number | string, totalEpisodes: number | string | null | undefined) {
    const base = hashtagBase(primaryHashtag);
    const total = Number.parseInt(String(totalEpisodes ?? ""), 10);
    const isFinalEpisode = Number.isInteger(total) && total > 0 && Number(episodeNumber) === total;
    return base ? `${base}${isFinalEpisode ? "FinalEP" : `EP${episodeNumber}`}` : "";
}

function isGeneratedEpisodeHashtag(value: string | null | undefined, primaryHashtag: string | null | undefined, episodeNumber: number | string) {
    const base = hashtagBase(primaryHashtag);
    const hashtag = (value || "").trim();
    return !hashtag || hashtag === `${base}EP${episodeNumber}` || hashtag === `${base}FinalEP`;
}

function defaultQHashtag(primaryHashtag: string | null | undefined, qNumber: number | string) {
    const base = (primaryHashtag || "").trim().replace(/^#/, "").replace(/\s+/g, "");
    return base ? `${base}Q${qNumber}` : "";
}

function defaultQDate(filmingDays: FilmingDayRow[], startDate: string) {
    const latestDatedQ = [...filmingDays]
        .filter((row) => row.filming_date)
        .sort((a, b) => Number(b.q_number) - Number(a.q_number))[0];
    return latestDatedQ?.filming_date || startDate || "";
}

function addDays(dateString: string, days: number) {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-").map(Number);
    if (!year || !month || !day) return "";
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

function defaultEpisodeDate(startDate: string, episodeNumber: number) {
    return addDays(startDate, (episodeNumber - 1) * 7);
}

function nextEpisodeDate(episodes: EpisodeRow[], startDate: string, episodeNumber: number) {
    const previous = [...episodes]
        .filter((row) => Number(row.episode_number) < episodeNumber && row.air_date)
        .sort((a, b) => Number(b.episode_number) - Number(a.episode_number))[0];
    if (!previous) return defaultEpisodeDate(startDate, episodeNumber);
    const episodeGap = episodeNumber - Number(previous.episode_number);
    return addDays(previous.air_date, episodeGap * 7);
}

interface SeriesMetadataFieldsProps {
    filmingDays: FilmingDayRow[];
    setFilmingDays: Dispatch<SetStateAction<FilmingDayRow[]>> | ((rows: FilmingDayRow[]) => void);
    episodes: EpisodeRow[];
    setEpisodes: Dispatch<SetStateAction<EpisodeRow[]>> | ((rows: EpisodeRow[]) => void);
    fittingWorkshops: FittingWorkshopRow[];
    setFittingWorkshops: Dispatch<SetStateAction<FittingWorkshopRow[]>> | ((rows: FittingWorkshopRow[]) => void);
    episodeCount: number | string | null | undefined;
    primaryHashtag: string | null | undefined;
    startDate: string;
    inferOptionalFields?: boolean;
}

export default function SeriesMetadataFields({
    filmingDays,
    setFilmingDays,
    episodes,
    setEpisodes,
    fittingWorkshops,
    setFittingWorkshops,
    episodeCount,
    primaryHashtag,
    startDate,
    inferOptionalFields = false,
}: SeriesMetadataFieldsProps) {
    const [showEpisodeTitle, setShowEpisodeTitle] = useState(() =>
        inferOptionalFields && episodes.length > 0 ? episodes.some((row) => Boolean((row.title || "").trim())) : true
    );
    const [showEpisodeKeyword, setShowEpisodeKeyword] = useState(() =>
        inferOptionalFields && episodes.length > 0 ? episodes.some((row) => Boolean((row.keyword || "").trim())) : true
    );
    const [includeEpisodeZero, setIncludeEpisodeZero] = useState(() =>
        episodes.some((row) => Number(row.episode_number) === 0)
    );
    // Fitting / workshop / prep days often have no hashtag or keyword, so those fields are opt-in.
    const [showFwHashtag, setShowFwHashtag] = useState(() => fittingWorkshops.some((row) => Boolean(row.hashtag.trim())));
    const [showFwKeyword, setShowFwKeyword] = useState(() => fittingWorkshops.some((row) => Boolean(row.keyword.trim())));

    function generateEpisodeDefaults() {
        const count = Math.max(1, Number.parseInt(String(episodeCount ?? ""), 10) || 1);
        const byNumber = new Map(episodes.map((row) => [Number(row.episode_number), row]));
        const episodeOneDate = byNumber.get(1)?.air_date || startDate;
        const episodeZero = includeEpisodeZero
            ? [{
                ...(byNumber.get(0) || emptyEpisode(0)),
                episode_number: "0",
                air_date: byNumber.get(0)?.air_date || addDays(episodeOneDate, -7),
                hashtag: "",
                keyword: "",
            }]
            : [];
        const generated = Array.from({ length: count }, (_, index) => {
            const episodeNumber = index + 1;
            const existing = byNumber.get(episodeNumber);
            if (existing) {
                return {
                    ...existing,
                    air_date: existing.air_date || defaultEpisodeDate(startDate, episodeNumber),
                    hashtag: isGeneratedEpisodeHashtag(existing.hashtag, primaryHashtag, episodeNumber)
                        ? defaultEpisodeHashtag(primaryHashtag, episodeNumber, count)
                        : existing.hashtag,
                };
            }
            return {
                ...emptyEpisode(episodeNumber),
                air_date: defaultEpisodeDate(startDate, episodeNumber),
                hashtag: defaultEpisodeHashtag(primaryHashtag, episodeNumber, count),
            };
        });
        const extras = episodes.filter((row) => Number(row.episode_number) > count);
        setEpisodes([...episodeZero, ...generated, ...extras]);
    }

    return (
        <>
            <div className="eventform-section series-metadata-section">
                <div className="series-metadata-heading">
                    <div>
                        <label>Fitting &amp; Workshop <span className="form-optional">(optional)</span></label>
                        <p>F = fitting day, W = workshop day, P = prep day (a day that is both, or general preparation). Each type is numbered on its own; visitors see "Fitting Day 1", "Workshop Day 1", "Prep Day 1".</p>
                    </div>
                    <div className="series-metadata-actions">
                        <div className="series-metadata-action-buttons">
                            {FITTING_WORKSHOP_KINDS.map((kind) => (
                                <Button key={kind} variant="add" size="small" onClick={() => {
                                    const number = nextFittingWorkshopNumber(fittingWorkshops, kind);
                                    if (number > 99) {
                                        alert(`${FITTING_WORKSHOP_NAME[kind]} number cannot be greater than 99.`);
                                        return;
                                    }
                                    setFittingWorkshops([
                                        ...fittingWorkshops,
                                        {
                                            ...emptyFittingWorkshop(kind, number),
                                            date: [...fittingWorkshops].reverse().find((row) => row.date)?.date || startDate || "",
                                            hashtag: showFwHashtag ? defaultFittingWorkshopHashtag(primaryHashtag, kind, number) : "",
                                        },
                                    ]);
                                }}>+ Add {FITTING_WORKSHOP_SHORT_NAME[kind]}</Button>
                            ))}
                        </div>
                        <div className="series-metadata-toggles">
                            <label className="series-metadata-toggle">
                                <input type="checkbox" checked={showFwHashtag} onChange={(e) => setShowFwHashtag(e.target.checked)} />
                                Hashtag
                            </label>
                            <label className="series-metadata-toggle">
                                <input type="checkbox" checked={showFwKeyword} onChange={(e) => setShowFwKeyword(e.target.checked)} />
                                Keyword
                            </label>
                        </div>
                    </div>
                </div>
                {fittingWorkshops.map((row, index) => (
                    <div className="series-metadata-row series-metadata-fw-row" key={`fw-${index}`}>
                        <label>Type
                            <select aria-label={`Type: ${FITTING_WORKSHOP_NAME[row.kind]}`} title={FITTING_WORKSHOP_NAME[row.kind]} value={row.kind} onChange={(e) => {
                                const kind = e.target.value as FittingWorkshopKind;
                                const next = [...fittingWorkshops];
                                const wasGenerated = !row.hashtag.trim() || row.hashtag === defaultFittingWorkshopHashtag(primaryHashtag, row.kind, row.number);
                                next[index] = {
                                    ...row,
                                    kind,
                                    hashtag: wasGenerated ? defaultFittingWorkshopHashtag(primaryHashtag, kind, row.number) : row.hashtag,
                                };
                                setFittingWorkshops(next);
                            }}>
                                {FITTING_WORKSHOP_KINDS.map((kind) => <option key={kind} value={kind} title={FITTING_WORKSHOP_NAME[kind]}>{FITTING_WORKSHOP_PREFIX[kind]}</option>)}
                            </select>
                        </label>
                        <label className="series-metadata-number-field"><span className="series-metadata-label-text">{FITTING_WORKSHOP_PREFIX[row.kind]}# <span className="form-required">*</span></span><input type="number" min="1" max="99" required value={row.number} onChange={(e) => updateIndexedNumber(fittingWorkshops, setFittingWorkshops, index, "number", e.target.value, FITTING_WORKSHOP_PREFIX[row.kind])} /></label>
                        <label>Date<input type="date" value={row.date} onChange={(e) => updateRow(fittingWorkshops, setFittingWorkshops, index, "date", e.target.value)} /></label>
                        <RemoveButton onClick={() => setFittingWorkshops(fittingWorkshops.filter((_, i) => i !== index))} />
                        {(showFwHashtag || showFwKeyword) && (
                            <div className="series-metadata-fw-tags">
                            {showFwHashtag && <label>Hashtag<input value={row.hashtag} placeholder={`Series${FITTING_WORKSHOP_PREFIX[row.kind]}1`} onFocus={focusTextEnd} onClick={focusTextEnd} onChange={(e) => updateRow(fittingWorkshops, setFittingWorkshops, index, "hashtag", e.target.value)} /></label>}
                            {showFwKeyword && <label>Keyword<input value={row.keyword} placeholder={`Series ${FITTING_WORKSHOP_NAME[row.kind]} 1`} onChange={(e) => updateRow(fittingWorkshops, setFittingWorkshops, index, "keyword", e.target.value)} /></label>}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="eventform-section series-metadata-section">
                <div className="series-metadata-heading">
                    <div>
                        <label>Filming Q Days <span className="form-optional">(optional)</span></label>
                        <p>Add the filming Q days. Enter hashtags without #.</p>
                    </div>
                    <Button variant="add" size="small" onClick={() => {
                        const qNumber = nextQNumber(filmingDays);
                        if (qNumber > 99) {
                            alert("Q number cannot be greater than 99.");
                            return;
                        }
                        setFilmingDays([
                            ...filmingDays,
                            {
                                ...emptyQ(),
                                q_number: String(qNumber),
                                filming_date: defaultQDate(filmingDays, startDate),
                                hashtag: defaultQHashtag(primaryHashtag, qNumber),
                            },
                        ]);
                    }}>+ Add Q Day</Button>
                </div>
                {filmingDays.map((row, index) => (
                    <div className="series-metadata-row" key={`q-${index}`}>
                        <label className="series-metadata-number-field"><span className="series-metadata-label-text">Q# <span className="form-required">*</span></span><input type="number" min="1" max="99" required value={row.q_number} onChange={(e) => updateIndexedNumber(filmingDays, setFilmingDays, index, "q_number", e.target.value, "Q")} /></label>
                        <label>Date<input type="date" value={row.filming_date} onChange={(e) => updateRow(filmingDays, setFilmingDays, index, "filming_date", e.target.value)} /></label>
                        <label>Hashtag<input value={row.hashtag} placeholder="SeriesQ1" onFocus={focusTextEnd} onClick={focusTextEnd} onChange={(e) => updateRow(filmingDays, setFilmingDays, index, "hashtag", e.target.value)} /></label>
                        <label>Keyword<input value={row.keyword} placeholder="Series Q1" onChange={(e) => updateRow(filmingDays, setFilmingDays, index, "keyword", e.target.value)} /></label>
                        <RemoveButton onClick={() => setFilmingDays(filmingDays.filter((_, i) => i !== index))} />
                    </div>
                ))}
            </div>

            <div className="eventform-section series-metadata-section series-metadata-episode-section">
                <div className="series-metadata-heading">
                    <div>
                        <label>Episode Metadata <span className="form-optional">(optional)</span></label>
                        <p>Add only the episodes that need a hashtag, keyword, date, or title. Enter hashtags without #.</p>
                    </div>
                    <div className="series-metadata-actions">
                        <div className="series-metadata-action-buttons">
                            <Button variant="secondary" size="small" onClick={generateEpisodeDefaults}>Generate Defaults</Button>
                            <Button variant="add" size="small" onClick={() => {
                                const episodeNumber = nextEpisodeNumber(episodes);
                                setEpisodes([
                                    ...episodes,
                                    {
                                        ...emptyEpisode(episodeNumber),
                                        air_date: nextEpisodeDate(episodes, startDate, episodeNumber),
                                        hashtag: defaultEpisodeHashtag(primaryHashtag, episodeNumber, episodeCount),
                                    },
                                ]);
                            }}>+ Add Episode</Button>
                        </div>
                        <div className="series-metadata-toggles">
                            <label className="series-metadata-toggle">
                                <input type="checkbox" checked={showEpisodeTitle} onChange={(e) => setShowEpisodeTitle(e.target.checked)} />
                                Title
                            </label>
                            <label className="series-metadata-toggle">
                                <input type="checkbox" checked={showEpisodeKeyword} onChange={(e) => setShowEpisodeKeyword(e.target.checked)} />
                                Keyword
                            </label>
                            <label className="series-metadata-toggle">
                                <input
                                    type="checkbox"
                                    checked={includeEpisodeZero}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setIncludeEpisodeZero(checked);
                                        if (checked) {
                                            if (episodes.some((row) => Number(row.episode_number) === 0)) return;
                                            const episodeOneDate = episodes.find((row) => Number(row.episode_number) === 1)?.air_date || startDate;
                                            setEpisodes([
                                                {
                                                    ...emptyEpisode(0),
                                                    air_date: addDays(episodeOneDate, -7),
                                                },
                                                ...episodes,
                                            ]);
                                        } else {
                                            setEpisodes(episodes.filter((row) => Number(row.episode_number) !== 0));
                                        }
                                    }}
                                />
                                EP0
                            </label>
                        </div>
                    </div>
                </div>
                {episodes.map((row, index) => (
                    <div
                        className={`series-metadata-row series-metadata-episode-row${showEpisodeTitle ? "" : " no-episode-title"}${showEpisodeKeyword ? "" : " no-episode-keyword"}`}
                        key={`episode-${index}`}
                    >
                        <label className="series-metadata-number-field"><span className="series-metadata-label-text">EP <span className="form-required">*</span></span><input type="number" min="0" max="99" required value={row.episode_number} onChange={(e) => updateIndexedNumber(episodes, setEpisodes, index, "episode_number", e.target.value, "EP")} /></label>
                        <label>Air Date<input type="date" value={row.air_date} onChange={(e) => updateRow(episodes, setEpisodes, index, "air_date", e.target.value)} /></label>
                        {showEpisodeTitle && <label>Title<input value={row.title} onChange={(e) => updateRow(episodes, setEpisodes, index, "title", e.target.value)} /></label>}
                        <label>Hashtag<input value={row.hashtag} placeholder={Number(row.episode_number) === Number(episodeCount) ? "SeriesFinalEP" : "SeriesEP1"} onFocus={focusTextEnd} onClick={focusTextEnd} onChange={(e) => updateRow(episodes, setEpisodes, index, "hashtag", e.target.value)} /></label>
                        {showEpisodeKeyword && <label>Keyword<input value={row.keyword} placeholder="Series KW" onChange={(e) => updateRow(episodes, setEpisodes, index, "keyword", e.target.value)} /></label>}
                        <RemoveButton onClick={() => setEpisodes(episodes.filter((_, i) => i !== index))} />
                    </div>
                ))}
            </div>
        </>
    );
}
