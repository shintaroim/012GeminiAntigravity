import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { synthesizeWithGoogleTts } from "@/lib/speech/google-tts";

describe("Google Cloud TTS Service", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return null if GOOGLE_TTS_API_KEY is not configured", async () => {
    delete process.env.GOOGLE_TTS_API_KEY;
    delete process.env.AI_API_KEY;

    const result = await synthesizeWithGoogleTts("こんにちは");
    expect(result).toBeNull();
  });

  it("should return null if text is empty or only whitespace", async () => {
    process.env.GOOGLE_TTS_API_KEY = "test-key";

    const result = await synthesizeWithGoogleTts("   ");
    expect(result).toBeNull();
  });

  it("should successfully return audio buffer when Google TTS API succeeds", async () => {
    process.env.GOOGLE_TTS_API_KEY = "valid-test-key";

    const mockBase64 = Buffer.from("fake-mp3-audio-bytes").toString("base64");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        audioContent: mockBase64,
      }),
    });

    globalThis.fetch = mockFetch;

    const result = await synthesizeWithGoogleTts("本音を聴かせてください。");

    expect(result).not.toBeNull();
    expect(result?.contentType).toBe("audio/mpeg");
    expect(result?.audioBuffer.toString()).toBe("fake-mp3-audio-bytes");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("https://texttospeech.googleapis.com/v1/text:synthesize?key=valid-test-key"),
      expect.objectContaining({
        method: "POST",
      })
    );
  });
});
