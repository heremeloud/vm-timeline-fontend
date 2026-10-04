import test from "node:test";
import assert from "node:assert/strict";
import { buildEventTagIndex, findEventForHashtag, getEventTagLinks, linkOpensEvent } from "./eventTagLinks.ts";

test("date-specific hashtags are indexed only for their occurrence date", () => {
    const events = [
        {
            id: 1,
            name: "First event",
            dates: ["2026-09-01", "2026-10-10"],
            tags: [],
            date_items: [
                { date: "2026-09-01", hashtag: "SharedEvent" },
                { date: "2026-10-10", hashtag: "SecondDay" },
                { date: "2026-10-11", hashtag: "SecondDay" },
            ],
        },
        {
            id: 2,
            name: "Nearby event",
            dates: ["2026-09-03"],
            tags: ["SharedEvent"],
            date_items: [],
        },
    ];

    const index = buildEventTagIndex(events);
    assert.deepEqual(index.get("secondday")?.[0].dates, ["2026-10-10", "2026-10-11"]);
    const links = getEventTagLinks(
        { caption: "#SharedEvent", posted_at: "2026-09-03" },
        index,
    );
    assert.equal(links[0].event.id, 2);
});

test("date items without a hashtag do not crash tag indexing", () => {
    const index = buildEventTagIndex([{
        id: 3,
        tags: [],
        dates: ["2026-09-04"],
        date_items: [{ date: "2026-09-04", keyword: "Keyword only", hashtag: null }],
    }]);
    assert.equal(index.size, 0);
});

test("project episode and filming-day hashtags point to their related-post pages", () => {
    const index = buildEventTagIndex([
        {
            id: 12,
            project_id: 1,
            is_project: true,
            is_episode: true,
            episode_number: 2,
            tags: ["GirlRulesEP2"],
        },
        {
            id: 13,
            project_id: 1,
            is_project: true,
            is_filming_day: true,
            q_number: 3,
            tags: ["GirlRulesQ3"],
        },
    ]);

    const links = getEventTagLinks({ caption: "#GirlRulesEP2 #GirlRulesQ3" }, index);

    assert.deepEqual(
        links.map((link) => [link.projectEntryType, link.projectEntryNumber]),
        [["episodes", 2], ["filming", 3]],
    );
});

test("a project entry hashtag resolves to the event that owns it, not to project or episode entries", () => {
    const index = buildEventTagIndex([
        { id: 5, is_project: true, tags: ["GirlRulesEP1"], start_date: "2026-01-01" },
        { id: 7, is_episode: true, tags: ["GirlRulesEP1"], start_date: "2026-01-01" },
        { id: 21, name: "Far screening", tags: ["GirlRulesEP1"], dates: ["2026-06-01"] },
        { id: 20, name: "EP1 screening", tags: ["#GirlRulesEP1"], dates: ["2026-01-03"] },
    ]);
    assert.equal(findEventForHashtag(index, "#girlrulesep1", "2026-01-02")?.id, 20);
    assert.equal(findEventForHashtag(index, "GirlRulesEP1", null)?.id, 20);
    assert.equal(findEventForHashtag(index, "NoSuchTag", "2026-01-02"), null);
});

test("an event keyword in the Related Event / Project text links the post to that event", () => {
    const index = buildEventTagIndex([
        { id: 16, name: "Fanival", keyword: "VIEWMIM BEGINS MINPRAEW ERA", tags: ["GirlRulesSeries"], dates: ["2026-01-10"] },
        { id: 17, name: "Other", keyword: "US PRESS TOUR", tags: [], dates: ["2026-02-01"] },
    ]);
    const base = { posted_at: "2026-01-10", show_timeline_context: true };

    const links = getEventTagLinks({ ...base, timeline_context: "From  viewmim begins minpraew era, see more" }, index);
    assert.equal(links.length, 1);
    assert.equal(links[0].kind, "keyword");
    assert.equal(links[0].event.id, 16);

    // not inside a longer word, not from the caption, not when the context is hidden
    assert.equal(getEventTagLinks({ ...base, timeline_context: "RUS PRESS TOURING" }, index).length, 0);
    assert.equal(getEventTagLinks({ ...base, caption: "US PRESS TOUR", timeline_context: null }, index).length, 0);
    assert.equal(getEventTagLinks({ ...base, show_timeline_context: false, timeline_context: "US PRESS TOUR" }, index).length, 0);
    assert.equal(getEventTagLinks({ ...base, show_timeline_context: false, timeline_context: "US PRESS TOUR" }, index, { includeHiddenTimelineContext: true })[0].event.id, 17);
});

test("a hashtag or keyword in Related Event / Project replaces the caption's own hashtags", () => {
    const index = buildEventTagIndex([
        { id: 1, name: "Default event", tags: ["DefaultTag"], dates: ["2026-03-01"] },
        { id: 2, name: "Chosen event", tags: ["ChosenTag"], keyword: "CHOSEN KEYWORD", dates: ["2026-03-01"] },
    ]);
    const base = { posted_at: "2026-03-01", caption: "hello #DefaultTag", show_timeline_context: true };

    // no related text: the caption hashtag links as before
    assert.deepEqual(getEventTagLinks({ ...base, timeline_context: null }, index).map((l) => l.event.id), [1]);
    // related hashtag or keyword wins, caption hashtag is ignored
    assert.deepEqual(getEventTagLinks({ ...base, timeline_context: "see #ChosenTag" }, index).map((l) => l.event.id), [2]);
    assert.deepEqual(getEventTagLinks({ ...base, timeline_context: "chosen keyword" }, index).map((l) => l.event.id), [2]);
    // related text that links to nothing does not suppress the caption
    assert.deepEqual(getEventTagLinks({ ...base, timeline_context: "just a note #Unknown" }, index).map((l) => l.event.id), [1]);
    // hidden related text is not an override
    assert.deepEqual(getEventTagLinks({ ...base, show_timeline_context: false, timeline_context: "#ChosenTag" }, index).map((l) => l.event.id), [1]);
    // ...unless the caller (event page) counts hidden text
    assert.deepEqual(getEventTagLinks({ ...base, show_timeline_context: false, timeline_context: "#ChosenTag" }, index, { includeHiddenTimelineContext: true }).map((l) => l.event.id), [2]);
});

test("a project's base hashtag far from any event goes to the project, and the post stays off that far event's page", () => {
    const index = buildEventTagIndex([
        { id: 5, is_project: true, project_id: 6, tags: ["GirlRulesSeries"], start_date: "2026-03-09" },
        { id: 16, name: "Fanival launch", project_id: 6, tags: ["GirlRulesSeries"], start_date: "2025-10-13", dates: [] },
    ]);
    const [link] = getEventTagLinks({ posted_at: "2024-11-26", caption: "#GirlRulesSeries" }, index);
    assert.equal(link.projectId, 6);
    assert.equal(linkOpensEvent(link), false);

    // an event within two weeks of the post still owns the hashtag
    const [near] = getEventTagLinks({ posted_at: "2025-10-12", caption: "#GirlRulesSeries" }, index);
    assert.equal(near.event.id, 16);
    assert.equal(linkOpensEvent(near), true);
});

test("a fitting or workshop hashtag links to that project entry's related posts", () => {
    const index = buildEventTagIndex([
        { id: 100, is_project: true, project_id: 6, tags: ["GirlRulesSeries"], start_date: "2026-03-09" },
        { id: 101, is_project: true, is_fitting_workshop: true, fitting_workshop_kind: "fitting", fitting_workshop_number: 1, project_id: 6, name: "Girl Rules F1", tags: ["GirlRulesSeriesF1"], start_date: "2025-08-02" },
        { id: 102, is_project: true, is_fitting_workshop: true, fitting_workshop_kind: "workshop", fitting_workshop_number: 12, project_id: 6, name: "Girl Rules W12", tags: ["GirlRulesSeriesW12"], start_date: "2025-09-01" },
    ]);
    const links = getEventTagLinks({ posted_at: "2025-08-03", caption: "#GirlRulesSeriesF1 and #GirlRulesSeriesW12" }, index);

    assert.deepEqual(
        links.map((l) => [l.projectId, l.projectEntryType, l.projectEntryNumber]),
        [[6, "fitting", 1], [6, "workshop", 12]],
    );
    // they are project entries, never an event of their own
    assert.equal(findEventForHashtag(index, "GirlRulesSeriesF1", "2025-08-02"), null);
    assert.equal(links.some(linkOpensEvent), false);
});

test("a post linked to project rows in the form links to them, with or without a hashtag", () => {
    const index = buildEventTagIndex([
        // fitting 1 and workshop 1 happen on the same day and have no hashtag or keyword
        { id: 201, is_project: true, is_fitting_workshop: true, fitting_workshop_kind: "fitting", fitting_workshop_number: 1, project_id: 6, name: "Girl Rules F1", tags: [], start_date: "2025-08-02" },
        { id: 202, is_project: true, is_fitting_workshop: true, fitting_workshop_kind: "workshop", fitting_workshop_number: 1, project_id: 6, name: "Girl Rules W1", tags: [], start_date: "2025-08-02" },
        { id: 203, is_project: true, is_filming_day: true, q_number: 5, project_id: 6, name: "Girl Rules Q5", tags: ["GirlRulesQ5"], start_date: "2025-10-25" },
        { id: 7, name: "Default event", tags: ["DefaultTag"], dates: ["2025-08-02"] },
    ]);
    const links = JSON.stringify([
        { project_id: 6, entry_type: "workshop", entry_number: 1 },
        { project_id: 6, entry_type: "fitting", entry_number: 1 },
        { project_id: 6, entry_type: "fitting", entry_number: 9 },   // deleted row: ignored
    ]);
    const post = { posted_at: "2025-08-02", caption: "#DefaultTag", show_timeline_context: true, project_entry_links_json: links };

    const found = getEventTagLinks(post, index);
    assert.deepEqual(found.map((l) => [l.kind, l.hashtag, l.projectEntryType, l.projectEntryNumber]), [
        ["entry", "Girl Rules W1", "workshop", 1],
        ["entry", "Girl Rules F1", "fitting", 1],
    ]);
    assert.equal(found.some(linkOpensEvent), false);
    // the picked rows replace the caption's own hashtag link, like related text does
    assert.equal(found.some((l) => l.event.id === 7), false);

    // like related text, they only apply when the box is shown, or when the caller counts hidden text
    assert.deepEqual(getEventTagLinks({ ...post, show_timeline_context: false }, index).map((l) => l.event.id), [7]);
    assert.equal(getEventTagLinks({ ...post, show_timeline_context: false }, index, { includeHiddenTimelineContext: true }).length, 2);
    // bad JSON is ignored
    assert.deepEqual(getEventTagLinks({ ...post, project_entry_links_json: "{oops" }, index).map((l) => l.event.id), [7]);
});
