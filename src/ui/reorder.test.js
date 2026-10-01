import test from "node:test";
import assert from "node:assert/strict";
import { reorderItems } from "./reorder.js";

test("reorderItems moves an item without mutating the source", () => {
    const source = ["a", "b", "c"];
    assert.deepEqual(reorderItems(source, 0, 2), ["b", "c", "a"]);
    assert.deepEqual(source, ["a", "b", "c"]);
});

test("reorderItems ignores invalid moves", () => {
    const source = ["a", "b"];
    assert.equal(reorderItems(source, -1, 1), source);
    assert.equal(reorderItems(source, 0, 2), source);
});
