import assert from "node:assert/strict";
import test from "node:test";
import { orderRelatedPosts } from "./postOrder.ts";

test("newest keeps the backend order", () => {
    const posts = [3, 2, 1];
    assert.deepEqual(orderRelatedPosts(posts, "newest"), [3, 2, 1]);
});

test("oldest mirrors the backend order without mutating it", () => {
    const posts = [3, 2, 1];
    assert.deepEqual(orderRelatedPosts(posts, "oldest"), [1, 2, 3]);
    assert.deepEqual(posts, [3, 2, 1]);
});
