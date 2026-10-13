"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChatMessage } from "@/types";
import { Feather, User, Copy, Check, Volume2, Square } from "lucide-react";

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onQuickStart?: () => void;
  speakingId?: string | null;
  onSpeak?: (text: string, id: string) => void;
  onStopSpeaking?: () => void;
}

export function MessageList({
  messages,
  isLoading,
  onQuickStart,
  speakingId,
  onSpeak,
  onStopSpeaking,
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
            {(() => {
              const isCurrentSpeaking = speakingId === msg.id;
              return (
                <div
                  className={`relative group max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed transition-all ${
                    isUser
                      ? "bg-brand-900 text-brand-50 rounded-tr-none shadow-sm whitespace-pre-wrap"
                      : isCurrentSpeaking
                      ? "bg-amber-50/40 text-brand-950 border border-amber-300 ring-2 ring-amber-200/60 rounded-tl-none shadow-md font-sans"
                      : "bg-white text-brand-950 border border-brand-200/90 rounded-tl-none shadow-sm font-sans"
                  }`}
                >
                  {/* 本文 */}
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {/* AIメッセージのアクションバー（本文下部に配置し重なりを解消） */}
                  {!isUser && (
                    <div className="flex items-center justify-end gap-1.5 pt-2 mt-2 border-t border-brand-100/70 text-xs text-brand-600">
                      {/* 読み上げ / 停止ボタン */}
                      {onSpeak && (
                        <button
                          type="button"
                          onClick={() => {
                            if (isCurrentSpeaking) {
                              onStopSpeaking?.();
                            } else {
                              onSpeak(msg.content, msg.id);
                            }
                          }}
                          className={`px-2 py-1 rounded-md text-[11px] flex items-center gap-1 transition-colors ${
                            isCurrentSpeaking
                              ? "bg-amber-200 text-amber-900 font-semibold shadow-xs"
                              : "hover:bg-brand-100 text-brand-600 hover:text-brand-900"
                          }`}
                          title={
                            isCurrentSpeaking
                              ? "読み上げを停止"
                              : "このメッセージを読み上げ"
                          }
                        >
                          {isCurrentSpeaking ? (
                            <>
                              <Square className="w-3 h-3 fill-current text-amber-800 animate-pulse" />
                              <span>停止</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>再生</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* コピーボタン */}
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="px-2 py-1 rounded-md text-[11px] flex items-center gap-1 hover:bg-brand-100 text-brand-600 hover:text-brand-900 transition-colors"
                        title="メッセージをコピー"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-green-700" />
                            <span className="text-green-700 font-medium">コピー済</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>コピー</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
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
