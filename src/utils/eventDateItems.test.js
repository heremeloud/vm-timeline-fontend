import test from "node:test";
import assert from "node:assert/strict";
import { getEventDateItemForPhoto } from "./eventDateItems.js";

const items = [
    { date: "2026-09-01", keyword: "First day", hashtag: "FirstDay" },
    { date: "2026-09-02", keyword: "Second day", hashtag: "SecondDay" },
];

test("dated slides select only their matching event metadata", () => {
    assert.equal(getEventDateItemForPhoto(items, { date: "2026-09-02" }).keyword, "Second day");
});

test("an unassigned slide falls back to the first populated event date", () => {
    assert.equal(getEventDateItemForPhoto(items, {}).keyword, "First day");
});

test("a dated slide never shows metadata belonging to another date", () => {
    assert.equal(getEventDateItemForPhoto(items, { date: "2026-09-03" }), null);
});
