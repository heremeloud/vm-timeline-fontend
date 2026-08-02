import { useState } from "react";

const emptyQ = () => ({ q_number: "", filming_date: "", hashtag: "", keyword: "" });
const emptyEpisode = (episodeNumber = "") => ({ episode_number: String(episodeNumber), air_date: "", title: "", hashtag: "", keyword: "" });

function focusTextEnd(event) {
    const input = event.currentTarget;
    const end = input.value.length;
    requestAnimationFrame(() => {
        input.setSelectionRange(end, end);
        input.scrollLeft = input.scrollWidth;
    });
}

function updateRow(rows, setRows, index, field, value) {
    const next = [...rows];
    next[index] = { ...next[index], [field]: value };
    setRows(next);
}

function updateIndexedNumber(rows, setRows, index, numberField, value, prefix) {
    const next = [...rows];
    const row = { ...next[index], [numberField]: value };
    if (/^\d{1,2}$/.test(value)) {
        const ending = new RegExp(`${prefix}\\d+$`, "i");
        for (const field of ["hashtag", "keyword"]) {
            if ((row[field] || "").trim().match(ending)) {
                row[field] = row[field].replace(ending, `${prefix}${value}`);
            }
        }
    }
    next[index] = row;
    setRows(next);
}

function RemoveButton({ onClick }) {
    return (
        <button type="button" className="form-remove-button series-metadata-remove" onClick={onClick} aria-label="Remove row" title="Remove row">
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
            </svg>
        </button>
    );
}

function nextEpisodeNumber(episodes) {
    const used = new Set(episodes.map((row) => Number(row.episode_number)).filter(Number.isInteger));
    let number = 1;
    while (used.has(number)) number += 1;
    return number;
}

function nextQNumber(filmingDays) {
    const numbers = filmingDays
        .map((row) => Number(row.q_number))
        .filter((number) => Number.isInteger(number) && number > 0);
    return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
}

function hashtagBase(primaryHashtag) {
    return (primaryHashtag || "").trim().replace(/^#/, "").replace(/\s+/g, "");
}

function defaultEpisodeHashtag(primaryHashtag, episodeNumber, totalEpisodes) {
    const base = hashtagBase(primaryHashtag);
    const total = Number.parseInt(totalEpisodes, 10);
    const isFinalEpisode = Number.isInteger(total) && total > 0 && Number(episodeNumber) === total;
    return base ? `${base}${isFinalEpisode ? "FinalEP" : `EP${episodeNumber}`}` : "";
}

function isGeneratedEpisodeHashtag(value, primaryHashtag, episodeNumber) {
    const base = hashtagBase(primaryHashtag);
    const hashtag = (value || "").trim();
    return !hashtag || hashtag === `${base}EP${episodeNumber}` || hashtag === `${base}FinalEP`;
}

function defaultQHashtag(primaryHashtag, qNumber) {
    const base = (primaryHashtag || "").trim().replace(/^#/, "").replace(/\s+/g, "");
    return base ? `${base}Q${qNumber}` : "";
}

function defaultQDate(filmingDays, startDate) {
    const latestDatedQ = [...filmingDays]
        .filter((row) => row.filming_date)
        .sort((a, b) => Number(b.q_number) - Number(a.q_number))[0];
    return latestDatedQ?.filming_date || startDate || "";
}

function addDays(dateString, days) {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-").map(Number);
    if (!year || !month || !day) return "";
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

function defaultEpisodeDate(startDate, episodeNumber) {
    return addDays(startDate, (episodeNumber - 1) * 7);
}

function nextEpisodeDate(episodes, startDate, episodeNumber) {
    const previous = [...episodes]
        .filter((row) => Number(row.episode_number) < episodeNumber && row.air_date)
        .sort((a, b) => Number(b.episode_number) - Number(a.episode_number))[0];
    if (!previous) return defaultEpisodeDate(startDate, episodeNumber);
    const episodeGap = episodeNumber - Number(previous.episode_number);
    return addDays(previous.air_date, episodeGap * 7);
}

export default function SeriesMetadataFields({
    filmingDays,
    setFilmingDays,
    episodes,
    setEpisodes,
    episodeCount,
    primaryHashtag,
    startDate,
    inferOptionalFields = false,
}) {
    const [showEpisodeTitle, setShowEpisodeTitle] = useState(() =>
        inferOptionalFields && episodes.length > 0 ? episodes.some((row) => Boolean((row.title || "").trim())) : true
    );
    const [showEpisodeKeyword, setShowEpisodeKeyword] = useState(() =>
        inferOptionalFields && episodes.length > 0 ? episodes.some((row) => Boolean((row.keyword || "").trim())) : true
    );
    const [includeEpisodeZero, setIncludeEpisodeZero] = useState(() =>
        episodes.some((row) => Number(row.episode_number) === 0)
    );

    function generateEpisodeDefaults() {
        const count = Math.max(1, Number.parseInt(episodeCount, 10) || 1);
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
                        <label>Filming Q Days <span className="form-optional">(optional)</span></label>
                        <p>Add the filming Q days. Enter hashtags without #.</p>
                    </div>
                    <button type="button" onClick={() => {
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
                    }} className="series-metadata-add">+ Add Q Day</button>
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
                            <button type="button" className="series-metadata-generate" onClick={generateEpisodeDefaults}>Generate Defaults</button>
                            <button type="button" onClick={() => {
                                const episodeNumber = nextEpisodeNumber(episodes);
                                setEpisodes([
                                    ...episodes,
                                    {
                                        ...emptyEpisode(episodeNumber),
                                        air_date: nextEpisodeDate(episodes, startDate, episodeNumber),
                                        hashtag: defaultEpisodeHashtag(primaryHashtag, episodeNumber, episodeCount),
                                    },
                                ]);
                            }} className="series-metadata-add">+ Add Episode</button>
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
