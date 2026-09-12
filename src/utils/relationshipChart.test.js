import test from "node:test";
import assert from "node:assert/strict";
import { addRelationshipChartEpisode, relationshipsAtEpisode, sampleRelationshipChart, relationshipChartEpisodes, removeRelationshipChartEpisode, relationshipChartDirection, charactersAtEpisode, characterDebutEpisode, setCharacterDebut, relationshipChartImageName, relationshipChartTexts } from "./relationshipChart.js";

test("relationship chart terminology is used in headings and downloads", () => {
    assert.equal(relationshipChartTexts("Series").eyebrow, "RELATIONSHIP CHART");
    assert.equal(relationshipChartImageName("Series", "Episode 1"), "Series - relationship chart - Episode 1");
});

test("episode changes carry forward without leaking future relationships", () => {
    const data = sampleRelationshipChart();
    data.relationships[0].changes[1].episode = 3;
    data.relationships[0].changes[2].episode = 5;
    assert.equal(relationshipsAtEpisode(data, 2)[0].label, "First encounter");
    assert.equal(relationshipsAtEpisode(data, 4)[0].label, "Growing closer");
    assert.equal(relationshipsAtEpisode(data, 5)[0].label, "Something more?");
    assert.equal(relationshipsAtEpisode(data, 0).length, 0);
});

test("hidden changes persist until a later visible change", () => {
    const data = sampleRelationshipChart();
    data.relationships[0].changes[1].hidden = true;
    assert.equal(relationshipsAtEpisode(data, 2).some((item) => item.id === "ab"), false);
    assert.equal(relationshipsAtEpisode(data, 3).some((item) => item.id === "ab"), true);
    assert.equal(relationshipsAtEpisode(data, 2).find((item) => item.id === "ac").label, "Best friends");
});

test("explicit episode lists override project counts, including an empty list", () => {
    const data = sampleRelationshipChart();
    assert.deepEqual(relationshipChartEpisodes({ ...data, episodes: [5, 1] }, 12), [5, 1]);
    assert.deepEqual(relationshipChartEpisodes({ ...data, episodes: [] }, 12), []);
});

test("removal deletes changes, preserves numbering and leaves the original draft intact", () => {
    const data = sampleRelationshipChart();
    const result = removeRelationshipChartEpisode(data, [1, 2, 3], 1);
    assert.deepEqual(result.episodes, [2, 3]);
    assert.equal(result.relationships.length, 1);
    assert.deepEqual(result.relationships[0].changes.map((change) => change.episode), [2, 3]);
    assert.equal(data.relationships.length, 3);
    assert.equal(data.relationships[0].changes[0].episode, 1);
});

test("relationship history follows custom story order instead of numeric IDs", () => {
    const data = { ...sampleRelationshipChart(), episodes: [3, 1, 2], episode_labels: { 3: "Novel chapter 5" } };
    assert.equal(relationshipsAtEpisode(data, 3)[0].label, "Something more?");
    assert.equal(relationshipsAtEpisode(data, 1)[0].label, "First encounter");
    assert.equal(relationshipsAtEpisode(data, 2)[0].label, "Growing closer");
    assert.equal(relationshipsAtEpisode(data, 3).some((item) => item.id === "ac"), false);
});

test("a one-way relationship reads left to right whichever end the arrow is on", () => {
    const whale = { id: "w", name: '"Whale" Tarntara' }, noey = { id: "n", name: '"Noey" Naralak' };
    const backwards = relationshipChartDirection({ source: whale, target: noey, arrow_start: true, arrow_end: false });
    assert.deepEqual([backwards.from.name, backwards.arrow, backwards.to.name], ['"Noey" Naralak', "→", '"Whale" Tarntara']);
    const forwards = relationshipChartDirection({ source: whale, target: noey, arrow_start: false, arrow_end: true });
    assert.deepEqual([forwards.from.name, forwards.arrow, forwards.to.name], ['"Whale" Tarntara', "→", '"Noey" Naralak']);
    const mutual = relationshipChartDirection({ source: whale, target: noey, arrow_start: true, arrow_end: true });
    assert.deepEqual([mutual.from.name, mutual.arrow, mutual.to.name], ['"Whale" Tarntara', "↔", '"Noey" Naralak']);
    const plain = relationshipChartDirection({ source: whale, target: noey, arrow_start: false, arrow_end: false });
    assert.deepEqual([plain.from.name, plain.arrow, plain.to.name], ['"Whale" Tarntara', "", '"Noey" Naralak']);
});

test("new episodes snapshot the chosen version and exclude later connections", () => {
    const data = sampleRelationshipChart();
    data.relationships[1].changes[0].episode = 2;
    const result = addRelationshipChartEpisode(data, [1, 2, 3], 4, "New chapter", 1);
    assert.deepEqual(relationshipsAtEpisode(result, 4).map(r => r.label), relationshipsAtEpisode(data, 1).map(r => r.label));
    result.relationships[0].changes.at(-1).label = "Changed";
    assert.equal(data.relationships[0].changes[0].label, "First encounter");
    assert.deepEqual(result.episodes, [1, 2, 3, 4]);
});

test("a character joins the story at their first entry and can be written out later", () => {
    const data = {
        episodes: [3, 1, 2],
        episode_labels: { 3: "Novel" },
        characters: [
            { id: "always", name: "Always here", x: 20, y: 20 },
            { id: "late", name: "Joins later", x: 40, y: 20, changes: [{ episode: 1, hidden: false }] },
            { id: "gone", name: "Written out", x: 60, y: 20, changes: [{ episode: 3, hidden: false }, { episode: 2, hidden: true }] },
        ],
        relationships: [{ id: "r", source: "always", target: "late", changes: [{ episode: 3, label: "Pair", hidden: false }] }],
    };
    const names = (episode) => charactersAtEpisode(data, episode).map((character) => character.id);
    assert.deepEqual(names(3), ["always", "gone"]);
    // Written out from the second entry, so still present in the first.
    const leaves = { ...data, characters: data.characters.map((character) =>
        character.id === "always" ? { ...character, changes: [{ episode: 2, hidden: true }] } : character) };
    assert.deepEqual(charactersAtEpisode(leaves, 3).map((character) => character.id), ["always", "gone"]);
    assert.deepEqual(charactersAtEpisode(leaves, 1).map((character) => character.id), ["always", "late", "gone"]);
    assert.deepEqual(charactersAtEpisode(leaves, 2).map((character) => character.id), ["late"]);
    assert.equal(characterDebutEpisode(leaves, leaves.characters[0]), null);
    assert.deepEqual(names(1), ["always", "late", "gone"]);
    assert.deepEqual(names(2), ["always", "late"]);
    // A relationship needs both ends present in the entry.
    assert.equal(relationshipsAtEpisode(data, 3).length, 0);
    assert.equal(relationshipsAtEpisode(data, 1).length, 1);
    assert.equal(characterDebutEpisode(data, data.characters[2]), 3);
    assert.equal(characterDebutEpisode(data, data.characters[0]), null);
    const written = setCharacterDebut(data, "late", 2);
    assert.deepEqual(charactersAtEpisode(written, 1).map((character) => character.id), ["always", "gone"]);
});
