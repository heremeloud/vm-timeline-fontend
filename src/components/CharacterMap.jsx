import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "../styles/CharacterMap.css";
import { getAuthors } from "../api/authorsService";
import VisibilityToggle from "./VisibilityToggle";
import { relationshipsAtEpisode, connectionPointAt, isCharacterMapEpisodePublic, visibleCharacterMapEpisodes, characterCardInsets, characterCardMetrics, characterCardTextAllowance, characterCardSize, CARD_COMPACT_SCALE, CARD_SIZE_KEYS, CARD_SIZE_LABELS, characterMapEpisodes, characterMapEpisodeLabel, characterMapImageName, characterMapTexts, characterGroupBounds, characterMapLineDash, characterMapDirection, newRelationshipChange, nextRelationshipColor, arrowheadPoints, resolvePortraitColor, SWATCH_PRESETS, LABEL_SYMBOLS, toggleLabelSymbol, snapPosition, GROUP_PADDING_MIN, GROUP_PADDING_MAX, CANVAS_HEIGHT_MIN, CANVAS_HEIGHT_MAX } from "../utils/characterMap";

const LINE_STYLES = ["solid", "dashed", "dotted"];
const MIN_CANVAS_HEIGHT = 490;
const HEIGHT_PER_CHARACTER = 56;
const HEIGHT_OFFSET = 220;

function canvasHeightFor(characterCount) {
    return Math.max(MIN_CANVAS_HEIGHT, characterCount * HEIGHT_PER_CHARACTER + HEIGHT_OFFSET);
}

const LABEL_SIDE_MARGIN = 12;
const LABEL_MIN_WIDTH = 56;
const LABEL_MAX_WIDTH = 190;
const LABEL_MAX_HEIGHT = 64;
const LABEL_POSITIONS = [0.5, 0.38, 0.62, 0.28, 0.72];

function useCanvasSize(ref) {
    const [size, setSize] = useState(null);
    useLayoutEffect(() => {
        const node = ref.current;
        if (!node || typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            setSize((current) => current && current.width === width && current.height === height ? current : { width, height });
        });
        observer.observe(node);
        return () => observer.disconnect();
    }, [ref]);
    return size;
}

function useCompactCards() {
    const [compact, setCompact] = useState(false);
    useEffect(() => {
        const query = window.matchMedia("(max-width: 520px)");
        const update = () => setCompact(query.matches);
        update();
        query.addEventListener("change", update);
        return () => query.removeEventListener("change", update);
    }, []);
    return compact;
}

function overlaps(a, b) {
    return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

// A relationship keeps its label on the line while it fits the line and clears the cards and the labels already placed.
function labelSpan(connection, canvas) {
    const scaleX = canvas.width / 100, scaleY = canvas.height / 100;
    return Math.hypot((connection.end.x - connection.start.x) * scaleX, (connection.end.y - connection.start.y) * scaleY);
}

// How wide a label may grow before it must wrap: the room the line itself offers.
function labelBudgets(connections, canvas) {
    const budgets = {};
    if (!canvas?.width || !canvas?.height) return budgets;
    for (const connection of connections) {
        budgets[connection.id] = Math.max(LABEL_MIN_WIDTH, Math.min(LABEL_MAX_WIDTH, labelSpan(connection, canvas) - LABEL_SIDE_MARGIN));
    }
    return budgets;
}

// Keeps every relationship name on its line where one will fit, sliding it along the line before giving up.
function inlineLabelPositions(connections, characters, canvas, cardScale, labelSizes, cardExtents) {
    const placed = new Map();
    if (!canvas?.width || !canvas?.height) return placed;
    const scaleX = canvas.width / 100, scaleY = canvas.height / 100;
    const taken = characters.map((character) => {
        const card = characterCardMetrics(character, cardScale);
        const centerX = character.x * scaleX, centerY = character.y * scaleY;
        return { left: centerX - card.width / 2, right: centerX + card.width / 2, top: centerY - card.height / 2,
            bottom: centerY + card.height / 2 + characterCardTextAllowance(character, cardScale, cardExtents) };
    });
    for (const connection of connections) {
        const size = labelSizes[connection.id];
        if (!size?.width || !connection.label.trim()) continue;
        if (size.height > LABEL_MAX_HEIGHT) continue;
        if (size.width + LABEL_SIDE_MARGIN > labelSpan(connection, canvas)) continue;
        for (const t of LABEL_POSITIONS) {
            const spot = connectionPointAt(connection, t);
            const centerX = spot.x * scaleX, centerY = spot.y * scaleY;
            const box = { left: centerX - size.width / 2 - 3, right: centerX + size.width / 2 + 3, top: centerY - size.height / 2 - 2, bottom: centerY + size.height / 2 + 2 };
            if (box.left < 0 || box.right > canvas.width || box.top < 0 || box.bottom > canvas.height) continue;
            if (taken.some((item) => overlaps(box, item))) continue;
            taken.push(box);
            placed.set(connection.id, spot);
            break;
        }
    }
    return placed;
}

function CharacterPortrait({ character }) {
    const [failedUrl, setFailedUrl] = useState(null);
    return character.photo && character.photo !== failedUrl
        ? <img className="character-map-portrait" src={character.photo} alt="" onError={() => setFailedUrl(character.photo)} />
        : <Portrait tone={character.tone} />;
}

function Portrait({ tone }) {
    return <svg className="character-map-portrait" style={{ color: resolvePortraitColor(tone) }} viewBox="0 0 100 100" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <circle cx="50" cy="50" r="48" fill="currentColor" opacity=".12" />
        <path d="M20 97c0-25 12-36 30-36s30 11 30 36" fill="currentColor" opacity=".55" />
        <path d="M29 45c0-22 9-30 21-30s23 9 23 31l-5 26H31Z" fill="currentColor" opacity=".7" />
        <ellipse cx="50" cy="44" rx="16" ry="21" fill="#fff4e8" />
        <path d="M32 39c1-18 11-24 20-22 13 1 20 11 18 23-11-3-16-10-19-15-3 8-9 12-19 14Z" fill="currentColor" />
    </svg>;
}

function PopoverShell({ label, onClose, children }) {
    return <aside className="character-map-popover character-map-side-panel" aria-label={label}>
        <button type="button" className="character-map-close" aria-label="Close editor" onClick={onClose}>×</button>
        {children}
        <div className="character-map-side-save">
            <button type="submit">Save character map</button>
            <button type="button" onClick={onClose}>Close panel</button>
        </div>
    </aside>;
}

function ConnectionPopover({ data, onChange, connection, episode, episodes, onClose }) {
    const relationship = data.relationships.find((item) => item.id === connection.id);
    if (!relationship) return null;
    function updateActive(patch) {
        onChange({ ...data, relationships: data.relationships.map((item) => item.id === relationship.id
            ? { ...item, changes: item.changes.map((change) => change.episode === connection.episode ? { ...change, ...patch } : change) }
            : item) });
    }
    function forkHere() {
        onChange({ ...data, relationships: data.relationships.map((item) => item.id === relationship.id
            ? { ...item, changes: [...item.changes, newRelationshipChange(episode, { label: connection.label, description: connection.description, color: connection.color, line_style: connection.line_style, curved: connection.curved, arrow_start: connection.arrow_start, arrow_end: connection.arrow_end })] }
            : item) });
    }
    function deleteState() {
        if (relationship.changes.length <= 1) { onChange({ ...data, relationships: data.relationships.filter((item) => item.id !== relationship.id) }); onClose(); return; }
        onChange({ ...data, relationships: data.relationships.map((item) => item.id === relationship.id
            ? { ...item, changes: item.changes.filter((change) => change.episode !== connection.episode) } : item) });
    }
    return <PopoverShell label={`Edit relationship between ${connection.source.name} and ${connection.target.name}`} onClose={onClose}>
        <p className="character-map-popover-title">{connection.source.name} &amp; {connection.target.name}</p>
        <label>Text on the line<input maxLength={80} value={connection.label} onChange={(event) => updateActive({ label: event.target.value })} /></label>
        <div className="character-map-swatches" role="group" aria-label="Insert a symbol">
            {LABEL_SYMBOLS.map((symbol) => <button key={symbol} type="button" className={`character-map-symbol${connection.label.startsWith(symbol) ? " is-selected" : ""}`} onClick={() => updateActive({ label: toggleLabelSymbol(connection.label, symbol) })}>{symbol}</button>)}
        </div>
        <div className="character-map-fields">
            <label>Line color<input type="color" value={connection.color} onChange={(event) => updateActive({ color: event.target.value })} /></label>
            <label>Line style<select value={connection.line_style} onChange={(event) => updateActive({ line_style: event.target.value })}>{LINE_STYLES.map((style) => <option key={style} value={style}>{style}</option>)}</select></label>
        </div>
        <div className="character-map-swatches" role="group" aria-label="Quick colors">
            {SWATCH_PRESETS.map((preset) => <button key={preset.label} type="button" className={connection.color === preset.color ? "is-selected" : ""} style={{ '--swatch-color': preset.color }} title={preset.label} aria-label={preset.label} onClick={() => updateActive({ color: preset.color })} />)}
        </div>
        <div className="character-map-fields">
            <label className="character-map-visibility"><input type="checkbox" checked={connection.arrow_start} onChange={(event) => updateActive({ arrow_start: event.target.checked })} /> Arrow toward {connection.source.name}</label>
            <label className="character-map-visibility"><input type="checkbox" checked={connection.arrow_end} onChange={(event) => updateActive({ arrow_end: event.target.checked })} /> Arrow toward {connection.target.name}</label>
        </div>
        <label className="character-map-visibility"><input type="checkbox" checked={!!connection.curved} onChange={(event) => updateActive({ curved: event.target.checked })} /> Curve this line</label>
        <label>Details<textarea maxLength={5000} value={connection.description} onChange={(event) => updateActive({ description: event.target.value })} /></label>
        <label className="character-map-visibility"><input type="checkbox" checked={connection.hidden} onChange={(event) => updateActive({ hidden: event.target.checked })} /> Hide this connection from here</label>
        {connection.episode !== episode
            ? <p className="eventform-field-note">Showing the state carried over from {characterMapEpisodeLabel(data, connection.episode)}. Editing changes it from there onward.
                {episodes.includes(episode) && <button type="button" onClick={forkHere}> Start a new state at {characterMapEpisodeLabel(data, episode)} instead</button>}</p>
            : null}
        <div className="character-map-editor-actions">
            <button type="button" onClick={deleteState}>{relationship.changes.length <= 1 ? "Delete relationship" : "Delete this state"}</button>
            {relationship.changes.length > 1 && <button type="button" onClick={() => { onChange({ ...data, relationships: data.relationships.filter((item) => item.id !== relationship.id) }); onClose(); }}>Delete whole relationship</button>}
        </div>
    </PopoverShell>;
}

function CharacterEditPopover({ data, onChange, character, authors, authorsLoading, onStartLink, onRemove, onClose }) {
    function update(patch) {
        onChange({ ...data, characters: data.characters.map((item) => item.id === character.id ? { ...item, ...patch } : item) });
    }
    return <PopoverShell label={`Edit ${character.name || "character"}`} onClose={onClose}>
        <p className="character-map-popover-title">{character.name || "New character"}</p>
        <div className="character-map-fields">
            <label>Name<input required maxLength={120} value={character.name} onChange={(event) => update({ name: event.target.value })} /></label>
            <label>Thai name<input lang="th" maxLength={120} value={character.thai_name || ""} onChange={(event) => update({ thai_name: event.target.value })} /></label>
        </div>
        <div className="character-map-fields">
            <label>Short role<input maxLength={200} value={character.role} onChange={(event) => update({ role: event.target.value })} /></label>
            <label>Played by<select value={character.author_id ?? "manual"} onChange={(event) => {
                const author = authors.find((item) => String(item.id) === event.target.value);
                update(author ? { author_id: author.id, actor: author.name } : { author_id: null });
            }}>
                <option value="manual">Enter name manually</option>
                {authorsLoading && <option disabled>Loading authors…</option>}
                {character.author_id && !authors.some((author) => author.id === character.author_id) && <option value={character.author_id}>{character.actor || "Selected author"} (saved)</option>}
                {authors.map((author) => <option key={author.id} value={author.id}>{author.name}</option>)}
            </select></label>
        </div>
        {!character.author_id && <label>Actor name<input maxLength={120} value={character.actor || ""} onChange={(event) => update({ actor: event.target.value })} /></label>}
        <label>Card size<select value={characterCardSize(character)} onChange={(event) => update({ size: event.target.value })}>
            {CARD_SIZE_KEYS.map((key) => <option key={key} value={key}>{CARD_SIZE_LABELS[key]}</option>)}
        </select></label>
        <label>Portrait URL<input placeholder="https://…" value={character.photo || ""} onChange={(event) => update({ photo: event.target.value.trim() })} /></label>
        <label>Introduction<textarea maxLength={5000} value={character.description} onChange={(event) => update({ description: event.target.value })} /></label>
        <p className="eventform-field-note">Portrait color</p>
        <div className="character-map-swatches" role="group" aria-label="Portrait color">
            {SWATCH_PRESETS.map((preset) => <button key={preset.label} type="button" className={resolvePortraitColor(character.tone) === preset.color ? "is-selected" : ""} style={{ '--swatch-color': preset.color }} title={preset.label} aria-label={preset.label} onClick={() => update({ tone: preset.color })} />)}
        </div>
        <div className="character-map-editor-actions">
            <button type="button" onClick={onStartLink}>Connect to another character →</button>
            <button type="button" onClick={onRemove}>Remove character</button>
        </div>
    </PopoverShell>;
}

export default function CharacterMap({ data, onChange, projectTitle, episodeCount = 0, editable = false, isAdmin = false, headerControls = null, onEpisodePublicChange = null, busy = false }) {
    const characters = data.characters;
    const texts = { ...characterMapTexts(projectTitle), ...data.texts };
    const [selectedEpisode, setEpisode] = useState(null);
    const [expanded, setExpanded] = useState(false);
    const [measureTick, setMeasureTick] = useState(0);
    const [exporting, setExporting] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState("");
    const sectionRef = useRef(null);
    const seesEveryEpisode = isAdmin || editable;
    const episodes = visibleCharacterMapEpisodes(data, characterMapEpisodes(data, episodeCount), seesEveryEpisode);
    const episode = episodes.includes(selectedEpisode) ? selectedEpisode : episodes[0];
    const episodeHidden = episode !== undefined && !isCharacterMapEpisodePublic(data, episode);
    const [selected, setSelected] = useState(null);
    const [linkingId, setLinkingId] = useState(null);
    const [editingConnectionId, setEditingConnectionId] = useState(null);
    const [editingCharacterId, setEditingCharacterId] = useState(null);
    const [hoverId, setHoverId] = useState(null);
    const [hoveredConnectionId, setHoveredConnectionId] = useState(null);
    const [authors, setAuthors] = useState([]);
    const [authorsLoading, setAuthorsLoading] = useState(editable);
    const dialog = useRef(null);
    const canvasRef = useRef(null);
    const dragRef = useRef(null);
    const groupResizeRef = useRef(null);
    const canvasResizeRef = useRef(null);
    const labelRefs = useRef(new Map());
    const personRefs = useRef(new Map());
    const [cardExtents, setCardExtents] = useState({});
    const [labelSizes, setLabelSizes] = useState({});
    const canvasSize = useCanvasSize(canvasRef);
    const compact = useCompactCards();
    const cardScale = compact ? CARD_COMPACT_SCALE : 1;
    const insets = useMemo(() => characterCardInsets(characters, canvasSize, cardScale, cardExtents), [characters, canvasSize, cardScale, cardExtents]);
    const connections = relationshipsAtEpisode(data, episode, insets);
    const pxPerUnit = canvasSize ? { x: canvasSize.width / 100, y: canvasSize.height / 100 } : null;
    const connectionSignature = connections.map((connection) => `${connection.id}:${connection.label}:${connection.start.x.toFixed(1)},${connection.start.y.toFixed(1)},${connection.end.x.toFixed(1)},${connection.end.y.toFixed(1)}`).join("|");
    const canvasHeight = data.canvas_height ?? canvasHeightFor(characters.length);
    const active = selected?.kind === "character" ? characters.find((item) => item.id === selected.id)
        : selected?.kind === "group" ? (data.groups || []).find((item) => item.id === selected.id)
        : connections.find((item) => item.id === selected?.id);
    const activeDirection = selected?.kind === "relationship" && active ? characterMapDirection(active) : null;
    const editingConnection = editable ? connections.find((item) => item.id === editingConnectionId) : null;
    const editingCharacter = editable ? characters.find((item) => item.id === editingCharacterId) : null;
    const focusId = linkingId || hoverId;
    const touchesFocus = (connection) => connection.source.id === focusId || connection.target.id === focusId;

    useEffect(() => {
        if (!editable) return;
        let stillMounted = true;
        getAuthors().then((response) => { if (stillMounted) setAuthors(response.data || []); })
            .catch(() => {})
            .finally(() => { if (stillMounted) setAuthorsLoading(false); });
        return () => { stillMounted = false; };
    }, [editable]);

    useEffect(() => {
        const remeasure = () => setMeasureTick((value) => value + 1);
        document.addEventListener("visibilitychange", remeasure);
        document.fonts?.ready.then(remeasure).catch(() => {});
        return () => document.removeEventListener("visibilitychange", remeasure);
    }, []);
    const characterSignature = characters.map((character) => `${character.id}:${character.name}:${character.role}:${character.thai_name || ""}:${characterCardSize(character)}`).join("|");
    useLayoutEffect(() => {
        const measured = {};
        for (const [id, node] of personRefs.current) {
            const box = node.getBoundingClientRect();
            measured[id] = Math.max(0, ...[...node.children].map((child) => child.getBoundingClientRect().bottom - box.bottom));
        }
        setCardExtents((current) => {
            const ids = Object.keys(measured);
            const same = ids.length === Object.keys(current).length && ids.every((id) => Math.abs((current[id] ?? -1) - measured[id]) < 0.5);
            return same ? current : measured;
        });
    }, [characterSignature, canvasSize, compact, measureTick]);
    const budgets = useMemo(() => labelBudgets(connections, canvasSize),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [connectionSignature, canvasSize]);
    useLayoutEffect(() => {
        const measured = {};
        for (const [id, node] of labelRefs.current) {
            const box = node.getBoundingClientRect();
            measured[id] = { width: box.width, height: box.height };
        }
        setLabelSizes((current) => {
            const ids = Object.keys(measured);
            const same = ids.length === Object.keys(current).length
                && ids.every((id) => current[id] && Math.abs(current[id].width - measured[id].width) < 0.5 && Math.abs(current[id].height - measured[id].height) < 0.5);
            return same ? current : measured;
        });
    }, [connectionSignature, compact, canvasSize, measureTick]);
    const inlineLabels = useMemo(() => inlineLabelPositions(connections, characters, canvasSize, cardScale, labelSizes, cardExtents),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [connectionSignature, characters, canvasSize, cardScale, labelSizes, cardExtents]);

    function openDetails(kind, id) {
        setSelected({ kind, id });
        dialog.current.showModal();
    }

    function startLinking(id) {
        setEditingCharacterId(null);
        setEditingConnectionId(null);
        setLinkingId(id);
    }

    function completeLink(id) {
        if (linkingId === id) { setLinkingId(null); return; }
        const existing = data.relationships.find((relationship) => (relationship.source === linkingId && relationship.target === id) || (relationship.source === id && relationship.target === linkingId));
        if (existing) {
            const visible = connections.some((connection) => connection.id === existing.id);
            if (!visible) onChange({ ...data, relationships: data.relationships.map((relationship) => relationship.id === existing.id
                ? { ...relationship, changes: [...relationship.changes, newRelationshipChange(episode, { color: nextRelationshipColor(data) })] } : relationship) });
            setEditingConnectionId(existing.id);
        } else {
            const newId = crypto.randomUUID();
            onChange({ ...data, relationships: [...data.relationships, { id: newId, source: linkingId, target: id, changes: [newRelationshipChange(episode, { color: nextRelationshipColor(data) })] }] });
            setEditingConnectionId(newId);
        }
        setLinkingId(null);
    }

    function handleCharacterClick(character) {
        if (!editable) { openDetails("character", character.id); return; }
        if (dragRef.current?.moved) { dragRef.current = null; return; }
        dragRef.current = null;
        if (linkingId) { completeLink(character.id); return; }
        setEditingConnectionId(null);
        setEditingCharacterId(character.id);
    }

    function handlePointerDown(event, character) {
        if (!editable) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = { id: character.id, startX: event.clientX, startY: event.clientY, moved: false };
    }

    function handlePointerMove(event) {
        if (!editable || !dragRef.current || !canvasRef.current) return;
        const state = dragRef.current;
        if (Math.hypot(event.clientX - state.startX, event.clientY - state.startY) > 4) state.moved = true;
        if (!state.moved) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const others = data.characters.filter((item) => item.id !== state.id);
        const x = snapPosition(((event.clientX - rect.left) / rect.width) * 100, others.map((item) => item.x), 12, 88);
        const y = snapPosition(((event.clientY - rect.top) / rect.height) * 100, others.map((item) => item.y), 18, 82);
        onChange({ ...data, characters: data.characters.map((item) => item.id === state.id ? { ...item, x, y } : item) });
    }

    function handlePointerUp(event) {
        if (!editable) return;
        event.currentTarget.releasePointerCapture(event.pointerId);
    }

    function handleGroupResizeDown(event, group, bounds, edge = "corner") {
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        groupResizeRef.current = { groupId: group.id, extent: bounds.extent, edge, startX: event.clientX, startY: event.clientY, group };
    }

    function handleGroupResizeMove(event) {
        const state = groupResizeRef.current;
        if (!state || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const dx = ((event.clientX - state.startX) / rect.width) * 100;
        const dy = ((event.clientY - state.startY) / rect.height) * 100;
        const clamp = (value) => Math.min(GROUP_PADDING_MAX, Math.max(GROUP_PADDING_MIN, value));
        const patch = {};
        if (state.edge === "top") patch.padding_top = clamp((state.group.padding_top ?? state.group.padding_y ?? 22) - dy);
        if (state.edge === "left") patch.padding_left = clamp((state.group.padding_left ?? state.group.padding_x ?? 15) - dx);
        if (state.edge === "bottom" || state.edge === "corner") patch.padding_bottom = clamp((state.group.padding_bottom ?? state.group.padding_y ?? 22) + dy);
        if (state.edge === "right" || state.edge === "corner") patch.padding_right = clamp((state.group.padding_right ?? state.group.padding_x ?? 15) + dx);
        onChange({ ...data, groups: data.groups.map((item) => item.id === state.groupId ? { ...item, ...patch } : item) });
    }

    function handleGroupResizeUp(event) {
        if (!groupResizeRef.current) return;
        event.currentTarget.releasePointerCapture(event.pointerId);
        groupResizeRef.current = null;
    }

    function handleCanvasResizeDown(event) {
        event.currentTarget.setPointerCapture(event.pointerId);
        canvasResizeRef.current = { startY: event.clientY, startHeight: canvasHeight };
    }

    function handleCanvasResizeMove(event) {
        const state = canvasResizeRef.current;
        if (!state) return;
        const height = Math.min(CANVAS_HEIGHT_MAX, Math.max(CANVAS_HEIGHT_MIN, state.startHeight + (event.clientY - state.startY)));
        onChange({ ...data, canvas_height: height });
    }

    function handleCanvasResizeUp(event) {
        if (!canvasResizeRef.current) return;
        event.currentTarget.releasePointerCapture(event.pointerId);
        canvasResizeRef.current = null;
    }

    function connectionClick(connection) {
        if (!editable) { openDetails("relationship", connection.id); return; }
        setEditingCharacterId(null);
        setEditingConnectionId(connection.id);
    }

    function addCharacter() {
        const newId = crypto.randomUUID();
        const tone = SWATCH_PRESETS[characters.length % SWATCH_PRESETS.length].color;
        onChange({ ...data, characters: [...data.characters, { id: newId, name: "New character", role: "", actor: "", photo: "", description: "", tone, size: "medium", x: 50, y: 50 }] });
        setEditingCharacterId(newId);
    }

    function removeCharacter(character) {
        if (!confirm(`Remove ${character.name} and their relationships from this draft?`)) return;
        onChange({ ...data,
            groups: (data.groups || []).map((group) => ({ ...group, character_ids: group.character_ids.filter((id) => id !== character.id) })),
            characters: data.characters.filter((item) => item.id !== character.id),
            relationships: data.relationships.filter((item) => item.source !== character.id && item.target !== character.id) });
        setEditingCharacterId(null);
    }

    // Saves what the chart currently shows: same episode, same layout, without the admin-only controls.
    async function downloadImage() {
        if (!sectionRef.current || downloading) return;
        setDownloading(true);
        setDownloadError("");
        const chart = sectionRef.current;
        // The image is always the wide layout, whatever width the page is showing.
        const wasExpanded = expanded;
        setExporting(true);
        if (!wasExpanded) setExpanded(true);
        await new Promise((resolve) => setTimeout(resolve, 400));
        const skipped = ["character-map-heading-controls", "character-map-edit-hint", "character-map-hidden-note",
            "character-map-canvas-resize", "character-map-group-handle", "character-map-label-measure",
            "character-map-side-panel", "visibility-toggle"];
        const options = { pixelRatio: 2, backgroundColor: "#fffcf6",
            // The wide chart is centred with negative margins; the copy has to start at its own origin.
            style: { margin: "0" },
            filter: (node) => !skipped.some((name) => node.classList?.contains(name)) };
        try {
            const { elementToPngBlob } = await import("../utils/chartImage");
            const blob = await elementToPngBlob(chart, options);
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `${characterMapImageName(projectTitle, episode ? characterMapEpisodeLabel(data, episode) : "")}.png`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(link.href), 10000);
        } catch (error) {
            setDownloadError(`Could not save the image: ${error?.message || "unknown error"}.`);
        } finally {
            setExporting(false);
            if (!wasExpanded) setExpanded(false);
            setDownloading(false);
        }
    }

    function clearHover(id) {
        setHoverId((current) => current === id ? null : current);
    }

    return <section ref={sectionRef} className={`character-map${editable && (editingCharacter || editingConnection) ? " has-side-editor" : ""}${expanded ? " is-expanded" : ""}${exporting ? " is-exporting" : ""}`} aria-labelledby="character-map-heading">
        <div className="character-map-heading">
            <div><span className="character-map-eyebrow">{texts.eyebrow}</span>
                <h2 id="character-map-heading">{texts.heading}</h2>
                <p>{texts.introduction}</p>
            </div>
            <div className="character-map-heading-controls">
                <div className="character-map-header-actions">
                <button type="button" className="character-map-expand" aria-label={expanded ? "Restore chart width" : "Expand chart width"} aria-pressed={expanded} title={expanded ? "Restore chart width" : "Expand chart width"} onClick={() => setExpanded((value) => !value)}>{expanded ? "→←" : "↔"}</button>
                <button type="button" className="character-map-expand character-map-download" disabled={downloading}
                    aria-label="Download the chart as an image" title="Download the chart as an image" onClick={downloadImage}>{downloading ? "…" : "⤓"}</button>
                </div>
                {downloadError && <p className="character-map-download-error" role="alert">{downloadError}</p>}
                {headerControls}
            </div>
        </div>
        <div className="character-map-toolbar">
            <div className="character-map-episode-controls">
            <label><span className="character-map-story-label">{texts.storyLabel}</span> <select disabled={!episodes.length} value={episode ?? ""} onChange={(event) => { setEpisode(Number(event.target.value)); setEditingConnectionId(null); }}>
                {!episodes.length && <option value="">{texts.noEpisodes}</option>}
                {episodes.map((number) => <option key={number} value={number}>{characterMapEpisodeLabel(data, number)}{seesEveryEpisode && !isCharacterMapEpisodePublic(data, number) ? " · hidden" : ""}</option>)}
            </select></label>
            {onEpisodePublicChange && episode !== undefined && <VisibilityToggle checked={!episodeHidden} disabled={busy}
                label={busy ? "Saving…" : "Public"}
                title={episodeHidden ? "Hidden from the public — admins still see this entry" : "Visible to the public"}
                ariaLabel={`Show ${characterMapEpisodeLabel(data, episode)} to the public`}
                onChange={(event) => onEpisodePublicChange(episode, event.target.checked)} />}
            {seesEveryEpisode && episodeHidden && <span className="character-map-hidden-note">Hidden from the public — only admins see this entry.</span>}
            </div>
            {editable && <button type="button" disabled={characters.length >= 40} onClick={addCharacter}>+ Add character</button>}
        </div>
        <div className="character-map-canvas" ref={canvasRef} style={{ height: `${canvasHeight}px` }}>
            {(data.groups || []).map((group) => {
                const bounds = characterGroupBounds(group, characters);
                if (!bounds) return null;
                return <div key={group.id} className={`character-map-group ${group.shape}`} style={{ left: `${bounds.left}%`, top: `${bounds.top}%`, width: `${bounds.width}%`, height: `${bounds.height}%`, '--group-color': group.color }} role="group" aria-label={`${group.label}: ${characters.filter((character) => group.character_ids.includes(character.id)).map((character) => character.name).join(', ')}`}>
                    <button type="button" className={`character-map-group-label ${group.label_position === "bottom" ? "bottom" : "top"}`} onClick={() => openDetails("group", group.id)}>{group.label}</button>
                    {editable && ["top", "bottom", "left", "right"].map((edge) => <button key={edge} type="button" className={`character-map-group-edge ${edge}`} aria-label={`Adjust ${group.label || "group"} ${edge} margin`} title={`Drag to adjust ${edge} margin`}
                        onPointerDown={(event) => handleGroupResizeDown(event, group, bounds, edge)} onPointerMove={handleGroupResizeMove} onPointerUp={handleGroupResizeUp} onPointerCancel={handleGroupResizeUp}
                        onKeyDown={(event) => {
                            if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
                            event.preventDefault();
                            const vertical = edge === "top" || edge === "bottom";
                            const direction = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
                            const value = (group[`padding_${edge}`] ?? (vertical ? group.padding_y ?? 22 : group.padding_x ?? 15)) + direction * (edge === "top" || edge === "left" ? -1 : 1);
                            onChange({ ...data, groups: data.groups.map((item) => item.id === group.id ? { ...item, [`padding_${edge}`]: Math.min(GROUP_PADDING_MAX, Math.max(GROUP_PADDING_MIN, value)) } : item) });
                        }} />)}
                    {editable && <button type="button" className="character-map-group-handle" aria-label={`Resize ${group.label || "group"} enclosure`}
                        onPointerDown={(event) => handleGroupResizeDown(event, group, bounds)}
                        onPointerMove={handleGroupResizeMove}
                        onPointerUp={handleGroupResizeUp} onPointerCancel={handleGroupResizeUp} />}
                </div>;
            })}
            {!editable && <span className="character-map-decoration" aria-hidden="true">{texts.decoration}</span>}
            <svg className="character-map-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                {connections.map((connection) => <path key={connection.id} d={connection.d} className={focusId && !touchesFocus(connection) ? "is-dimmed" : ""}
                    fill="none" strokeWidth={2} vectorEffect="non-scaling-stroke"
                    style={{ stroke: connection.color, strokeDasharray: characterMapLineDash(connection.line_style) }} />)}
                {connections.map((connection) => <g key={`${connection.id}-arrows`} className={focusId && !touchesFocus(connection) ? "is-dimmed" : ""}>
                    {pxPerUnit && connection.arrow_end && <polygon points={arrowheadPoints(connection.end.x, connection.end.y, connection.endDir, pxPerUnit)} style={{ fill: connection.color }} />}
                    {pxPerUnit && connection.arrow_start && <polygon points={arrowheadPoints(connection.start.x, connection.start.y, connection.startDir, pxPerUnit)} style={{ fill: connection.color }} />}
                </g>)}
            </svg>
            {characters.map((character) => {
                const mainName = characterCardSize(character) === "large"
                    ? character.name.match(/^(["“][^"”]+["”])\s+(.+)$/u)
                    : null;
                const dimmed = focusId && character.id !== focusId && !connections.some((connection) => touchesFocus(connection) && (connection.source.id === character.id || connection.target.id === character.id));
                return <button key={character.id} type="button" ref={(node) => { if (node) personRefs.current.set(character.id, node); else personRefs.current.delete(character.id); }} className={`character-map-person is-${characterCardSize(character)}${editable && linkingId === character.id ? " linking" : ""}${dimmed ? " is-dimmed" : ""}`} style={{ left: `${character.x}%`, top: `${character.y}%` }}
                    onPointerDown={editable ? (event) => handlePointerDown(event, character) : undefined}
                    onPointerMove={editable ? handlePointerMove : undefined}
                    onPointerUp={editable ? handlePointerUp : undefined}
                    onPointerEnter={() => !dragRef.current && setHoverId(character.id)}
                    onPointerLeave={() => clearHover(character.id)}
                    onClick={() => handleCharacterClick(character)} aria-label={editable ? `${character.name}: drag to move, tap to edit` : `View ${character.name} details`}>
                    <span className="character-map-frame"><CharacterPortrait character={character} /></span>
                    <strong>{mainName ? <>{mainName[1]}<br />{mainName[2]}</> : character.name}</strong>{character.thai_name && <span className="character-map-thai-name" lang="th">{character.thai_name}</span>}<span>{character.role}</span>
                </button>;
            })}
            <div className="character-map-label-measure" aria-hidden="true">
                {connections.map((connection) => <span key={connection.id} className="character-map-connection-label" style={{ maxWidth: `${budgets[connection.id] || LABEL_MIN_WIDTH}px` }}
                    ref={(node) => { if (node) labelRefs.current.set(connection.id, node); else labelRefs.current.delete(connection.id); }}>{connection.label}</span>)}
            </div>
            {connections.map((connection) => {
                const revealed = focusId ? touchesFocus(connection) : hoveredConnectionId === connection.id;
                const inline = inlineLabels.get(connection.id);
                return <button key={connection.id} type="button" className={`character-map-connection${inline ? " has-inline-label" : ""}${revealed ? " is-revealed" : ""}${focusId && !touchesFocus(connection) ? " is-dimmed" : ""}`} style={{ left: `${(inline || connection).x}%`, top: `${(inline || connection).y}%`, '--connection-color': connection.color, ...(inline ? { maxWidth: `${budgets[connection.id] || LABEL_MIN_WIDTH}px` } : {}) }}
                    onPointerEnter={() => setHoveredConnectionId(connection.id)}
                    onPointerLeave={() => setHoveredConnectionId((current) => current === connection.id ? null : current)}
                    onClick={() => connectionClick(connection)} aria-label={`${connection.label}: ${editable ? "edit" : "view"} relationship between ${connection.source.name} and ${connection.target.name}`}>
                    <span className="character-map-connection-label">{connection.label}</span>
                </button>;
            })}
            {editable && <button type="button" className="character-map-canvas-resize" aria-label="Drag to resize the chart's height"
                onPointerDown={handleCanvasResizeDown}
                onPointerMove={handleCanvasResizeMove}
                onPointerUp={handleCanvasResizeUp} />}
        </div>
            {editingConnection && <ConnectionPopover data={data} onChange={onChange} connection={editingConnection} episode={episode} episodes={episodes} onClose={() => setEditingConnectionId(null)} />}
            {editingCharacter && <CharacterEditPopover data={data} onChange={onChange} character={editingCharacter} authors={authors} authorsLoading={authorsLoading}
                onStartLink={() => startLinking(editingCharacter.id)} onRemove={() => removeCharacter(editingCharacter)} onClose={() => setEditingCharacterId(null)} />}
        <p className="character-map-note">{exporting ? [episode && `version ${characterMapEpisodeLabel(data, episode)}`, "viewmim.info"].filter(Boolean).join(" · ")
            : episode ? texts.footer.replaceAll('{episode}', characterMapEpisodeLabel(data, episode)) : texts.noEpisodes}</p>
        <dialog ref={dialog} className="character-map-dialog" aria-labelledby="character-map-detail-title" onClick={(event) => { if (event.target === dialog.current) dialog.current.close(); }}>
            <button type="button" className="character-map-close" aria-label="Close details" onClick={() => dialog.current.close()}>×</button>
            {active && <>
                <span className="character-map-eyebrow">{episode ? characterMapEpisodeLabel(data, episode) : texts.characterDetails}</span>
                {selected.kind === "character" && <CharacterPortrait character={active} />}
                <h3 id="character-map-detail-title">{active.name || active.label}</h3>
                {active.thai_name && <p lang="th" className="character-map-thai-name">{active.thai_name}</p>}
                <p className="character-map-detail-subtitle">{selected.kind === "character" ? active.role
                    : selected.kind === "group" ? characters.filter((character) => active.character_ids.includes(character.id)).map((character) => character.name).join(', ')
                    : `${activeDirection.from.name} ${activeDirection.arrow || "&"} ${activeDirection.to.name}`}</p>
                {active.actor && <p>{texts.playedBy} {active.actor}</p>}
                <p>{active.description}</p>
            </>}
        </dialog>
    </section>;
}
