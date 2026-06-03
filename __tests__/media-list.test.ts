import { describe, it, expect } from "vitest";
import { parseMediaList } from "@/lib/media-list";

describe("parseMediaList", () => {
  it("splits comma-separated strings", () => {
    expect(parseMediaList("https://a/x.webp,https://b/y.webp")).toEqual([
      "https://a/x.webp",
      "https://b/y.webp",
    ]);
  });

  it("flattens array entries that contain commas", () => {
    expect(parseMediaList(["https://a/x.webp,https://b/y.webp"])).toEqual([
      "https://a/x.webp",
      "https://b/y.webp",
    ]);
  });

  it("merges multiple edge values", () => {
    expect(parseMediaList(["https://a/x.webp", "https://b/y.webp"])).toEqual([
      "https://a/x.webp",
      "https://b/y.webp",
    ]);
  });

  it("trims whitespace around URLs", () => {
    expect(parseMediaList(" https://a/x.webp , https://b/y.webp ")).toEqual([
      "https://a/x.webp",
      "https://b/y.webp",
    ]);
  });
});
