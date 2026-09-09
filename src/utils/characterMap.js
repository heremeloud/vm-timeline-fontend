const sampleCharacters = [
    { id: "a", name: "Character A", role: "The aspiring baker", x: 27, y: 29, tone: "#b76d79", description: "A dream, a little courage, and a recipe still in progress. This sample profile will become a character introduction." },
    { id: "b", name: "Character B", role: "The unexpected encounter", x: 73, y: 29, tone: "#66877e", description: "An unexpected arrival changes the everyday rhythm of the bakery. Add the real character’s story here later." },
    { id: "c", name: "Character C", role: "The trusted friend", x: 27, y: 78, tone: "#b68f50", description: "Always nearby with advice and a familiar smile. This is a sample supporting character." },
    { id: "d", name: "Character D", role: "The familiar face", x: 73, y: 78, tone: "#9680a7", description: "Someone with a connection to the past. This is a sample supporting character." },
];

export function sampleCharacterMap() {
    return {
        characters: sampleCharacters.map((character) => ({ ...character, actor: "", photo: "" })),
        relationships: [
            { id: "ab", source: "a", target: "b", changes: [
                { episode: 1, label: "First encounter", description: "Their paths cross for the first time.", color: "#c78390", line_style: "dotted", arrow_start: false, arrow_end: false, hidden: false },
                { episode: 2, label: "Growing closer", description: "Small moments begin to build trust.", color: "#c78390", line_style: "dashed", arrow_start: false, arrow_end: true, hidden: false },
                { episode: 3, label: "Something more?", description: "Their friendship may be turning into something more.", color: "#c78390", line_style: "solid", arrow_start: false, arrow_end: true, hidden: false },
            ] },
            { id: "ac", source: "a", target: "c", changes: [{ episode: 1, label: "Best friends", description: "A steady friendship.", color: "#87a292", line_style: "solid", curved: true, arrow_start: false, arrow_end: false, hidden: false }] },
            { id: "bd", source: "b", target: "d", changes: [{ episode: 1, label: "Family", description: "A family connection.", color: "#ab96ba", line_style: "dashed", arrow_start: false, arrow_end: false, hidden: false }] },
        ],
    };
}

const CURVE_RATIO = 0.22;
const CURVE_MAX = 14;
const TRIM_STEPS = 200;
const TRIM_MIN_SPAN = 0.04;
const ARROW_LENGTH = 12;
const ARROW_HALF_WIDTH = 6;

// Card footprints in CSS pixels, mirrored from .character-map-person in CharacterMap.css.
export const CARD_SIZES = {
    large: { width: 148, height: 152, textAllowance: 46 },
    medium: { width: 120, height: 124, textAllowance: 42 },
    small: { width: 96, height: 100, textAllowance: 38 },
};
export const CARD_SIZE_KEYS = ["large", "medium", "small"];
export const CARD_SIZE_LABELS = { large: "Large (main character)", medium: "Medium", small: "Small (minor character)" };
export const CARD_COMPACT_SCALE = 0.82;
const CARD_GAP = 9;

export function characterCardSize(character) {
    return CARD_SIZES[character?.size] ? character.size : "medium";
}

export function characterCardMetrics(character, scale = 1) {
    const card = CARD_SIZES[characterCardSize(character)];
    return { width: card.width * scale, height: card.height * scale, textAllowance: card.textAllowance * scale, gap: CARD_GAP * scale };
}

// Half-extents of one card, in the 0-100 units the line layer draws in.
export function cardInset(canvas, card) {
    if (!canvas?.width || !canvas?.height) return null;
    return {
        x: ((card.width / 2 + card.gap) / canvas.width) * 100,
        top: ((card.height / 2 + card.gap) / canvas.height) * 100,
        bottom: ((card.height / 2 + card.gap + card.textAllowance) / canvas.height) * 100,
    };
}

// `extents` carries each card's measured box, which beats the static estimate: the cards grow with
// the chart, so their real size is whatever CSS ended up giving them.
export function characterCardBox(character, scale = 1, extents = null) {
    const card = characterCardMetrics(character, scale);
    const measured = extents?.[character.id];
    if (!measured) return { ...card, spanWidth: card.width };
    const width = measured.width || card.width;
    return {
        width,
        // A caption may run wider than the card it sits under; enclosures and margins follow that.
        spanWidth: Math.max(width, measured.spanWidth || 0),
        height: measured.height || card.height,
        textAllowance: Number.isFinite(measured.below) ? measured.below : card.textAllowance,
        gap: card.gap,
    };
}

export function characterCardInsets(characters, canvas, scale = 1, extents = null) {
    if (!canvas?.width || !canvas?.height) return null;
    const insets = {};
    for (const character of characters) insets[character.id] = cardInset(canvas, characterCardBox(character, scale, extents));
    return insets;
}

function lerpPoint(a, b, t) {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function quadPoint(p0, control, p1, t) {
    const u = 1 - t;
    return { x: u * u * p0.x + 2 * u * t * control.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * control.y + t * t * p1.y };
}

function quadSlice(p0, control, p1, t0, t1) {
    const left = { p0, control: lerpPoint(p0, control, t1), p1: quadPoint(p0, control, p1, t1) };
    const t = t1 > 0 ? t0 / t1 : 0;
    return { p0: quadPoint(left.p0, left.control, left.p1, t), control: lerpPoint(left.control, left.p1, t), p1: left.p1 };
}

function coversPoint(point, node, inset) {
    return !!inset && Math.abs(point.x - node.x) <= inset.x && point.y - node.y <= inset.bottom && node.y - point.y <= inset.top;
}

function trimRange(p0, control, p1, source, target, sourceInset, targetInset) {
    let t0 = 0, t1 = 1;
    for (let step = 1; step <= TRIM_STEPS; step += 1) {
        const t = step / TRIM_STEPS;
        if (!coversPoint(quadPoint(p0, control, p1, t), source, sourceInset)) break;
        t0 = t;
    }
    for (let step = 1; step <= TRIM_STEPS; step += 1) {
        const t = 1 - step / TRIM_STEPS;
        if (t <= t0 || !coversPoint(quadPoint(p0, control, p1, t), target, targetInset)) break;
        t1 = t;
    }
    if (t1 - t0 >= TRIM_MIN_SPAN) return [t0, t1];
    const middle = (t0 + t1) / 2;
    return [Math.max(0, middle - TRIM_MIN_SPAN / 2), Math.min(1, middle + TRIM_MIN_SPAN / 2)];
}

// Lines stop at the edge of each card so the stroke and its arrowhead stay visible.
export function connectionGeometry(source, target, curved, sourceInset = null, targetInset = null) {
    const p0 = { x: source.x, y: source.y }, p1 = { x: target.x, y: target.y };
    const mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2;
    let control = { x: mx, y: my };
    if (curved) {
        const dx = p1.x - p0.x, dy = p1.y - p0.y;
        const len = Math.hypot(dx, dy) || 1;
        const offset = Math.min(CURVE_MAX, len * CURVE_RATIO);
        control = { x: mx - (dy / len) * offset, y: my + (dx / len) * offset };
    }
    let start = p0, end = p1;
    if (sourceInset || targetInset) {
        const [t0, t1] = trimRange(p0, control, p1, source, target, sourceInset, targetInset);
        const sliced = quadSlice(p0, control, p1, t0, t1);
        start = sliced.p0; control = sliced.control; end = sliced.p1;
    }
    const middle = quadPoint(start, control, end, 0.5);
    return {
        d: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`,
        x: middle.x, y: middle.y, start, end, control,
        startDir: { x: start.x - control.x, y: start.y - control.y },
        endDir: { x: end.x - control.x, y: end.y - control.y },
    };
}

// A point on the drawn line, 0 at the source end and 1 at the target end.
export function connectionPointAt(connection, t) {
    return quadPoint(connection.start, connection.control, connection.end, t);
}

// pxPerUnit keeps the arrowhead a true triangle inside the non-uniformly scaled line layer.
export function arrowheadPoints(tipX, tipY, dir, pxPerUnit = { x: 1, y: 1 }) {
    const sx = pxPerUnit.x || 1, sy = pxPerUnit.y || 1;
    const len = Math.hypot(dir.x * sx, dir.y * sy) || 1;
    const ux = (dir.x * sx) / len, uy = (dir.y * sy) / len;
    const tipPxX = tipX * sx, tipPxY = tipY * sy;
    const baseX = tipPxX - ux * ARROW_LENGTH, baseY = tipPxY - uy * ARROW_LENGTH;
    const nx = -uy * ARROW_HALF_WIDTH, ny = ux * ARROW_HALF_WIDTH;
    const point = (x, y) => `${x / sx},${y / sy}`;
    return `${point(tipPxX, tipPxY)} ${point(baseX + nx, baseY + ny)} ${point(baseX - nx, baseY - ny)}`;
}

export function relationshipsAtEpisode(data, episode, insets = null) {
    const order = Array.isArray(data.episodes) ? data.episodes : null;
    const position = (number) => order ? order.indexOf(number) : number;
    const selected = position(episode);
    if (selected === undefined || selected < 0) return [];
    return data.relationships.flatMap((relationship) => {
        const change = relationship.changes.filter((item) => position(item.episode) >= 0 && position(item.episode) <= selected)
            .sort((a, b) => position(b.episode) - position(a.episode))[0];
        if (!change || change.hidden) return [];
        const source = data.characters.find((item) => item.id === relationship.source);
        const target = data.characters.find((item) => item.id === relationship.target);
        if (!source || !target) return [];
        return [{ ...relationship, ...change, source, target, ...connectionGeometry(source, target, change.curved, insets?.[source.id], insets?.[target.id]) }];
    });
}

export function characterMapEpisodes(data, episodeCount = 0) {
    if (Array.isArray(data.episodes)) return [...data.episodes];
    const last = Math.min(1000, Math.max(1, Number(episodeCount) || 0,
        ...data.relationships.flatMap((relationship) => relationship.changes.map((change) => Number(change.episode) || 1))));
    return Array.from({ length: last }, (_, index) => index + 1);
}

export function isCharacterMapEpisodePublic(data, episode) {
    return !(data.hidden_episodes || []).includes(episode);
}

export function setCharacterMapEpisodePublic(data, episode, isPublic) {
    const hidden = (data.hidden_episodes || []).filter((number) => number !== episode);
    return { ...data, hidden_episodes: isPublic ? hidden : [...hidden, episode].sort((a, b) => a - b) };
}

// Admins keep every entry; the public only sees the ones marked public.
export function visibleCharacterMapEpisodes(data, episodes, isAdmin = false) {
    return isAdmin ? episodes : episodes.filter((number) => isCharacterMapEpisodePublic(data, number));
}

export function removeCharacterMapEpisode(data, episodes, episode) {
    return { ...data, episodes: episodes.filter((number) => number !== episode),
        hidden_episodes: (data.hidden_episodes || []).filter((number) => number !== episode),
        relationships: data.relationships.map((relationship) => ({ ...relationship,
            changes: relationship.changes.filter((change) => change.episode !== episode),
        })).filter((relationship) => relationship.changes.length > 0) };
}

export const SWATCH_PRESETS = [
    { label: "Romance", color: "#c78390" },
    { label: "Friendship", color: "#87a292" },
    { label: "Family", color: "#ab96ba" },
    { label: "Colleagues", color: "#7c98b3" },
    { label: "Rivalry", color: "#c28a50" },
    { label: "Unknown", color: "#92949c" },
    { label: "Neutral", color: "#a67c52" },
    { label: "Berry", color: "#a5527a" },
    { label: "Moss", color: "#7a8f5c" },
    { label: "Gold", color: "#c9a227" },
];

export function nextRelationshipColor(data) {
    const used = new Set(data.relationships.map((relationship) => relationship.changes[relationship.changes.length - 1]?.color));
    const preset = SWATCH_PRESETS.find((item) => !used.has(item.color));
    return preset ? preset.color : SWATCH_PRESETS[data.relationships.length % SWATCH_PRESETS.length].color;
}

export function newRelationshipChange(episode, overrides = {}) {
    return { episode, label: "New relationship", description: "", color: SWATCH_PRESETS[0].color, line_style: "solid", curved: false, arrow_start: false, arrow_end: false, hidden: false, ...overrides };
}

const LEGACY_TONE_COLORS = { rose: "#b76d79", sage: "#66877e", honey: "#b68f50", lilac: "#9680a7" };

export function resolvePortraitColor(tone) {
    if (!tone) return SWATCH_PRESETS[0].color;
    if (tone.startsWith("#")) return tone;
    return LEGACY_TONE_COLORS[tone] || SWATCH_PRESETS[0].color;
}

const POSITION_GRID = 4;
const ALIGN_THRESHOLD = 3;

export function snapToGrid(value, min, max, step = POSITION_GRID) {
    return Math.min(max, Math.max(min, Math.round(value / step) * step));
}

export function snapPosition(value, otherValues, min, max, step = POSITION_GRID) {
    const alignTarget = otherValues.find((other) => Math.abs(other - value) <= ALIGN_THRESHOLD);
    if (alignTarget !== undefined) return Math.min(max, Math.max(min, alignTarget));
    return snapToGrid(value, min, max, step);
}

export const LABEL_SYMBOLS = ["♡", "?", "!", "★", "⚔"];

export function toggleLabelSymbol(label, symbol) {
    return label.startsWith(symbol) ? label.slice(symbol.length).trimStart() : `${symbol} ${label}`.trim();
}

export function characterMapEpisodeLabel(data, episode) {
    return data.episode_labels?.[episode]?.trim() || `Episode ${episode}`;
}

export function characterMapTexts(projectTitle) {
    return {
        eyebrow: 'CHARACTER MAP', heading: projectTitle,
        introduction: 'Tap a character or a relationship to explore.',
        decoration: 'a recipe for connection', storyLabel: 'Story so far',
        playedBy: 'Played by',
        characterDetails: 'Character details', noEpisodes: 'No episodes added',
        footer: 'Showing relationships through {episode}. ',
    };
}

const LINE_DASH = { solid: "", dashed: "6 4", dotted: "1.5 4.5" };

export function characterMapLineDash(lineStyle) {
    return LINE_DASH[lineStyle] || "";
}

export function characterMapArrow(connection) {
    if (connection.arrow_start && connection.arrow_end) return "↔";
    if (connection.arrow_end) return "→";
    if (connection.arrow_start) return "←";
    return "";
}

// A one-way relationship always reads left to right, so a back-pointing arrow swaps the two names.
export function characterMapDirection(connection) {
    const arrow = characterMapArrow(connection);
    if (arrow === "←") return { from: connection.target, to: connection.source, arrow: "→" };
    return { from: connection.source, to: connection.target, arrow };
}

// For the exported sheet: spread the cast across the whole canvas, keeping their relative spacing.
// The on-page chart usually leaves wide empty margins, which would otherwise shrink the cards.
export function fitCharacterMapPositions(data, { marginX = 7, marginLeft = marginX, marginRight = marginX, marginTop = 14, marginBottom = 18 } = {}) {
    if (!data.characters?.length) return data;
    const xs = data.characters.map((character) => character.x), ys = data.characters.map((character) => character.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    // The captions hang below a card, so the bottom keeps more room than the top.
    const remap = (value, min, span, start, end) => span < 1 ? (start + end) / 2 : start + ((value - min) * (end - start)) / span;
    return { ...data, characters: data.characters.map((character) => ({
        ...character,
        x: remap(character.x, minX, maxX - minX, marginLeft, 100 - marginRight),
        y: remap(character.y, minY, maxY - minY, marginTop, 100 - marginBottom),
    })) };
}

export function characterMapImageName(projectTitle, episodeLabel) {
    const name = [projectTitle, "character map", episodeLabel].filter(Boolean).join(" - ");
    return name.replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").trim() || "character map";
}

export const GROUP_PADDING_MIN = 4;
export const GROUP_PADDING_MAX = 40;
export const CANVAS_HEIGHT_MIN = 360;
export const CANVAS_HEIGHT_MAX = 3000;

export function characterGroupExtent(group, characters) {
    const members = characters.filter((character) => group.character_ids.includes(character.id));
    if (!members.length) return null;
    return {
        minX: Math.min(...members.map((character) => character.x)), maxX: Math.max(...members.map((character) => character.x)),
        minY: Math.min(...members.map((character) => character.y)), maxY: Math.max(...members.map((character) => character.y)),
    };
}

// Each member's card, in the 0-100 units the enclosure is drawn in.
export function characterCardSpans(characters, canvas, scale = 1, extents = null) {
    if (!canvas?.width || !canvas?.height) return null;
    const spans = {};
    for (const character of characters) {
        const card = characterCardBox(character, scale, extents);
        spans[character.id] = {
            halfX: ((card.spanWidth / 2) / canvas.width) * 100,
            top: ((card.height / 2) / canvas.height) * 100,
            bottom: ((card.height / 2 + card.textAllowance) / canvas.height) * 100,
        };
    }
    return spans;
}

const GROUP_CARD_MARGIN = 1.5;

// The enclosure keeps whatever size it was dragged to, but never smaller than the cards inside it.
export function characterGroupBounds(group, characters, spans = null) {
    const extent = characterGroupExtent(group, characters);
    if (!extent) return null;
    const paddingX = group.padding_x ?? 15, paddingY = group.padding_y ?? 22;
    let left = extent.minX - (group.padding_left ?? paddingX), right = extent.maxX + (group.padding_right ?? paddingX);
    let top = extent.minY - (group.padding_top ?? paddingY), bottom = extent.maxY + (group.padding_bottom ?? paddingY);
    if (spans) {
        for (const character of characters.filter((item) => group.character_ids.includes(item.id))) {
            const span = spans[character.id];
            if (!span) continue;
            left = Math.min(left, character.x - span.halfX - GROUP_CARD_MARGIN);
            right = Math.max(right, character.x + span.halfX + GROUP_CARD_MARGIN);
            top = Math.min(top, character.y - span.top - GROUP_CARD_MARGIN);
            bottom = Math.max(bottom, character.y + span.bottom + GROUP_CARD_MARGIN);
        }
    }
    // Same gap either side of the cast, so the group looks centred on the characters it holds.
    const members = characters.filter((item) => group.character_ids.includes(item.id));
    if (members.length) {
        const centerX = (Math.min(...members.map((item) => item.x - (spans?.[item.id]?.halfX ?? 0)))
            + Math.max(...members.map((item) => item.x + (spans?.[item.id]?.halfX ?? 0)))) / 2;
        const needed = Math.max(...members.map((item) => Math.abs(item.x - centerX) + (spans?.[item.id]?.halfX ?? 0) + GROUP_CARD_MARGIN));
        const halfX = Math.max(needed, Math.min(Math.max(centerX - left, right - centerX), centerX - 0.4, 99.6 - centerX));
        left = centerX - halfX;
        right = centerX + halfX;
    }
    left = Math.max(0.4, left); right = Math.min(99.6, right);
    top = Math.max(0.4, top); bottom = Math.min(99.6, bottom);
    return { left, top, width: right - left, height: bottom - top, extent, paddingX, paddingY };
}
