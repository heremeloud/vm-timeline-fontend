import test from "node:test";
import assert from "node:assert/strict";
import { relationshipsAtEpisode, sampleCharacterMap, characterMapEpisodes, removeCharacterMapEpisode, characterMapDirection } from "./characterMap.js";

test("episode changes carry forward without leaking future relationships", () => {
    const data = sampleCharacterMap();
    data.relationships[0].changes[1].episode = 3;
    data.relationships[0].changes[2].episode = 5;
    assert.equal(relationshipsAtEpisode(data, 2)[0].label, "First encounter");
    assert.equal(relationshipsAtEpisode(data, 4)[0].label, "Growing closer");
    assert.equal(relationshipsAtEpisode(data, 5)[0].label, "Something more?");
    assert.equal(relationshipsAtEpisode(data, 0).length, 0);
});

test("hidden changes persist until a later visible change", () => {
    const data = sampleCharacterMap();
    data.relationships[0].changes[1].hidden = true;
    assert.equal(relationshipsAtEpisode(data, 2).some((item) => item.id === "ab"), false);
    assert.equal(relationshipsAtEpisode(data, 3).some((item) => item.id === "ab"), true);
    assert.equal(relationshipsAtEpisode(data, 2).find((item) => item.id === "ac").label, "Best friends");
});

test("explicit episode lists override project counts, including an empty list", () => {
    const data = sampleCharacterMap();
    assert.deepEqual(characterMapEpisodes({ ...data, episodes: [5, 1] }, 12), [5, 1]);
    assert.deepEqual(characterMapEpisodes({ ...data, episodes: [] }, 12), []);
});

test("removal deletes changes, preserves numbering and leaves the original draft intact", () => {
    const data = sampleCharacterMap();
    const result = removeCharacterMapEpisode(data, [1, 2, 3], 1);
    assert.deepEqual(result.episodes, [2, 3]);
    assert.equal(result.relationships.length, 1);
    assert.deepEqual(result.relationships[0].changes.map((change) => change.episode), [2, 3]);
    assert.equal(data.relationships.length, 3);
    assert.equal(data.relationships[0].changes[0].episode, 1);
});

test("relationship history follows custom story order instead of numeric IDs", () => {
    const data = { ...sampleCharacterMap(), episodes: [3, 1, 2], episode_labels: { 3: "Novel chapter 5" } };
    assert.equal(relationshipsAtEpisode(data, 3)[0].label, "Something more?");
    assert.equal(relationshipsAtEpisode(data, 1)[0].label, "First encounter");
    assert.equal(relationshipsAtEpisode(data, 2)[0].label, "Growing closer");
    assert.equal(relationshipsAtEpisode(data, 3).some((item) => item.id === "ac"), false);
});

test("a one-way relationship reads left to right whichever end the arrow is on", () => {
    const whale = { id: "w", name: '"Whale" Tarntara' }, noey = { id: "n", name: '"Noey" Naralak' };
    const backwards = characterMapDirection({ source: whale, target: noey, arrow_start: true, arrow_end: false });
    assert.deepEqual([backwards.from.name, backwards.arrow, backwards.to.name], ['"Noey" Naralak', "→", '"Whale" Tarntara']);
    const forwards = characterMapDirection({ source: whale, target: noey, arrow_start: false, arrow_end: true });
    assert.deepEqual([forwards.from.name, forwards.arrow, forwards.to.name], ['"Whale" Tarntara', "→", '"Noey" Naralak']);
    const mutual = characterMapDirection({ source: whale, target: noey, arrow_start: true, arrow_end: true });
    assert.deepEqual([mutual.from.name, mutual.arrow, mutual.to.name], ['"Whale" Tarntara', "↔", '"Noey" Naralak']);
    const plain = characterMapDirection({ source: whale, target: noey, arrow_start: false, arrow_end: false });
    assert.deepEqual([plain.from.name, plain.arrow, plain.to.name], ['"Whale" Tarntara', "", '"Noey" Naralak']);
});
