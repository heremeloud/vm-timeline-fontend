import { test } from "node:test";
import assert from "node:assert/strict";
import { withAutoplay, youTubeEmbedVideoId, youTubePosterUrl } from "./youtube.ts";

test("reads the video id from an embed URL", () => {
    assert.equal(youTubeEmbedVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(youTubeEmbedVideoId("https://www.youtube.com/embed/a-b_c?start=5"), "a-b_c");
});

test("playlists and other URLs have no video id or poster", () => {
    assert.equal(youTubeEmbedVideoId("https://www.youtube.com/embed/videoseries?list=PL123"), "");
    assert.equal(youTubePosterUrl("https://www.youtube.com/embed/videoseries?list=PL123"), "");
    assert.equal(youTubePosterUrl("https://example.com/embed/abc"), "");
});

test("builds the poster URL for a video", () => {
    assert.equal(youTubePosterUrl("https://www.youtube.com/embed/abc123"), "https://i.ytimg.com/vi/abc123/hqdefault.jpg");
});

test("adds autoplay while keeping existing params", () => {
    assert.equal(
        withAutoplay("https://www.youtube.com/embed/videoseries?list=PL123"),
        "https://www.youtube.com/embed/videoseries?list=PL123&autoplay=1",
    );
    assert.equal(withAutoplay("https://www.youtube.com/embed/abc"), "https://www.youtube.com/embed/abc?autoplay=1");
});
