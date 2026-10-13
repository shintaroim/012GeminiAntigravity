import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { synthesizeWithGoogleTts } from "@/lib/speech/google-tts";

const TtsRequestSchema = z.object({
  text: z.string().min(1).max(2000),
  voiceName: z.string().optional(),
  speakingRate: z.number().min(0.25).max(4.0).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = TtsRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { text, voiceName, speakingRate } = parsed.data;

    const result = await synthesizeWithGoogleTts(text, {
      voiceName,
      speakingRate,
    });

    if (!result) {
      return NextResponse.json(
        { error: "GOOGLE_TTS_NOT_CONFIGURED" },
        { status: 503 }
      );
    }

    return new Response(new Uint8Array(result.audioBuffer), {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "public, max-age=86400", // 同一文章のキャッシュ
      },
    });
  } catch (err: unknown) {
    console.error("[TTS API Error]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to synthesize speech with Google TTS",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const apiKey =
    process.env.GOOGLE_TTS_API_KEY ||
    (process.env.AI_PROVIDER === "gemini" ? process.env.AI_API_KEY : undefined);
  const available = Boolean(apiKey && apiKey !== "your-google-tts-api-key-here");

  return NextResponse.json({
    provider: "google",
    available,
  });
}
