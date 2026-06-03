import { describe, it, expect } from "vitest";
import { resolveMergeVideoUrls } from "@galaxy/shared";

describe("resolveMergeVideoUrls", () => {
  it("flattens comma-separated video_urls array entries", () => {
    const urls = resolveMergeVideoUrls({
      video_urls: ["https://a/1.mp4,https://a/2.mp4"],
    });
    expect(urls).toEqual(["https://a/1.mp4", "https://a/2.mp4"]);
  });

  it("supports legacy videoUrl1..3 fields", () => {
    const urls = resolveMergeVideoUrls({
      videoUrl1: "https://a/1.mp4",
      videoUrl2: "https://a/2.mp4",
    });
    expect(urls).toEqual(["https://a/1.mp4", "https://a/2.mp4"]);
  });

  it("merges multiple wired edge values", () => {
    const urls = resolveMergeVideoUrls({
      video_urls: ["https://a/1.mp4", "https://a/2.mp4"],
    });
    expect(urls).toEqual(["https://a/1.mp4", "https://a/2.mp4"]);
  });
});
