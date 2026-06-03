import { describe, it, expect } from "vitest";
import {
  isLikelyVideoUrl,
  parseMergeVideoTransition,
  resolveMergeVideoUrls,
} from "@galaxy/shared";

describe("parseMergeVideoTransition", () => {
  it("parses wired text values", () => {
    expect(parseMergeVideoTransition("dissolve")).toBe("dissolve");
    expect(parseMergeVideoTransition("  FADE ")).toBe("fade");
  });

  it("defaults unknown values to none", () => {
    expect(parseMergeVideoTransition("crossfade")).toBe("none");
  });
});

describe("isLikelyVideoUrl", () => {
  it("rejects webp image URLs", () => {
    expect(isLikelyVideoUrl("https://cdn.example/a.webp")).toBe(false);
  });

  it("accepts mp4 URLs", () => {
    expect(isLikelyVideoUrl("https://cdn.example/a.mp4")).toBe(true);
  });
});

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

  it("drops non-video URLs from the list", () => {
    const urls = resolveMergeVideoUrls({
      video_urls: ["https://a/1.webp", "https://a/2.mp4", "https://a/3.mp4"],
    });
    expect(urls).toEqual(["https://a/2.mp4", "https://a/3.mp4"]);
  });
});
