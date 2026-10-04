import assert from "node:assert/strict";
import test from "node:test";
import { defaultShownAuthorGroups, hiddenAuthorCategories, readShownAuthorGroups, writeShownAuthorGroups } from "./authorGroups.ts";

test("by default artist and crew are shown and official accounts are hidden", () => {
    assert.deepEqual(defaultShownAuthorGroups(), { main: true, artist: true, crew: true, official: false, family_friend: true, fan: true, temp: true });
    assert.deepEqual(hiddenAuthorCategories(defaultShownAuthorGroups()), ["official"]);
});

test("the defaults add nothing to the URL, other choices round-trip", () => {
    const params = new URLSearchParams("page=2");
    writeShownAuthorGroups(params, defaultShownAuthorGroups());
    assert.equal(params.toString(), "page=2");

    const shown = { ...defaultShownAuthorGroups(), artist: false, official: true };
    writeShownAuthorGroups(params, shown);
    assert.equal(params.get("authors"), "main,crew,official,family_friend,fan,temp");
    assert.deepEqual(readShownAuthorGroups(params), shown);
});

test("hiding every group is kept as `none`", () => {
    const params = new URLSearchParams();
    const none = { main: false, artist: false, crew: false, official: false, family_friend: false, fan: false, temp: false };
    writeShownAuthorGroups(params, none);
    assert.equal(params.get("authors"), "none");
    assert.deepEqual(readShownAuthorGroups(params), none);
});
