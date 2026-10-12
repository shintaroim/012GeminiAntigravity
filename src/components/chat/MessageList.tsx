"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChatMessage } from "@/types";
import { Feather, User, Copy, Check } from "lucide-react";

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onQuickStart?: () => void;
}

export function MessageList({
  messages,
  isLoading,
  onQuickStart,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback
    }
  };

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-800 flex items-center justify-center mb-4">
          <Feather className="w-6 h-6" />
        </div>
        <h2 className="font-serif font-semibold text-lg text-brand-950 mb-2">
          HON-NEo へようこそ
        </h2>
        <p className="text-sm text-brand-700 max-w-md leading-relaxed mb-6">
          最初から本にする話を考える必要はありません。<br />
          思い出したことを、そのまま言葉にしてみてください。
        </p>
        {onQuickStart && (
          <button
            onClick={onQuickStart}
            className="px-6 py-2.5 bg-brand-900 hover:bg-brand-950 text-brand-50 rounded-xl text-sm font-medium shadow-sm transition-colors"
          >
            対話を始める（「ほんね」と送る）
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 max-w-3xl w-full mx-auto">
      {messages.map((msg) => {
        const isUser = msg.role === "user";
        return (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              isUser ? "flex-row-reverse" : "flex-row"
            }`}
          >
            {/* アバター */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs ${
                isUser
                  ? "bg-brand-800 text-brand-50"
                  : "bg-brand-200 text-brand-900"
              }`}
            >
              {isUser ? <User className="w-4 h-4" /> : <Feather className="w-4 h-4" />}
            </div>

            {/* 本文吹き出し */}
            <div
              className={`relative group max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                isUser
                  ? "bg-brand-900 text-brand-50 rounded-tr-none shadow-sm"
                  : "bg-white text-brand-950 border border-brand-200/90 rounded-tl-none shadow-sm font-sans"
              }`}
            >
              {msg.content}

              {!isUser && (
                <button
                  onClick={() => handleCopy(msg.id, msg.content)}
                  className="absolute top-2 right-2 p-1 rounded-md bg-brand-50 hover:bg-brand-100 text-brand-600 hover:text-brand-900 transition-opacity opacity-70 group-hover:opacity-100 text-[10px] flex items-center gap-1 shadow-xs"
                  title="メッセージをコピー"
                >
                  {copiedId === msg.id ? (
                    <>
                      <Check className="w-3 h-3 text-green-700" />
                      <span className="text-green-700 font-medium">済</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span className="hidden sm:inline">コピー</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* ローディング表示 */}
      {isLoading && (
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-200 text-brand-900 flex items-center justify-center shrink-0">
            <Feather className="w-4 h-4" />
          </div>
          <div className="bg-white border border-brand-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs text-brand-600 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
              <span className="inline-block w-2 h-2 rounded-full bg-brand-500 animate-pulse delay-150"></span>
              <span className="inline-block w-2 h-2 rounded-full bg-brand-500 animate-pulse delay-300"></span>
              <span className="ml-2">HON-NEoが言葉を選んでいます...</span>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
