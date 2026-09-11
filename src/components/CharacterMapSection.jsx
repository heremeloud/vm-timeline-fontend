import { useState } from "react";
import CharacterMap from "./CharacterMap";
import CharacterMapEditor from "./CharacterMapEditor";
import VisibilityToggle from "./VisibilityToggle";
import { sampleCharacterMap, characterMapEpisodes, visibleCharacterMapEpisodes, setCharacterMapEpisodePublic } from "../utils/characterMap";
import { updateProject } from "../api/projectsService";
import "../styles/EventForm.css";

export default function CharacterMapSection({ project, isAdmin, onSaved }) {
    const [draft, setDraft] = useState(null);
    const [draftVisible, setDraftVisible] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const data = project.character_map || sampleCharacterMap();

    async function persist(patch) {
        setSaving(true);
        setError("");
        try {
            const response = await updateProject(project.id, patch);
            onSaved({ character_map: response.data.character_map, show_character_map: response.data.show_character_map });
            return true;
        } catch (err) {
            const detail = err.response?.data?.detail;
            setError(Array.isArray(detail) ? detail.map((item) => `${item.loc.join(" → ")}: ${item.msg}`).join("; ") : detail || "Could not save the character map. Please try again.");
            return false;
        } finally {
            setSaving(false);
        }
    }

    const isPublic = project.show_character_map !== false;
    const hasPublicEpisode = visibleCharacterMapEpisodes(data, characterMapEpisodes(data, project.episode_count)).length > 0;
    const adminControls = isAdmin && !draft
        ? <div className="character-map-header-actions">
            <VisibilityToggle checked={isPublic} disabled={saving} label={saving ? "Saving…" : "Public"}
                ariaLabel="Show character map to the public" onChange={(event) => persist({ show_character_map: event.target.checked })} />
            <button type="button" disabled={saving} onClick={() => {
                setDraft(structuredClone(data));
                setDraftVisible(isPublic);
                setError("");
            }}>Edit</button>
        </div>
        : null;
    return <div className="character-map-section">
        {isAdmin && draft ? <form className="eventform-form character-map-inline-editor" onSubmit={async (event) => {
            event.preventDefault();
            if (await persist({ character_map: draft, show_character_map: draftVisible })) setDraft(null);
        }}>
            <fieldset className="character-map-edit-fields" disabled={saving}>
                <CharacterMapEditor data={draft} onChange={setDraft} visible={draftVisible} onVisibleChange={setDraftVisible} projectTitle={project.title} episodeCount={project.episode_count} />
                <div className="character-map-editor-actions">
                    <button type="submit" className="form-primary-submit">{saving ? "Saving…" : "Save character map"}</button>
                    <button type="button" className="series-metadata-add" onClick={() => { setDraft(null); setError(""); }}>Cancel</button>
                </div>
            </fieldset>
        </form> : (isAdmin || (isPublic && hasPublicEpisode)) && <CharacterMap data={data} projectTitle={project.title} episodeCount={project.episode_count} isAdmin={isAdmin} headerControls={adminControls} busy={saving}
            onEpisodePublicChange={isAdmin && !draft && project.character_map
                ? (number, episodePublic) => persist({ character_map: setCharacterMapEpisodePublic(data, number, episodePublic) })
                : null} />}
        {/* {isAdmin && !draft && !isPublic && <p className="eventform-field-note"></p>} */}
        {error && <p role="alert">{error}</p>}
        {saving && <p role="status">Saving…</p>}
    </div>;
}
