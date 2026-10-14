"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (text: string, isFinal: boolean) => void;
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
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
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

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

interface IWindowWithSpeech extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const {
    lang = "ja-JP",
    continuous = false,
    interimResults = true,
    onResult,
    onError,
  } = options;

  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const win = window as unknown as IWindowWithSpeech;
    const SpeechRecognitionClass =
      win.SpeechRecognition || win.webkitSpeechRecognition;

    setIsSupported(Boolean(SpeechRecognitionClass));

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // safe
        }
      }
    };
  }, []);

  // 録音開始（スマホで毎回新規インスタンスを生成してエラーを防ぐ）
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

    // 既存のセッションがあれば終了
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // safe
      }
      recognitionRef.current = null;
    }

    // スマホのブラウザでマイク権限を明示的に事前要求（iOS Safari等でサイレント拒否されるのを防ぐ）
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // 権限確認完了後、認識用マイクを解放するためストリームを停止
        stream.getTracks().forEach((track) => track.stop());
      } catch (err: unknown) {
        console.warn("[SpeechRecognition] Microphone permission error:", err);
        const msg = "マイクへのアクセスが拒否されました。ブラウザまたは本体の設定でマイクを許可してください。";
        setErrorMessage(msg);
        onError?.(msg);
        return;
      }
    }

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
        let currentFinal = "";
        let currentInterim = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            currentFinal += item[0].transcript;
          } else {
            currentInterim += item[0].transcript;
          }
        }

        if (currentFinal) {
          setTranscript((prev) => {
            const next = prev ? `${prev} ${currentFinal}` : currentFinal;
            onResult?.(next, true);
            return next;
          });
          setInterimTranscript("");
        } else if (currentInterim) {
          setInterimTranscript(currentInterim);
          onResult?.(currentInterim, false);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        // no-speech（無音）や aborted（ユーザー中止）は通常の挙動なのでエラー扱いしない
        if (event.error === "no-speech" || event.error === "aborted") {
          setIsListening(false);
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
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript("");
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: unknown) {
      console.error("[SpeechRecognition] Failed to start:", err);
      const msg = "音声認識の開始に失敗しました。もう一度お試しください。";
      setErrorMessage(msg);
      onError?.(msg);
      setIsListening(false);
    }
  }, [lang, continuous, interimResults, onResult, onError]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      // safe
    }
    setIsListening(false);
  }, []);

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
