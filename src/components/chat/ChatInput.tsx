"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Mic, MicOff } from "lucide-react";
import { useSpeechRecognition } from "@/lib/speech/useSpeechRecognition";

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

  const {
    isSupported: isSpeechSupported,
    isListening,
    startListening,
    stopListening,
    errorMessage: speechError,
  } = useSpeechRecognition({
    onResult: (spokenText) => {
      setText((prev) => {
        const trimmed = prev.trim();
        const next = trimmed ? `${trimmed} ${spokenText}` : spokenText;
        return next.slice(0, maxChars);
      });
    },
  });

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
    <div className="border-t border-brand-200/80 bg-white/95 backdrop-blur-md px-4 py-3 sticky bottom-0 z-20">
      <div className="max-w-3xl mx-auto space-y-2">
        {/* クイックアクションチップ */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-brand-500 flex items-center gap-1 text-[11px] shrink-0 font-medium">
            <Sparkles className="w-3 h-3" />
            ショートカット:
          </span>
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.command}
              type="button"
              onClick={() => handleQuickCommand(action.command)}
              disabled={isLoading || disabled}
              className="shrink-0 px-2.5 py-1 rounded-full bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200/80 text-[11px] transition-colors disabled:opacity-50"
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
              onChange={(e) => setText(e.target.value.slice(0, maxChars))}
              onKeyDown={handleKeyDown}
              placeholder="思い出したことや、感じていることを入力..."
              disabled={isLoading || disabled}
              className="w-full resize-none rounded-xl border border-brand-300 bg-brand-50/50 px-4 py-3 text-sm text-brand-950 placeholder-brand-400 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-600 disabled:opacity-50 transition-all max-h-44"
            />
            {text.length > 0 && (
              <div className="absolute right-3 bottom-2 text-[10px] text-brand-400">
                {text.length}/{maxChars}
              </div>
            )}
          </div>

          {/* 音声入力（マイク）ボタン */}
          {isSpeechSupported && (
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              disabled={isLoading || disabled}
              className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-all border ${
                isListening
                  ? "bg-red-500 border-red-600 text-white animate-pulse shadow-md"
                  : "bg-brand-50 border-brand-200/90 text-brand-700 hover:bg-brand-100 hover:text-brand-900"
              } disabled:opacity-40`}
              title={isListening ? "音声入力を停止" : "音声で話しかける（マイク入力）"}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}

          <button
            type="submit"
            disabled={!text.trim() || isLoading || disabled}
            className="h-11 w-11 rounded-xl bg-brand-900 text-brand-50 hover:bg-brand-950 flex items-center justify-center shrink-0 shadow-sm transition-colors disabled:opacity-40 disabled:hover:bg-brand-900"
            title="送信（Enter）"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {isListening && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-red-600 font-medium animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            声を聞き取っています...話し終えたら送信またはマイクをタップしてください
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
