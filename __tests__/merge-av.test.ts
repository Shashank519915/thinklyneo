import { describe, it, expect } from "vitest";
import {
  resolveMergeAVAudioUrl,
  resolveMergeAVAudioVolume,
  resolveMergeAVVideoUrl,
} from "@galaxy/shared";

describe("merge AV resolvers", () => {
  it("resolves a single video_url", () => {
    expect(
      resolveMergeAVVideoUrl({ video_url: "https://cdn.example.com/a.mp4" })
    ).toBe("https://cdn.example.com/a.mp4");
  });

  it("rejects multiple videos on video_url", () => {
    expect(() =>
      resolveMergeAVVideoUrl({
        video_url: "https://a/1.mp4,https://a/2.mp4",
      })
    ).toThrow(/only one video/i);
  });

  it("supports legacy videoUrl key", () => {
    expect(resolveMergeAVVideoUrl({ videoUrl: "https://a/legacy.mp4" })).toBe(
      "https://a/legacy.mp4"
    );
  });

  it("resolves audio_url and volume with defaults", () => {
    expect(resolveMergeAVAudioUrl({ audio_url: "https://a/x.mp3" })).toBe(
      "https://a/x.mp3"
    );
    expect(resolveMergeAVAudioVolume({})).toBe(0.5);
    expect(resolveMergeAVAudioVolume({ audio_volume: 1.2 })).toBe(1.2);
    expect(resolveMergeAVAudioVolume({ audio_volume: 9 })).toBe(2);
  });
});
