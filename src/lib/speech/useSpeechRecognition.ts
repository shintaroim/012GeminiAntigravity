"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (text: string, isFinal: boolean) => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: () => Promise<void>;
  stopListening: () => void;
  resetTranscript: () => void;
  errorMessage: string | null;
}

// Web Speech Recognition の型定義
export interface SpeechRecognitionResultItem {
  transcript: string;
}

export interface SpeechRecognitionResultEntry {
  isFinal: boolean;
  [index: number]: SpeechRecognitionResultItem;
}

export interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultEntry;
}

export interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

export interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

export interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

export interface IWindowWithSpeech extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

/**
 * SpeechRecognitionの results リストから final と interim の文字列を抽出する純粋関数
 */
export function extractTranscriptFromResultList(results: SpeechRecognitionResultListLike): {
  finalStr: string;
  interimStr: string;
} {
  let finalStr = "";
  let interimStr = "";

  for (let i = 0; i < results.length; i++) {
    const item = results[i];
    const text = item[0]?.transcript || "";
    if (item.isFinal) {
      finalStr += text;
    } else {
      interimStr += text;
    }
  }

  return { finalStr, interimStr };
}

/**
 * 既存のベーステキストと、音声認識の最新テキスト（確定＋未確定）を結合する純粋関数
 */
export function combineBaseAndSpeechText(
  baseText: string,
  speechText: string,
  maxChars = 2000
): string {
  const trimmedBase = baseText.trim();
  const trimmedSpeech = speechText.trim();

  if (!trimmedSpeech) return baseText;
  if (!trimmedBase) return trimmedSpeech.slice(0, maxChars);

  // 日本語の句読点やスペースで終わっていなければ半角スペースで区切る
  const needsSeparator = !/[\s、。!?！？]$/.test(trimmedBase);
  const combined = `${trimmedBase}${needsSeparator ? " " : ""}${trimmedSpeech}`;
  return combined.slice(0, maxChars);
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const {
    lang = "ja-JP",
    continuous = true,
    interimResults = true,
    onResult,
    onEnd,
    onError,
  } = options;

  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // コンポーネント破棄時の安全なクリーンアップ
  const cleanupRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {
        // safe
      }
      recognitionRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const win = window as unknown as IWindowWithSpeech;
    const SpeechRecognitionClass =
      win.SpeechRecognition || win.webkitSpeechRecognition;

    setIsSupported(Boolean(SpeechRecognitionClass));

    return () => {
      cleanupRecognition();
    };
  }, [cleanupRecognition]);

  // 録音開始（毎回クリーンな新規インスタンスを生成してエラーやリークを防ぐ）
  const startListening = useCallback(async () => {
    if (typeof window === "undefined") return;

    const win = window as unknown as IWindowWithSpeech;
    const SpeechRecognitionClass =
      win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setErrorMessage("お使いのブラウザは音声入力に対応していません。");
      return;
    }

    setErrorMessage(null);

    // 既存セッションをクリーンアップ
    cleanupRecognition();

    setTranscript("");
    setInterimTranscript("");

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = lang;
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const { finalStr, interimStr } = extractTranscriptFromResultList(event.results);

        setTranscript(finalStr);
        setInterimTranscript(interimStr);

        // 呼び出し元のコールバック通知（確定分優先、なければ未確定分）
        if (finalStr) {
          onResult?.(finalStr, true);
        } else if (interimStr) {
          onResult?.(interimStr, false);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        // no-speech（無音）や aborted（ユーザー中止）は通常の挙動なのでエラー扱いしない
        if (event.error === "no-speech" || event.error === "aborted") {
          setIsListening(false);
          cleanupRecognition();
          return;
        }

        console.warn("[SpeechRecognition] Error event:", event.error);
        let msg = "音声認識でエラーが発生しました。";
        if (event.error === "not-allowed") {
          msg = "マイクの使用が許可されていません。ブラウザの設定でマイクを許可してください。";
        } else if (event.error === "service-not-allowed") {
          msg = "端末の音声入力が無効になっています。iPhoneの「設定」>「一般」>「キーボード」で「音声入力を有効にする」がONになっているかご確認ください。";
        } else if (event.error === "network") {
          msg = "音声認識の通信に失敗しました。電波環境の良い場所でお試しください。";
        } else if (event.error === "audio-capture") {
          msg = "マイクが検出されませんでした。別のアプリがマイクを使用していないかご確認ください。";
        }

        setErrorMessage(msg);
        onError?.(msg);
        setIsListening(false);
        cleanupRecognition();
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript("");
        cleanupRecognition();
        onEnd?.();
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: unknown) {
      console.error("[SpeechRecognition] Failed to start:", err);
      const msg = "音声認識の開始に失敗しました。もう一度お試しください。";
      setErrorMessage(msg);
      onError?.(msg);
      setIsListening(false);
      cleanupRecognition();
    }
  }, [lang, continuous, interimResults, onResult, onEnd, onError, cleanupRecognition]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) {
      setIsListening(false);
      return;
    }
    try {
      recognitionRef.current.stop();
    } catch {
      // safe
    }
    setIsListening(false);
    cleanupRecognition();
  }, [cleanupRecognition]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    errorMessage,
  };
}
