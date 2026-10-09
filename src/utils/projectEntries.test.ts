import test from "node:test";
import assert from "node:assert/strict";
import { addEntryLinks, adjacentProjectEntries, entriesOnDate, listProjectEntries, parseEntryLinks, projectEntryDayLabel, projectEntryLabel, projectEntryShortLabel, toggleEntryLink } from "./projectEntries.ts";

const project = {
    fitting_workshops: [
        { kind: "fitting" as const, number: 1, date: "2025-08-02" },
        { kind: "workshop" as const, number: 1, date: "2025-08-02", hashtag: "#GirlRulesW1" },
        { kind: "prep" as const, number: 1, date: "2025-08-05" },
    ],
    filming_days: [{ q_number: 5, filming_date: "2025-10-25", hashtag: "GirlRulesQ5" }],
    episode_metadata: [{ episode_number: 0, air_date: "2026-03-02" }],
};

test("a project's rows are listed in page order with labels", () => {
    const options = listProjectEntries(project);
    assert.deepEqual(options.map((o) => [o.label, o.group]), [
        ["Fitting Day 1", "Fitting & Workshop"],
        ["Workshop Day 1", "Fitting & Workshop"],
        ["Prep Day 1", "Fitting & Workshop"],
        ["Q5", "Filming Q Days"],
        ["EP0", "Episodes"],
    ]);
    assert.equal(options[1].hashtag, "GirlRulesW1");
    assert.equal(options[0].hashtag, "");
});

test("adjacent project rows stay inside their project-detail section", () => {
    assert.deepEqual(adjacentProjectEntries(project, "workshop", 1), {
        previous: listProjectEntries(project)[0],
        next: listProjectEntries(project)[2],
    });
    assert.deepEqual(adjacentProjectEntries(project, "filming", 5), { previous: null, next: null });
    assert.deepEqual(adjacentProjectEntries(project, "episodes", 0), { previous: null, next: null });
});

test("adjacent project rows use their displayed order instead of sorting their numbers", () => {
    const outOfOrder = {
        episode_metadata: [
            { episode_number: 3, air_date: "2026-03-16" },
            { episode_number: 1, air_date: "2026-03-02" },
            { episode_number: 2, air_date: "2026-03-09" },
        ],
    };
    const adjacent = adjacentProjectEntries(outOfOrder, "episodes", 1);
    assert.equal(adjacent.previous?.number, 3);
    assert.equal(adjacent.next?.number, 2);
});

test("adjacent project rows skip entries that cannot be opened", () => {
    const entries = {
        filming_days: [
            { q_number: 1, filming_date: "2025-10-21" },
            { q_number: 2, filming_date: "2025-10-22" },
            { q_number: 3, filming_date: "2025-10-23" },
            { q_number: 4, filming_date: "2025-10-24" },
        ],
    };
    const adjacent = adjacentProjectEntries(entries, "filming", 2, (entry) => entry.number !== 1 && entry.number !== 3);
    assert.equal(adjacent.previous, null);
    assert.equal(adjacent.next?.number, 4);
});

test("a fitting and a workshop on the same day are both suggested for a post of that day", () => {
    const options = listProjectEntries(project);
    assert.deepEqual(entriesOnDate(options, "2025-08-02").map((o) => o.label), ["Fitting Day 1", "Workshop Day 1"]);
    assert.deepEqual(entriesOnDate(options, "2025-08-03"), []);
    assert.deepEqual(entriesOnDate(options, ""), []);
});

test("links toggle on and off, and adding several keeps existing ones without duplicates", () => {
    const f1 = { project_id: 6, entry_type: "fitting" as const, entry_number: 1 };
    const on = toggleEntryLink([], f1);
    assert.deepEqual(on, [f1]);
    assert.deepEqual(toggleEntryLink(on, f1), []);

    const options = listProjectEntries(project);
    const both = addEntryLinks(on, 6, entriesOnDate(options, "2025-08-02"));
    assert.deepEqual(both.map((l) => `${l.entry_type}${l.entry_number}`), ["fitting1", "workshop1"]);
});

test("stored links parse leniently", () => {
    assert.deepEqual(parseEntryLinks("not json"), []);
    assert.deepEqual(parseEntryLinks('{"a":1}'), []);
    assert.deepEqual(parseEntryLinks('[{"project_id":6,"entry_type":"fitting","entry_number":1},{"entry_type":"x"}]'), [
        { project_id: 6, entry_type: "fitting", entry_number: 1 },
    ]);
});

test("fitting, workshop and prep rows are spelled out as days; Q days and episodes keep their short labels", () => {
    assert.equal(projectEntryLabel("fitting", 1), "Fitting Day 1");
    assert.equal(projectEntryLabel("workshop", 12), "Workshop Day 12");
    assert.equal(projectEntryLabel("prep", 2), "Prep Day 2");
    assert.equal(projectEntryLabel("filming", 5), "Q5");
    assert.equal(projectEntryLabel("episodes", 0), "EP0");
});

test("forms use the compact F / W / P labels while visitors see the full names", () => {
    assert.deepEqual(
        (["fitting", "workshop", "prep", "filming", "episodes"] as const).map((type) => projectEntryShortLabel(type, 1)),
        ["F1", "W1", "P1", "Q1", "EP1"],
    );
    const options = listProjectEntries({ fitting_workshops: [{ kind: "prep", number: 3, date: "2025-08-05" }] });
    assert.deepEqual([options[0].shortLabel, options[0].label], ["P3", "Prep Day 3"]);
});

test("the project page shows a day as D1, with a type letter only when the project has several types of day", () => {
    assert.equal(projectEntryDayLabel("prep", 1, false), "D1");
    assert.equal(projectEntryDayLabel("fitting", 12, true), "F D12");
    assert.equal(projectEntryDayLabel("workshop", 2, true), "W D2");
    assert.equal(projectEntryDayLabel("prep", 3, true), "P D3");
});
