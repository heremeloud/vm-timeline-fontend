import assert from "node:assert/strict";
import test from "node:test";
import { formatEventDateRange, getEventDates } from "./eventDateRange.ts";

test("deduplicates and sorts explicit event dates", () => {
    assert.deepEqual(
        getEventDates({ dates: ["2026-05-08", "2026-05-04", "2026-05-08"] }),
        ["2026-05-04", "2026-05-08"],
    );
});

test("summarizes a multi-date event using its span and date count", () => {
    assert.equal(
        formatEventDateRange({
            dates: ["2026-05-04", "2026-05-05", "2026-05-08", "2026-05-12", "2026-05-13", "2026-06-04"],
        }),
        "2026-05-04 – 2026-06-04 · 6 dates",
    );
});

test("includes both years when a multi-date event crosses a year boundary", () => {
    assert.equal(
        formatEventDateRange({ dates: ["2026-12-30", "2027-01-04"] }),
        "2026-12-30 – 2027-01-04 · 2 dates",
    );
});
