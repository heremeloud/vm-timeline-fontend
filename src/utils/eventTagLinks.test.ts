import test from "node:test";
import assert from "node:assert/strict";
import { buildEventTagIndex, findEventForHashtag, getEventTagLinks } from "./eventTagLinks.ts";

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
