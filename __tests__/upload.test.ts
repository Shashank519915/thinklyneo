import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { uploadFileViaApi, uploadFilesViaApi } from "@/lib/upload";

describe("uploadFileViaApi", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: "File exceeds maximum upload size of 15MB for image uploads." }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns API error message when upload is rejected", async () => {
    const file = new File(["x"], "big.png", { type: "image/png" });
    const result = await uploadFileViaApi(file);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/15MB/i);
    }
  });
});

describe("uploadFilesViaApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("collects successful URLs and first error", async () => {
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        call += 1;
        if (call === 1) {
          return { ok: true, status: 200, json: async () => ({ url: "https://cdn/a.png" }) };
        }
        return {
          ok: false,
          status: 400,
          json: async () => ({ error: "Image width 5000px exceeds maximum 4096px." }),
        };
      })
    );

    const files = [
      new File(["a"], "a.png", { type: "image/png" }),
      new File(["b"], "b.png", { type: "image/png" }),
    ];
    const { urls, firstError } = await uploadFilesViaApi(files);
    expect(urls).toEqual(["https://cdn/a.png"]);
    expect(firstError).toMatch(/4096px/i);
  });
});
