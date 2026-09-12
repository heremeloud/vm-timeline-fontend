import { useState } from "react";
import RelationshipChart from "./RelationshipChart";
import RelationshipChartEditor from "./RelationshipChartEditor";
import VisibilityToggle from "./VisibilityToggle";
import { sampleRelationshipChart, relationshipChartEpisodes, visibleRelationshipChartEpisodes, setRelationshipChartEpisodePublic } from "../utils/relationshipChart";
import { updateProject } from "../api/projectsService";
import "../styles/EventForm.css";

export default function RelationshipChartSection({ project, isAdmin, onSaved }) {
    const [draft, setDraft] = useState(null);
    const [draftVisible, setDraftVisible] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const data = project.relationship_chart || sampleRelationshipChart();

    async function persist(patch) {
        setSaving(true);
        setError("");
        try {
            const response = await updateProject(project.id, patch);
            onSaved({ relationship_chart: response.data.relationship_chart, show_relationship_chart: response.data.show_relationship_chart });
            return true;
        } catch (err) {
            const detail = err.response?.data?.detail;
            setError(Array.isArray(detail) ? detail.map((item) => `${item.loc.join(" → ")}: ${item.msg}`).join("; ") : detail || "Could not save the relationship chart. Please try again.");
            return false;
        } finally {
            setSaving(false);
        }
    }

    const isPublic = project.show_relationship_chart !== false;
    // The bread-loaf portrait frame is a one-off for this bakery-themed series;
    // every other project gets the plain default frame.
    const useLoafFrame = project.slug === "bake-love-feeling";
    const hasPublicEpisode = visibleRelationshipChartEpisodes(data, relationshipChartEpisodes(data, project.episode_count)).length > 0;
    const adminControls = isAdmin && !draft
        ? <div className="relationship-chart-header-actions">
            <VisibilityToggle checked={isPublic} disabled={saving} label={saving ? "Saving…" : "Public"}
                ariaLabel="Show relationship chart to the public" onChange={(event) => persist({ show_relationship_chart: event.target.checked })} />
            <button type="button" disabled={saving} onClick={() => {
                setDraft(structuredClone(data));
                setDraftVisible(isPublic);
                setError("");
            }}>Edit</button>
        </div>
        : null;
    return <div className="relationship-chart-section">
        {isAdmin && draft ? <form className="eventform-form relationship-chart-inline-editor" onSubmit={async (event) => {
            event.preventDefault();
            if (await persist({ relationship_chart: draft, show_relationship_chart: draftVisible })) setDraft(null);
        }}>
            <fieldset className="relationship-chart-edit-fields" disabled={saving}>
                <RelationshipChartEditor data={draft} onChange={setDraft} visible={draftVisible} onVisibleChange={setDraftVisible} projectTitle={project.title} episodeCount={project.episode_count} useLoafFrame={useLoafFrame} />
                <div className="relationship-chart-editor-actions">
                    <button type="submit" className="form-primary-submit">{saving ? "Saving…" : "Save relationship chart"}</button>
                    <button type="button" className="series-metadata-add" onClick={() => { setDraft(null); setError(""); }}>Cancel</button>
                </div>
            </fieldset>
        </form> : (isAdmin || (isPublic && hasPublicEpisode)) && <RelationshipChart data={data} projectTitle={project.title} episodeCount={project.episode_count} isAdmin={isAdmin} headerControls={adminControls} busy={saving} useLoafFrame={useLoafFrame}
            onEpisodePublicChange={isAdmin && !draft && project.relationship_chart
                ? (number, episodePublic) => persist({ relationship_chart: setRelationshipChartEpisodePublic(data, number, episodePublic) })
                : null} />}
        {/* {isAdmin && !draft && !isPublic && <p className="eventform-field-note"></p>} */}
        {error && <p role="alert">{error}</p>}
        {saving && <p role="status">Saving…</p>}
    </div>;
}
