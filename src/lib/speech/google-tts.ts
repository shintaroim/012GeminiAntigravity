import { sanitizeForSpeech } from "./sanitize-text";

export interface GoogleTtsOptions {
  voiceName?: string;
  speakingRate?: number;
  pitch?: number;
}

export interface GoogleTtsResult {
  audioBuffer: Buffer;
  contentType: string;
}

/**
 * Google Cloud Text-to-Speech REST API を呼び出して MP3 音声バッファを生成します。
 */
export async function synthesizeWithGoogleTts(
  text: string,
  options: GoogleTtsOptions = {}
): Promise<GoogleTtsResult | null> {
  const apiKey =
    process.env.GOOGLE_TTS_API_KEY ||
    (process.env.AI_PROVIDER === "gemini" ? process.env.AI_API_KEY : undefined);

  if (!apiKey || apiKey === "your-google-tts-api-key-here") {
    return null;
  }

  const cleanedText = sanitizeForSpeech(text);
  if (!cleanedText) {
    return null;
  }

  // 最大文字数保護（過剰なトークン・リクエスト防止）
  const truncated = cleanedText.slice(0, 1500);

  const voiceName =
    options.voiceName || process.env.GOOGLE_TTS_VOICE || "ja-JP-Neural2-B";
  const speakingRate = options.speakingRate ?? 1.0;
  const pitch = options.pitch ?? 0.0;

  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: { text: truncated },
      voice: {
        languageCode: "ja-JP",
        name: voiceName,
      },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate,
        pitch,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("[GoogleTTS] API Error:", response.status, errorData);
    throw new Error(`Google TTS API failed with status ${response.status}`);
  }

  const data = (await response.json()) as { audioContent?: string };
  if (!data.audioContent) {
    throw new Error("No audioContent in Google TTS response");
  }

  const audioBuffer = Buffer.from(data.audioContent, "base64");

  return {
    audioBuffer,
    contentType: "audio/mpeg",
  };
}
