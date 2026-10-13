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
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  errorMessage: string | null;
}

// Web Speech Recognition の簡易型定義
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

    if (!SpeechRecognitionClass) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
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
      // no-speech は単に音声が検出されなかっただけなので致命的エラーではない
      if (event.error === "no-speech") {
        setIsListening(false);
        return;
      }

      console.warn("[SpeechRecognition] Error:", event.error);
      let message = "音声認識でエラーが発生しました。";
      if (event.error === "not-allowed") {
        message = "マイクへのアクセスが拒否されました。ブラウザの設定でマイクを許可してください。";
      } else if (event.error === "network") {
        message = "音声認識のためのネットワーク通信に失敗しました。";
      }

      setErrorMessage(message);
      onError?.(message);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.abort();
      } catch {
        // cleanup safe
      }
    };
  }, [lang, continuous, interimResults, onResult, onError]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setErrorMessage(null);
    try {
      recognitionRef.current.start();
    } catch {
      // すでに開始されている場合は一度止めて再開
      try {
        recognitionRef.current.stop();
        setTimeout(() => {
          recognitionRef.current?.start();
        }, 100);
      } catch {
        // ignore
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      // ignore
    }
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
