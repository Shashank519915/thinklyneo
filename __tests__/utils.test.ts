import { describe, it, expect } from "vitest";
import {
  classifyMediaUrl,
  sanitizeError,
  formatDuration,
  formatRelativeTime,
  resolvePropagatedEdgeValue,
} from "@/lib/utils";
import type { Node, Edge } from "@xyflow/react";

// ─── classifyMediaUrl ───────────────────────────────────────────────────────

describe("classifyMediaUrl", () => {
  it("returns null for non-string input", () => {
    expect(classifyMediaUrl(null)).toBeNull();
    expect(classifyMediaUrl(42)).toBeNull();
    expect(classifyMediaUrl({})).toBeNull();
    expect(classifyMediaUrl(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(classifyMediaUrl("")).toBeNull();
    expect(classifyMediaUrl("   ")).toBeNull();
  });

  it("returns null for plain text (no URL)", () => {
    expect(classifyMediaUrl("hello world")).toBeNull();
  });

  it("returns null for relative path", () => {
    expect(classifyMediaUrl("/images/photo.png")).toBeNull();
  });

  it("classifies data:image/ as image", () => {
    const result = classifyMediaUrl("data:image/png;base64,abc123");
    expect(result).toEqual({ url: "data:image/png;base64,abc123", kind: "image" });
  });

  it("classifies .mp4 URL as video", () => {
    const result = classifyMediaUrl("https://cdn.example.com/output.mp4");
    expect(result).toEqual({ url: "https://cdn.example.com/output.mp4", kind: "video" });
  });

  it("classifies .webm URL as video", () => {
    expect(classifyMediaUrl("https://cdn.example.com/clip.webm")?.kind).toBe("video");
  });

  it("classifies .mov URL as video", () => {
    expect(classifyMediaUrl("https://cdn.example.com/clip.mov")?.kind).toBe("video");
  });

  it("classifies .mp3 URL as audio", () => {
    const result = classifyMediaUrl("https://cdn.example.com/track.mp3");
    expect(result).toEqual({ url: "https://cdn.example.com/track.mp3", kind: "audio" });
  });

  it("classifies .wav URL as audio", () => {
    expect(classifyMediaUrl("https://cdn.example.com/sound.wav")?.kind).toBe("audio");
  });

  it("classifies .png URL as image", () => {
    expect(classifyMediaUrl("https://cdn.example.com/photo.png")?.kind).toBe("image");
  });

  it("classifies .jpg URL as image", () => {
    expect(classifyMediaUrl("https://cdn.example.com/photo.jpg")?.kind).toBe("image");
  });

  it("classifies .webp URL as image", () => {
    expect(classifyMediaUrl("https://cdn.example.com/photo.webp")?.kind).toBe("image");
  });

  it("classifies .pdf URL as file", () => {
    expect(classifyMediaUrl("https://cdn.example.com/doc.pdf")?.kind).toBe("file");
  });

  it("classifies bare https URL (no extension) as image by default", () => {
    const result = classifyMediaUrl("https://openai.com/cdn/generated-image");
    expect(result?.kind).toBe("image");
  });

  it("classifies URL with query string correctly", () => {
    const result = classifyMediaUrl("https://cdn.example.com/video.mp4?token=abc");
    expect(result?.kind).toBe("video");
  });

  it("classifies URL with hash correctly", () => {
    const result = classifyMediaUrl("https://cdn.example.com/audio.mp3#t=10");
    expect(result?.kind).toBe("audio");
  });
});

// ─── sanitizeError ──────────────────────────────────────────────────────────

describe("sanitizeError", () => {
  it("returns fallback for empty string", () => {
    expect(sanitizeError("")).toBe("An error occurred");
  });

  it("returns short errors as-is", () => {
    expect(sanitizeError("Network timeout")).toBe("Network timeout");
  });

  it("truncates errors longer than 120 chars", () => {
    const long = "x".repeat(150);
    const result = sanitizeError(long);
    expect(result.length).toBeLessThanOrEqual(124); // 120 + ellipsis
    expect(result.endsWith("…")).toBe(true);
  });

  it("recognises Gemini API key error", () => {
    const result = sanitizeError(
      "GoogleGenerativeAI Error: API key not valid. Please pass a valid API key."
    );
    expect(result).toContain("Invalid API key");
  });

  it("recognises Gemini quota error", () => {
    const result = sanitizeError(
      "GoogleGenerativeAI Error: RESOURCE_EXHAUSTED: quota exceeded"
    );
    expect(result).toContain("Rate limit");
  });

  it("recognises Transloadit error", () => {
    const result = sanitizeError("Transloadit assembly failed: invalid credentials");
    expect(result).toContain("Transloadit credentials");
  });

  it("recognises network fetch error", () => {
    const result = sanitizeError("fetch failed: ECONNREFUSED 127.0.0.1:3000");
    expect(result).toContain("Network error");
  });
});

// ─── formatDuration ─────────────────────────────────────────────────────────

describe("formatDuration", () => {
  it("returns hyphen for null", () => {
    expect(formatDuration(null)).toBe("-");
  });

  it("returns hyphen for undefined", () => {
    expect(formatDuration(undefined)).toBe("-");
  });

  it("returns hyphen for zero", () => {
    expect(formatDuration(0)).toBe("-");
  });

  it("formats milliseconds for sub-second durations", () => {
    expect(formatDuration(500)).toBe("500ms");
  });

  it("formats seconds for durations >= 1000ms", () => {
    expect(formatDuration(1000)).toBe("1.0s");
    expect(formatDuration(2500)).toBe("2.5s");
    expect(formatDuration(10000)).toBe("10.0s");
  });
});

// ─── formatRelativeTime ─────────────────────────────────────────────────────

describe("formatRelativeTime", () => {
  function msAgo(ms: number): Date {
    return new Date(Date.now() - ms);
  }

  it("returns 'just now' for very recent timestamps", () => {
    expect(formatRelativeTime(msAgo(5000))).toBe("just now");
  });

  it("returns minutes ago for 2-minute-old timestamp", () => {
    expect(formatRelativeTime(msAgo(2 * 60 * 1000))).toBe("2 minutes ago");
  });

  it("returns singular minute for 1 minute", () => {
    expect(formatRelativeTime(msAgo(65 * 1000))).toBe("1 minute ago");
  });

  it("returns hours ago for 3-hour-old timestamp", () => {
    expect(formatRelativeTime(msAgo(3 * 60 * 60 * 1000))).toBe("3 hours ago");
  });

  it("returns singular hour for 1 hour", () => {
    expect(formatRelativeTime(msAgo(65 * 60 * 1000))).toBe("1 hour ago");
  });

  it("returns days ago for 2-day-old timestamp", () => {
    expect(formatRelativeTime(msAgo(2 * 24 * 60 * 60 * 1000))).toBe("2 days ago");
  });

  it("accepts ISO string input", () => {
    const result = formatRelativeTime(msAgo(90 * 1000).toISOString());
    expect(result).toBe("1 minute ago");
  });
});

// ─── resolvePropagatedEdgeValue ─────────────────────────────────────────────

describe("resolvePropagatedEdgeValue", () => {
  function makeNode(id: string, type: string, data: Record<string, unknown>): Node {
    return { id, type, position: { x: 0, y: 0 }, data };
  }

  function makeEdge(source: string, target: string, sourceHandle = ""): Edge {
    return { id: `${source}-${target}`, source, target, sourceHandle };
  }

  it("returns undefined when source node is missing", () => {
    const result = resolvePropagatedEdgeValue(makeEdge("missing", "b"), []);
    expect(result).toBeUndefined();
  });

  it("resolves a text field value from requestInputs node", () => {
    const nodes = [
      makeNode("ri", "requestInputs", {
        fields: [{ id: "field_text_default", value: "hello" }],
      }),
    ];
    const e = makeEdge("ri", "gpt", "field_text_default");
    expect(resolvePropagatedEdgeValue(e, nodes)).toBe("hello");
  });

  it("returns undefined for missing field in requestInputs", () => {
    const nodes = [
      makeNode("ri", "requestInputs", { fields: [] }),
    ];
    const e = makeEdge("ri", "gpt", "field_text_default");
    expect(resolvePropagatedEdgeValue(e, nodes)).toBeUndefined();
  });

  it("resolves a scalar output from a non-requestInputs node", () => {
    const nodes = [makeNode("gpt", "gptImage2", { output: "https://img.png" })];
    const e = makeEdge("gpt", "response", "");
    expect(resolvePropagatedEdgeValue(e, nodes)).toBe("https://img.png");
  });

  it("resolves a named key from an object output using sourceHandle", () => {
    const nodes = [
      makeNode("merge", "mergeAV", {
        output: { outputVideo: "https://video.mp4", outputAudio: "https://audio.mp3" },
      }),
    ];
    const e = makeEdge("merge", "response", "outputVideo");
    expect(resolvePropagatedEdgeValue(e, nodes)).toBe("https://video.mp4");
  });

  it("strips out: prefix from sourceHandle when resolving object keys", () => {
    const nodes = [
      makeNode("gemini", "gemini", { output: { response: "Hello from Gemini" } }),
    ];
    const e = makeEdge("gemini", "response", "out:response");
    expect(resolvePropagatedEdgeValue(e, nodes)).toBe("Hello from Gemini");
  });

  it("falls back to previewOutputsByNodeId when node output is null", () => {
    const nodes = [makeNode("gpt", "gptImage2", { output: null })];
    const e = makeEdge("gpt", "response", "");
    const result = resolvePropagatedEdgeValue(e, nodes, {
      previewOutputsByNodeId: { gpt: "https://cached-img.png" },
    });
    expect(result).toBe("https://cached-img.png");
  });

  it("prefers live node output over previewOutputsByNodeId", () => {
    const nodes = [makeNode("gpt", "gptImage2", { output: "https://live.png" })];
    const e = makeEdge("gpt", "response", "");
    const result = resolvePropagatedEdgeValue(e, nodes, {
      previewOutputsByNodeId: { gpt: "https://stale.png" },
    });
    expect(result).toBe("https://live.png");
  });
});
