import assert from "node:assert/strict";
import test from "node:test";
import { hoursAgoToBangkokDateTime } from "./postUrls.ts";

const now = new Date("2026-10-12T10:30:45Z"); // 17:30:45 in Bangkok

test("subtracts whole hours and converts to Bangkok time", () => {
    assert.deepEqual(hoursAgoToBangkokDateTime("3", now), { date: "2026-10-12", time: "14:30:00" });
});

test("supports decimal hours and crossing midnight", () => {
    assert.deepEqual(hoursAgoToBangkokDateTime("18.5", now), { date: "2026-10-11", time: "23:00:00" });
});

test("rejects empty, negative and non-numeric input", () => {
    assert.equal(hoursAgoToBangkokDateTime("", now), null);
    assert.equal(hoursAgoToBangkokDateTime("-1", now), null);
    assert.equal(hoursAgoToBangkokDateTime("abc", now), null);
});
