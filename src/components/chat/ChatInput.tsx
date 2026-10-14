"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Mic, MicOff } from "lucide-react";
import { useSpeechRecognition, combineBaseAndSpeechText } from "@/lib/speech/useSpeechRecognition";

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

const QUICK_ACTIONS = [
  { label: "ほんね", command: "ほんね" },
  { label: "今どんな感じ？", command: "今どんな感じ？" },
  { label: "たたき台をまとめて", command: "たたき台をまとめて" },
  { label: "整える", command: "整える" },
  { label: "BOOK SEEDをまとめて", command: "BOOK SEEDをまとめて" },
];

export function ChatInput({
  onSendMessage,
  isLoading,
  disabled,
}: ChatInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const maxChars = 2000;

  const baseTextRef = useRef<string>("");

  const {
    isSupported: isSpeechSupported,
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    errorMessage: speechError,
  } = useSpeechRecognition();

  // 音声認識のテキスト反映：ベーステキスト + 音声テキスト（確定分＋未確定分）を安全に結合
  // isListeningの状態遷移に依存せず、最新の認識結果が確実にテキストエリアへ反映される
  useEffect(() => {
    const speechPart = [transcript, interimTranscript].filter(Boolean).join("");
    if (!speechPart) return;

    const nextText = combineBaseAndSpeechText(
      baseTextRef.current,
      speechPart,
      maxChars
    );
    setText(nextText);
  }, [transcript, interimTranscript, maxChars]);

  const handleToggleSpeech = async () => {
    if (isListening) {
      stopListening();
    } else {
      baseTextRef.current = text;
      await startListening();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        180
      )}px`;
    }
  }, [text]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isListening) stopListening();

    const trimmed = text.trim();
    if (!trimmed || isLoading || disabled) return;

    onSendMessage(trimmed);
    setText("");
    baseTextRef.current = "";
    resetTranscript();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      // 日本語IME変換中のEnter送信を防止
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickCommand = (cmd: string) => {
    if (isLoading || disabled) return;
    onSendMessage(cmd);
  };

  return (
    <div className="border-t border-brand-200/80 bg-white/95 backdrop-blur-md px-3 sm:px-4 py-2.5 sm:py-3 sticky bottom-0 z-20 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="max-w-3xl mx-auto space-y-2">
        {/* クイックアクションチップ */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs -mx-1 px-1 scrollbar-none">
          <span className="text-brand-500 flex items-center gap-1 text-[11px] shrink-0 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            ショートカット:
          </span>
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.command}
              type="button"
              onClick={() => handleQuickCommand(action.command)}
              disabled={isLoading || disabled}
              className="shrink-0 px-3 py-1.5 rounded-full bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200/80 text-xs transition-colors disabled:opacity-50 active:scale-95 touch-manipulation"
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* 入力フォーム */}
        <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={(e) => {
                const val = e.target.value.slice(0, maxChars);
                setText(val);
                if (!isListening) {
                  baseTextRef.current = val;
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="思い出したことや、感じていることを入力..."
              disabled={isLoading || disabled}
              className="w-full resize-none rounded-2xl border border-brand-300 bg-brand-50/50 px-3.5 sm:px-4 py-3 text-base sm:text-sm text-brand-950 placeholder-brand-400 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-600/30 disabled:opacity-50 transition-all max-h-44 min-h-[48px] leading-relaxed"
            />
            {text.length > 0 && (
              <div className="absolute right-3 bottom-2 text-[10px] text-brand-400 bg-white/80 px-1 rounded pointer-events-none">
                {text.length}/{maxChars}
              </div>
            )}
          </div>

          {/* 音声入力（マイク）ボタン（スマホで親指タップしやすい48px設計） */}
          {isSpeechSupported && (
            <button
              type="button"
              onClick={handleToggleSpeech}
              disabled={isLoading || disabled}
              className={`h-12 w-12 sm:h-11 sm:w-11 rounded-2xl flex items-center justify-center shrink-0 transition-all border active:scale-95 touch-manipulation shadow-xs ${
                isListening
                  ? "bg-red-500 border-red-600 text-white animate-pulse shadow-md ring-2 ring-red-300"
                  : "bg-brand-50 border-brand-200/90 text-brand-700 hover:bg-brand-100 hover:text-brand-900 active:bg-brand-200"
              } disabled:opacity-40`}
              title={isListening ? "音声入力を停止" : "音声で話しかける（マイク入力）"}
            >
              {isListening ? <MicOff className="w-5 h-5 sm:w-4.5 sm:h-4.5" /> : <Mic className="w-5 h-5 sm:w-4.5 sm:h-4.5" />}
            </button>
          )}

          {/* 送信ボタン（文字があるときは押しやすいアクセント色・48px設計） */}
          <button
            type="submit"
            disabled={!text.trim() || isLoading || disabled}
            className={`h-12 w-12 sm:h-11 sm:w-11 rounded-2xl flex items-center justify-center shrink-0 transition-all border touch-manipulation active:scale-95 ${
              text.trim()
                ? "bg-brand-900 hover:bg-brand-950 border-brand-950 text-white shadow-md ring-2 ring-brand-800/30 cursor-pointer"
                : "bg-brand-200/60 border-brand-200 text-brand-400 cursor-not-allowed opacity-40"
            }`}
            title="送信（Enter）"
          >
            <Send className="w-5 h-5 sm:w-4.5 sm:h-4.5" />
          </button>
        </form>

        {isListening && (
          <div className="flex items-center justify-between gap-2 text-xs text-brand-800 bg-brand-50/90 border border-brand-200/90 rounded-xl py-1.5 px-3 shadow-xs">
            <div className="flex items-center gap-2 truncate flex-1 mr-2">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span className="font-medium text-[11px] sm:text-xs truncate text-brand-700">
                {interimTranscript ? `「${interimTranscript}」` : "音声を聞き取り中..."}
              </span>
            </div>
            <button
              type="button"
              onClick={stopListening}
              className="shrink-0 text-[11px] text-red-600 font-bold px-2.5 py-1 rounded-md bg-white border border-red-200 hover:bg-red-50 active:scale-95 transition-all shadow-xs"
            >
              完了
            </button>
          </div>
        )}

        {speechError && (
          <p className="text-[11px] text-center text-red-500">{speechError}</p>
        )}

        <p className="text-[10px] text-center text-brand-500">
          Shift + Enter で改行。個人情報（実名・住所等）の入力は不要です。
        </p>
      </div>
    </div>
  );
}
