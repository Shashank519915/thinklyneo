/**
 * Upload a single file via POST /api/upload and surface API validation errors.
 */
export async function uploadFileViaApi(
  file: File
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const formData = new FormData();
  formData.append("file", file);

  let data: { url?: string; error?: string } = {};
  try {
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !data.url) {
      return {
        ok: false,
        error: data.error || `Upload failed (${res.status})`,
      };
    }
    return { ok: true, url: data.url };
  } catch {
    return { ok: false, error: data.error || "Upload failed — network error." };
  }
}

/** Upload many files sequentially; returns URLs and the first error message if any failed. */
export async function uploadFilesViaApi(files: File[]): Promise<{
  urls: string[];
  firstError: string | null;
}> {
  const urls: string[] = [];
  let firstError: string | null = null;
  for (const file of files) {
    const result = await uploadFileViaApi(file);
    if (result.ok) {
      urls.push(result.url);
    } else if (!firstError) {
      firstError = result.error;
    }
  }
  return { urls, firstError };
}
