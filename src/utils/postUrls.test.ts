import assert from "node:assert/strict";
import test from "node:test";
import { localClockToBangkokDateTime, timeAgoToBangkokDateTime, utcOnBangkokDate } from "./postUrls.ts";

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

test("a story time is only kept while it falls on the chosen Bangkok date", () => {
    const utc = "2026-10-12T10:30:00.000Z"; // 17:30 on 2026-10-12 in Bangkok
    assert.equal(utcOnBangkokDate(utc, "2026-10-12"), utc);
    assert.equal(utcOnBangkokDate(utc, "2026-10-11"), null, "date changed by hand: drop the time");
    assert.equal(utcOnBangkokDate(null, "2026-10-12"), null, "nothing entered: stays date-only as before");
    assert.equal(utcOnBangkokDate(undefined, "2026-10-12"), null);
});

// now = 2026-10-12 10:30:45Z. A viewer in New York in October (UTC-4) has getTimezoneOffset() === 240 and reads 06:30 locally.
test("a local clock time becomes the Bangkok date/time and the hours/minutes ago", () => {
    const newYork = 240;
    // 05:45 New York = 09:45Z = 16:45 Bangkok, 45 minutes ago
    assert.deepEqual(localClockToBangkokDateTime("05:45", now, newYork), { date: "2026-10-12", time: "16:45:00", hours: 0, minutes: 45 });
    // 02:15 New York = 06:15Z = 13:15 Bangkok, 4h15m ago
    assert.deepEqual(localClockToBangkokDateTime("02:15", now, newYork), { date: "2026-10-12", time: "13:15:00", hours: 4, minutes: 15 });
});

test("a local clock time that is still ahead means yesterday, which can change the Bangkok date", () => {
    const newYork = 240;
    // 23:50 New York is ahead of 06:30, so it was yesterday: 03:50Z on the 12th = 10:50 Bangkok on the 12th, 6h40m ago
    assert.deepEqual(localClockToBangkokDateTime("23:50", now, newYork), { date: "2026-10-12", time: "10:50:00", hours: 6, minutes: 40 });
    // Bangkok viewer (offset -420): 22:00 local is ahead of 17:30, so yesterday 22:00
    assert.deepEqual(localClockToBangkokDateTime("22:00", now, -420), { date: "2026-10-11", time: "22:00:00", hours: 19, minutes: 30 });
});

test("rejects bad clock input", () => {
    assert.equal(localClockToBangkokDateTime("", now, 0), null);
    assert.equal(localClockToBangkokDateTime("25:00", now, 0), null);
    assert.equal(localClockToBangkokDateTime("12:60", now, 0), null);
    assert.equal(localClockToBangkokDateTime("noon", now, 0), null);
});
