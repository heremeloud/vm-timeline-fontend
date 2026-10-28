import { test } from "node:test";
import assert from "node:assert/strict";
import { twitterImageAtSize } from "./twitterImage.ts";

test("swaps the name param on a Twitter media URL", () => {
    assert.equal(
        twitterImageAtSize("https://pbs.twimg.com/media/G6mCQuaacAA1uZf?format=jpg&name=4096x4096", "medium"),
        "https://pbs.twimg.com/media/G6mCQuaacAA1uZf?format=jpg&name=medium",
    );
});

test("adds a name param when the URL has a format but no size", () => {
    assert.equal(
        twitterImageAtSize("https://pbs.twimg.com/media/ABC?format=png", "medium"),
        "https://pbs.twimg.com/media/ABC?format=png&name=medium",
    );
});

test("handles the legacy :size suffix", () => {
    assert.equal(
        twitterImageAtSize("https://pbs.twimg.com/media/ABC.jpg:orig", "medium"),
        "https://pbs.twimg.com/media/ABC.jpg:medium",
    );
    assert.equal(
        twitterImageAtSize("https://pbs.twimg.com/media/ABC.jpg", "medium"),
        "https://pbs.twimg.com/media/ABC.jpg:medium",
    );
});

test("leaves other URLs alone", () => {
    for (const url of [
        "https://pbs.twimg.com/profile_images/1/abc_400x400.jpg",
        "https://pbs.twimg.com/media/ABC",
        "https://media.example.r2.dev/a.jpg",
        "/static/authors/1.jpg",
        "",
    ]) {
        assert.equal(twitterImageAtSize(url, "medium"), url);
    }
});
