import test from "node:test";
import assert from "node:assert/strict";
import { buildEventTagIndex, getEventTagLinks } from "./eventTagLinks.js";

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
    assert.deepEqual(index.get("secondday")[0].dates, ["2026-10-10", "2026-10-11"]);
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
