"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { sanitizeForSpeech } from "./sanitize-text";

export interface SpeechSynthesisOptions {
  rate?: number; // 速度 (0.1 〜 10, デフォルト: 1.0)
  pitch?: number; // ピッチ (0 〜 2, デフォルト: 1.0)
  volume?: number; // 音量 (0 〜 1, デフォルト: 1.0)
}

export interface UseSpeechSynthesisReturn {
  isSupported: boolean;
  isSpeaking: boolean;
  speakingId: string | null;
  speak: (text: string, messageId?: string, options?: SpeechSynthesisOptions) => void;
  cancel: () => void;
  pause: () => void;
  resume: () => void;
  unlockAudio: () => void;
}

/**
 * 日本語に最適なボイスを検出・選択します
 */
export function selectBestJapaneseVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const jaVoices = voices.filter(
    (v) => v.lang === "ja-JP" || v.lang === "ja_JP" || v.lang.startsWith("ja")
  );

  if (jaVoices.length === 0) return null;

  // 優先度高：高品質な日本語ボイス（Microsoft Nanami/Keita, Google 日本語, Apple Kyoko 等）
  const preferredNames = [
    "nanami",
    "keita",
    "ayumi",
    "google 日本語",
    "kyoko",
    "otoya",
    "sayaka",
    "haruka",
  ];

  for (const name of preferredNames) {
    const found = jaVoices.find((v) => v.name.toLowerCase().includes(name));
    if (found) return found;
  }

  // デフォルトまたは最初の日本語ボイス
  return jaVoices.find((v) => v.default) || jaVoices[0];
}

/**
 * 長文を句読点や改行で安全なチャンクに分割します。
 * （ブラウザのSpeechSynthesisが15秒前後で停止してしまうバグを回避するため）
 */
export function splitTextIntoSentences(text: string): string[] {
  // 句点、感嘆符、疑問符、改行で分割（区切り文字も保持）
  const rawSentences = text.split(/(?<=[。！？\n])/g);
  const sentences: string[] = [];

  for (const raw of rawSentences) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    // もし句読点のない極端に長い文（120文字超）があれば、読点「、」等でさらに分割
    if (trimmed.length > 120) {
      const subChunks = trimmed.split(/(?<=[、,])/g);
      for (const sub of subChunks) {
        const subTrimmed = sub.trim();
        if (subTrimmed) sentences.push(subTrimmed);
      }
    } else {
      sentences.push(trimmed);
    }
  }

  return sentences.length > 0 ? sentences : [text];
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const queueRef = useRef<string[]>([]);
  const currentIdRef = useRef<string | null>(null);
  const optionsRef = useRef<SpeechSynthesisOptions>({ rate: 1.0, pitch: 1.0, volume: 1.0 });
  const resumeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 無音WAVデータURI（スマホのAutoplay制限解除用）
  const SILENT_AUDIO_URI =
    "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

  // スマホのブラウザ自動再生制限を解除するアンロック処理（ユーザー操作時に呼ぶ）
  const unlockAudio = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      if (!audioRef.current && typeof Audio !== "undefined") {
        audioRef.current = new Audio();
      }
      if (audioRef.current) {
        audioRef.current.src = SILENT_AUDIO_URI;
        audioRef.current.volume = 0.01;
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.volume = optionsRef.current.volume ?? 1.0;
              }
            })
            .catch(() => {
              // ignore
            });
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const cleanupAudio = () => {
    if (audioRef.current) {
      try {
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.pause();
        audioRef.current.src = "";
      } catch {
        // safe
      }
      // audioRef.current は null にせずアンロック済みインスタンスを再利用
    }
  };

  // Chrome等での停止対策：定期的なresume呼び出し
  const startResumeHeartbeat = () => {
    if (resumeTimerRef.current) clearInterval(resumeTimerRef.current);
    resumeTimerRef.current = setInterval(() => {
      if (typeof window !== "undefined" && window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);
  };

  const stopResumeHeartbeat = () => {
    if (resumeTimerRef.current) {
      clearInterval(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  };

  // 初期化・ボイス一覧のロード
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasAudio = typeof Audio !== "undefined";
    const hasSynthesis = "speechSynthesis" in window;
    setIsSupported(hasAudio || hasSynthesis);

    if (hasSynthesis) {
      const updateVoices = () => {
        const loaded = window.speechSynthesis.getVoices();
        voicesRef.current = loaded;
      };

      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    return () => {
      cleanupAudio();
      stopResumeHeartbeat();
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // 発話終了処理
  const handleFinished = useCallback(() => {
    cleanupAudio();
    stopResumeHeartbeat();
    queueRef.current = [];
    currentIdRef.current = null;
    setIsSpeaking(false);
    setSpeakingId(null);
  }, []);

  // チャンク順次再生（Web Speech API用）
  const playNextChunk = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      handleFinished();
      return;
    }

    if (queueRef.current.length === 0) {
      handleFinished();
      return;
    }

    const chunk = queueRef.current.shift();
    if (!chunk) {
      playNextChunk();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.lang = "ja-JP";

    const selectedVoice = selectBestJapaneseVoice(voicesRef.current);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    const opts = optionsRef.current;
    utterance.rate = opts.rate ?? 1.0;
    utterance.pitch = opts.pitch ?? 1.0;
    utterance.volume = opts.volume ?? 1.0;

    utterance.onend = () => {
      if (queueRef.current.length > 0) {
        playNextChunk();
      } else {
        handleFinished();
      }
    };

    utterance.onerror = (e) => {
      if (e.error !== "canceled" && e.error !== "interrupted") {
        console.warn("[SpeechSynthesis] Utterance error:", e.error);
      }
      handleFinished();
    };

    window.speechSynthesis.speak(utterance);
  }, [handleFinished]);

  // Web Speech API フォールバック発話
  const playWebSpeechFallback = useCallback(
    (text: string, options?: SpeechSynthesisOptions) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        handleFinished();
        return;
      }

      const sentences = splitTextIntoSentences(text);
      if (sentences.length === 0) {
        handleFinished();
        return;
      }

      queueRef.current = sentences;
      optionsRef.current = {
        rate: options?.rate ?? 1.0,
        pitch: options?.pitch ?? 1.0,
        volume: options?.volume ?? 1.0,
      };

      startResumeHeartbeat();
      playNextChunk();
    },
    [handleFinished, playNextChunk]
  );

  // 発話開始（Google Cloud TTS 最優先 -> Web Speech API フォールバック）
  const speak = useCallback(
    async (text: string, messageId?: string, options?: SpeechSynthesisOptions) => {
      if (typeof window === "undefined") return;

      // 既存の再生を全てキャンセル
      cleanupAudio();
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      stopResumeHeartbeat();

      const cleaned = sanitizeForSpeech(text);
      if (!cleaned) {
        handleFinished();
        return;
      }

      currentIdRef.current = messageId || `speech-${Date.now()}`;
      setIsSpeaking(true);
      setSpeakingId(currentIdRef.current);

      // 1. Google TTS (サーバーAPI) を試行
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: cleaned,
            speakingRate: options?.rate ?? 1.0,
          }),
        });

        if (res.ok) {
          const blob = await res.blob();
          const audioUrl = URL.createObjectURL(blob);

          if (!audioRef.current && typeof Audio !== "undefined") {
            audioRef.current = new Audio();
          }
          const audio = audioRef.current!;
          audio.src = audioUrl;
          audio.volume = options?.volume ?? 1.0;

          let hasEnded = false;

          audio.onended = () => {
            hasEnded = true;
            audio.onended = null;
            audio.onerror = null;
            URL.revokeObjectURL(audioUrl);
            handleFinished();
          };

          audio.onerror = (e) => {
            if (hasEnded) return;
            audio.onended = null;
            audio.onerror = null;
            URL.revokeObjectURL(audioUrl);
            console.warn("[TTS] Google Cloud TTS audio playback error:", e);
            handleFinished();
          };

          try {
            await audio.play();
          } catch (playErr) {
            console.warn("[TTS] audio.play() failed:", playErr);
            audio.onended = null;
            audio.onerror = null;
            URL.revokeObjectURL(audioUrl);
            playWebSpeechFallback(cleaned, options);
          }
          return;
        }
      } catch (err) {
        console.warn("[TTS] Google Cloud TTS unavailable, using fallback:", err);
      }

      // 2. Google TTS が未設定または失敗した場合、Web Speech API にフォールバック
      playWebSpeechFallback(cleaned, options);
    },
    [handleFinished, playWebSpeechFallback]
  );

  // キャンセル（停止）
  const cancel = useCallback(() => {
    cleanupAudio();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    handleFinished();
  }, [handleFinished]);

  // 一時停止
  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    } else if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.pause();
    }
    setIsSpeaking(false);
  }, []);

  // 再開
  const resume = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
      setIsSpeaking(true);
    } else if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.resume();
      setIsSpeaking(true);
    }
  }, []);

  return {
    isSupported,
    isSpeaking,
    speakingId,
    speak,
    cancel,
    pause,
    resume,
    unlockAudio,
  };
}
