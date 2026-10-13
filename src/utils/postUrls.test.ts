import assert from "node:assert/strict";
import test from "node:test";
import { timeAgoToBangkokDateTime } from "./postUrls.ts";

const now = new Date("2026-10-12T10:30:45Z"); // 17:30:45 in Bangkok

test("subtracts whole hours and converts to Bangkok time", () => {
    assert.deepEqual(timeAgoToBangkokDateTime("3", "", now), { date: "2026-10-12", time: "14:30:00" });
});

test("subtracts minutes alone, or hours and minutes together", () => {
    assert.deepEqual(timeAgoToBangkokDateTime("", "45", now), { date: "2026-10-12", time: "16:45:00" });
    assert.deepEqual(timeAgoToBangkokDateTime("2", "15", now), { date: "2026-10-12", time: "15:15:00" });
});

test("supports decimal hours and crossing midnight", () => {
    assert.deepEqual(timeAgoToBangkokDateTime("18.5", "", now), { date: "2026-10-11", time: "23:00:00" });
    assert.deepEqual(timeAgoToBangkokDateTime("17", "40", now), { date: "2026-10-11", time: "23:50:00" });
});

test("rejects empty, negative and non-numeric input", () => {
    assert.equal(timeAgoToBangkokDateTime("", "", now), null);
    assert.equal(timeAgoToBangkokDateTime("-1", "", now), null);
    assert.equal(timeAgoToBangkokDateTime("2", "-5", now), null);
    assert.equal(timeAgoToBangkokDateTime("abc", "", now), null);
});
