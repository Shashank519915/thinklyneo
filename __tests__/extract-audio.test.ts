import { describe, it, expect } from "vitest";
import {
  extractAudioFfmpegConfig,
  parseExtractAudioFormat,
} from "@shashank519915/shared";

describe("parseExtractAudioFormat", () => {
  it("parses mp3, wav, and aac", () => {
    expect(parseExtractAudioFormat("mp3")).toBe("mp3");
    expect(parseExtractAudioFormat("wav")).toBe("wav");
    expect(parseExtractAudioFormat("aac")).toBe("aac");
  });

  it("accepts acc typo as aac", () => {
    expect(parseExtractAudioFormat("acc")).toBe("aac");
  });

  it("defaults unknown values to mp3", () => {
    expect(parseExtractAudioFormat("flac")).toBe("mp3");
  });
});

describe("extractAudioFfmpegConfig", () => {
  it("maps formats to ffmpeg codec and mime", () => {
    expect(extractAudioFfmpegConfig("mp3")).toEqual({
      codec: "libmp3lame",
      ext: "mp3",
      mime: "audio/mpeg",
    });
    expect(extractAudioFfmpegConfig("wav")).toMatchObject({ ext: "wav", mime: "audio/wav" });
    expect(extractAudioFfmpegConfig("aac")).toMatchObject({ ext: "aac", codec: "aac" });
  });
});
