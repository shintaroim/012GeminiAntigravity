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
  const isListeningRequestedRef = useRef<boolean>(false);
  const accumulatedTranscriptRef = useRef<string>("");
  const restartTimerRef = useRef<NodeJS.Timeout | null>(null);

  // コンポーネント破棄やセッション切り替え時の安全なクリーンアップ
  const cleanupRecognition = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
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
      isListeningRequestedRef.current = false;
      cleanupRecognition();
    };
  }, [cleanupRecognition]);

  // 音声認識セッションの開始（自己回復リトライ機能付き）
  const startRecognitionSession = useCallback(
    async (retryCount = 0) => {
      if (typeof window === "undefined" || !isListeningRequestedRef.current) return;

      const win = window as unknown as IWindowWithSpeech;
      const SpeechRecognitionClass =
        win.SpeechRecognition || win.webkitSpeechRecognition;

      if (!SpeechRecognitionClass) {
        setErrorMessage("お使いのブラウザは音声入力に対応していません。");
        isListeningRequestedRef.current = false;
        setIsListening(false);
        return;
      }

      // iOS Safari で音声合成（再生）がマイクをロックしている場合があるため、再生を中断してマイクを解放
      if ("speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // safe
        }
      }

      cleanupRecognition();

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

          // セッションをまたいだ確定テキストの累積
          const baseAcc = accumulatedTranscriptRef.current;
          let fullFinal = baseAcc;
          if (finalStr) {
            fullFinal = baseAcc ? `${baseAcc}${finalStr}` : finalStr;
          }

          setTranscript(fullFinal);
          setInterimTranscript(interimStr);

          const currentSpeech = fullFinal || interimStr;
          if (currentSpeech) {
            onResult?.(currentSpeech, Boolean(finalStr));
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          // 無音（no-speech）や中断（aborted）は通常挙動なのでエラー表示しない
          if (event.error === "no-speech" || event.error === "aborted") {
            return;
          }

          console.warn("[SpeechRecognition] Error event:", event.error);
          let msg = "音声認識でエラーが発生しました。";
          if (event.error === "not-allowed") {
            msg = "マイクの使用が許可されていません。ブラウザの設定でマイクを許可してください。";
            isListeningRequestedRef.current = false;
            setIsListening(false);
            cleanupRecognition();
            setErrorMessage(msg);
            onError?.(msg);
            return;
          } else if (event.error === "service-not-allowed") {
            msg = "端末の音声入力が無効になっています。iPhoneの「設定」>「一般」>「キーボード」で「音声入力を有効にする」がONになっているかご確認ください。";
            isListeningRequestedRef.current = false;
            setIsListening(false);
            cleanupRecognition();
            setErrorMessage(msg);
            onError?.(msg);
            return;
          } else if (event.error === "network") {
            msg = "音声認識の通信に失敗しました。電波環境の良い場所でお試しください。";
          } else if (event.error === "audio-capture") {
            msg = "マイクが検出されませんでした。別のアプリがマイクを使用していないかご確認ください。";
          }

          setErrorMessage(msg);
          onError?.(msg);
        };

        recognition.onend = () => {
          // 未確定テキストをクリア
          setInterimTranscript("");

          // 現在の確定結果を累積バッファに記憶
          setTranscript((curr) => {
            accumulatedTranscriptRef.current = curr;
            return curr;
          });

          // ユーザーが明示的に停止していない場合、スマホの無音自動切断に対処して即座に再接続
          if (isListeningRequestedRef.current) {
            cleanupRecognition();
            // 短いディレイ（100ms）を設けてCoreAudioの切り替えを待つ
            restartTimerRef.current = setTimeout(() => {
              if (isListeningRequestedRef.current) {
                startRecognitionSession(0);
              }
            }, 100);
          } else {
            setIsListening(false);
            cleanupRecognition();
            onEnd?.();
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err: unknown) {
        console.warn(`[SpeechRecognition] Start attempt ${retryCount + 1} failed:`, err);
        cleanupRecognition();

        // スマホで直前のセッションが完全破棄される前にstart()が呼ばれた場合、最大2回自動リトライ
        if (retryCount < 2 && isListeningRequestedRef.current) {
          restartTimerRef.current = setTimeout(() => {
            if (isListeningRequestedRef.current) {
              startRecognitionSession(retryCount + 1);
            }
          }, 150);
        } else {
          setIsListening(false);
          isListeningRequestedRef.current = false;
          const msg = "音声認識を開始できませんでした。もう一度お試しください。";
          setErrorMessage(msg);
          onError?.(msg);
        }
      }
    },
    [lang, continuous, interimResults, onResult, onEnd, onError, cleanupRecognition]
  );

  // 録音開始
  const startListening = useCallback(async () => {
    isListeningRequestedRef.current = true;
    accumulatedTranscriptRef.current = "";
    setTranscript("");
    setInterimTranscript("");
    setErrorMessage(null);
    await startRecognitionSession(0);
  }, [startRecognitionSession]);

  // 録音停止
  const stopListening = useCallback(() => {
    isListeningRequestedRef.current = false;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // safe
      }
    }
    setIsListening(false);
    setInterimTranscript("");
    cleanupRecognition();
  }, [cleanupRecognition]);

  const resetTranscript = useCallback(() => {
    accumulatedTranscriptRef.current = "";
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
