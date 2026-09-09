import { useState } from "react";
import { characterMapEpisodes, removeCharacterMapEpisode, characterMapEpisodeLabel, characterMapTexts, isCharacterMapEpisodePublic, setCharacterMapEpisodePublic, GROUP_PADDING_MIN, GROUP_PADDING_MAX } from "../utils/characterMap";
import CharacterMap from "./CharacterMap";
import VisibilityToggle from "./VisibilityToggle";

export default function CharacterMapEditor({ data, onChange, visible, onVisibleChange, projectTitle, episodeCount }) {
    const defaultTexts = characterMapTexts(projectTitle);
    const episodes = characterMapEpisodes(data, episodeCount);
    const [episodeInput, setEpisodeInput] = useState("");
    const nextEpisode = Array.from({ length: 1000 }, (_, index) => index + 1).find((number) => !episodes.includes(number));
    const canAddEpisode = Number.isInteger(nextEpisode) && nextEpisode >= 1 && nextEpisode <= 1000 && !episodes.includes(nextEpisode);
    return <section className="eventform-section character-map-editor" id="character-map-editor">
        <h3>Character map</h3>
        <label className="character-map-visibility"><input type="checkbox" checked={visible} onChange={(event) => onVisibleChange(event.target.checked)} /> Show character map on the project page</label>
        <p className="eventform-field-note">Hiding keeps all characters and relationships saved. Choose Save character map below to apply your edits, or Cancel to discard them.</p>
        <details><summary>Chart text</summary>
            <p className="eventform-field-note">Edit the title, introduction, labels, and notes. Leave a field empty to hide its text. In the footer, {"{episode}"} inserts the selected episode or chapter label.</p>
            <div className="character-map-fields">{Object.entries(defaultTexts).map(([key, fallback]) => <label key={key}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())}<textarea maxLength={1000} value={data.texts?.[key] ?? fallback} onChange={(event) => onChange({ ...data, texts: { ...data.texts, [key]: event.target.value } })} /></label>)}</div>
            <button type="button" onClick={() => onChange({ ...data, texts: {} })}>Reset chart text to defaults</button>
        </details>
        <details><summary>Character groups ({(data.groups || []).length})</summary>
            <p className="eventform-field-note">Select characters to enclose together. The outline follows their positions; drag characters or the group's corner handle on the map below to arrange it. Click the group's title on the map to preview its detail card.</p>
            {(data.groups || []).map((group) => {
                const updateGroup = (patch) => onChange({ ...data, groups: data.groups.map((item) => item.id === group.id ? { ...item, ...patch } : item) });
                return <fieldset key={group.id}><legend>{group.label || 'Unnamed group'}</legend>
                    <div className="character-map-fields">
                        <label>Group name<input maxLength={120} value={group.label} onChange={(event) => updateGroup({ label: event.target.value })} /></label>
                        <label>Thai name<input lang="th" maxLength={120} value={group.thai_name || ""} onChange={(event) => updateGroup({ thai_name: event.target.value })} /></label>
                        <label>Outline shape<select value={group.shape} onChange={(event) => updateGroup({ shape: event.target.value })}><option value="rectangle">Rectangle</option><option value="circle">Circle / oval</option></select></label>
                        <label>Outline color<input type="color" value={group.color} onChange={(event) => updateGroup({ color: event.target.value })} /></label>
                        <label>Title position<select value={group.label_position || "top"} onChange={(event) => updateGroup({ label_position: event.target.value })}><option value="top">Top edge</option><option value="bottom">Bottom edge</option></select></label>
                    </div>
                    <label>Description<textarea maxLength={5000} value={group.description || ""} onChange={(event) => updateGroup({ description: event.target.value })} /></label>
                    <div className="character-map-fields">
                        <label>Horizontal margin · {Math.round((group.padding_x ?? 15) * 10) / 10}%
                            <input type="range" min={GROUP_PADDING_MIN} max={GROUP_PADDING_MAX} step="0.5" value={group.padding_x ?? 15} onChange={(event) => updateGroup({ padding_x: Number(event.target.value), padding_left: null, padding_right: null })} />
                        </label>
                        <label>Vertical margin · {Math.round((group.padding_y ?? 22) * 10) / 10}%
                            <input type="range" min={GROUP_PADDING_MIN} max={GROUP_PADDING_MAX} step="0.5" value={group.padding_y ?? 22} onChange={(event) => updateGroup({ padding_y: Number(event.target.value), padding_top: null, padding_bottom: null })} />
                        </label>
                    </div>
                    <p className="eventform-field-note">Adjust the space between the characters and the group outline. Drag the top, bottom, left, or right edge handle on the graph to adjust each side independently. These sliders reset both sides on their axis.</p>
                    <button type="button" onClick={() => updateGroup({ padding_x: 15, padding_y: 22, padding_top: null, padding_bottom: null, padding_left: null, padding_right: null })}>Reset group margins</button>
                    <div className="character-map-fields">{data.characters.map((character) => <label key={character.id} className="character-map-visibility"><input type="checkbox" checked={group.character_ids.includes(character.id)} onChange={(event) => updateGroup({ character_ids: event.target.checked ? [...group.character_ids, character.id] : group.character_ids.filter((id) => id !== character.id) })} />{character.name}</label>)}</div>
                    {!group.character_ids.length && <p className="eventform-field-note">Select at least one character to show this group.</p>}
                    <button type="button" onClick={() => onChange({ ...data, groups: data.groups.filter((item) => item.id !== group.id) })}>Remove group</button>
                </fieldset>;
            })}
            <button type="button" disabled={(data.groups || []).length >= 20} onClick={() => onChange({ ...data, groups: [...(data.groups || []), { id: crypto.randomUUID(), label: 'New group', thai_name: '', description: '', shape: 'rectangle', color: '#a67c52', label_position: 'top', character_ids: [] }] })}>+ Add group</button>
        </details>
        <details open><summary>Episodes ({episodes.length})</summary>
            <p className="eventform-field-note">Use numbers or custom labels such as “Novel chapter 5”. Move entries up or down to set story order; relationship changes carry forward in this order. Removing an entry deletes its relationship changes. Clear an entry's Public box to keep it in the chart for admins only — the public then cannot select it.</p>
            <div className="character-map-episode-list">
                {episodes.map((number, index) => <div className="character-map-episode-row" key={number}>
                    <label>Entry {index + 1}<input maxLength={120} value={data.episode_labels?.[number] ?? `Episode ${number}`} onChange={(event) => onChange({ ...data, episodes, episode_labels: { ...data.episode_labels, [number]: event.target.value } })} /></label>
                    <VisibilityToggle checked={isCharacterMapEpisodePublic(data, number)}
                        ariaLabel={`Show ${characterMapEpisodeLabel(data, number)} to the public`}
                        title={isCharacterMapEpisodePublic(data, number) ? "Visible to the public" : "Hidden from the public — admins still see it"}
                        onChange={(event) => onChange(setCharacterMapEpisodePublic({ ...data, episodes }, number, event.target.checked))} />
                    <button type="button" aria-label={`Move ${characterMapEpisodeLabel(data, number)} up`} disabled={index === 0} onClick={() => { const order = [...episodes]; [order[index - 1], order[index]] = [order[index], order[index - 1]]; onChange({ ...data, episodes: order }); }}>↑</button>
                    <button type="button" aria-label={`Move ${characterMapEpisodeLabel(data, number)} down`} disabled={index === episodes.length - 1} onClick={() => { const order = [...episodes]; [order[index + 1], order[index]] = [order[index], order[index + 1]]; onChange({ ...data, episodes: order }); }}>↓</button>
                    <button type="button" aria-label={`Remove ${characterMapEpisodeLabel(data, number)}`} onClick={() => {
                        if (confirm(`Remove ${characterMapEpisodeLabel(data, number)} and its relationship changes? Connections with no remaining changes will also be removed. Save to apply, or Cancel to undo.`)) {
                            const updated = removeCharacterMapEpisode(data, episodes, number);
                            updated.episode_labels = { ...data.episode_labels };
                            delete updated.episode_labels[number];
                            onChange(updated);
                        }
                    }}>×</button>
                </div>)}
            </div>
            <div className="character-map-fields"><label>New episode or chapter label<input maxLength={120} value={episodeInput} placeholder="Episode 4, Novel chapter 5…" onChange={(event) => setEpisodeInput(event.target.value)} /></label>
                <button type="button" disabled={!canAddEpisode} onClick={() => { onChange({ ...data, episodes: [...episodes, nextEpisode], episode_labels: { ...data.episode_labels, [nextEpisode]: episodeInput.trim() || `Episode ${nextEpisode}` } }); setEpisodeInput(""); }}>+ Add episode / chapter</button>
            </div>
        </details>
        <h4>Character map ({data.characters.length} character{data.characters.length === 1 ? "" : "s"}, {data.relationships.length} relationship{data.relationships.length === 1 ? "" : "s"})</h4>
        <p className="eventform-field-note">Use "+ Add character" on the map below, then drag to position and tap to edit. Tap two characters to connect them, then set the line's text, color, style, and arrows. Tap an existing connection to edit or remove it.</p>
        <CharacterMap data={data} onChange={onChange} editable projectTitle={projectTitle} episodeCount={episodeCount}
            onEpisodePublicChange={(number, episodePublic) => onChange(setCharacterMapEpisodePublic({ ...data, episodes }, number, episodePublic))} />
    </section>;
}
