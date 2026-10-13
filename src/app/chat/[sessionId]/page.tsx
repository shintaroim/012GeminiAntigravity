"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { ErrorBanner } from "@/components/chat/ErrorBanner";
import { ExportModal } from "@/components/chat/ExportModal";
import { ChatMessage, ProgramPhase } from "@/types";
import { useSpeechSynthesis } from "@/lib/speech/useSpeechSynthesis";

interface ChatPageProps {
  params: Promise<{ sessionId: string }>;
}

export default function ChatPage({ params }: ChatPageProps) {
  const router = useRouter();
  const { sessionId } = use(params);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [phase, setPhase] = useState<ProgramPhase>("speak");
  const [turnCount, setTurnCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [isVoiceMode, setIsVoiceMode] = useState<boolean>(false);

  const {
    isSupported,
    isSpeaking,
    speakingId,
    speak,
    cancel,
  } = useSpeechSynthesis();

  // 音声モードのトグル（常に初期状態はOFF。ユーザーがクリックしたときのみON/OFF切り替え）
  const handleToggleVoiceMode = () => {
    setIsVoiceMode((prev) => {
      const next = !prev;
      if (!next) {
        cancel();
      }
      return next;
    });
  };

  const getToken = (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(`honneo_token_${sessionId}`);
  };

  // セッション初期読み込み
  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      setIsInitializing(true);
      setError(null);
      const token = getToken();

      if (!token) {
        if (isMounted) {
          setError("セッションの再開キーが見つかりません。トップページから新しく開始してください。");
          setIsInitializing(false);
        }
        return;
      }

      try {
        const headers: Record<string, string> = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(`/api/sessions/${sessionId}`, { headers });
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("セッションが見つかりません。トップページから新しく開始してください。");
          }
          throw new Error("セッション情報の取得に失敗しました。");
        }

        const data = await res.json();
        if (isMounted) {
          setPhase(data.phase || "speak");
          setTurnCount(data.turnCount || 0);
          setMessages(data.messages || []);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "読み込みエラーが発生しました。");
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    }

    loadSession();

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  // メッセージ送信
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    // 新規発言時は進行中の読み上げを中断
    cancel();

    setError(null);
    setLastFailedMessage(null);
    setIsLoading(true);

    const tempUserMsgId = `temp-${Date.now()}`;
    const optimisticUserMsg: ChatMessage = {
      id: tempUserMsgId,
      sessionId,
      role: "user",
      content: text,
      sequenceNo: messages.length + 1,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUserMsg]);

    const token = getToken();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          sessionId,
          message: text,
          resumeToken: token || undefined,
        }),
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "メッセージの送信に失敗しました。");
      }

      const data = await res.json();

      // AI応答を追加
      setMessages((prev) => [...prev, data.message]);
      setPhase(data.phase);
      setTurnCount(data.turnCount);

      // 音声モードがONの場合は自動読み上げを開始
      if (isVoiceMode && data.message?.content) {
        speak(data.message.content, data.message.id);
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      console.error(err);
      const isTimeout = err instanceof Error && err.name === "AbortError";
      setError(
        isTimeout
          ? "AIの応答待機時間がタイムアウトしました。通信環境を確認し、再試行してください。"
          : err instanceof Error
          ? err.message
          : "送信に失敗しました。再試行してください。"
      );
      setLastFailedMessage(text);
      // 失敗したメッセージを一覧から除去（再試行時に再追加するため）
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsgId));
    } finally {
      setIsLoading(false);
    }
  };

  // 再試行
  const handleRetry = () => {
    if (lastFailedMessage) {
      handleSendMessage(lastFailedMessage);
    }
  };

  // セッション削除
  const handleDeleteSession = async () => {
    if (!confirm("この会話を削除してもよろしいですか？（削除すると復元できません）")) {
      return;
    }

    const token = getToken();
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
        headers,
      });

      if (res.ok) {
        if (typeof window !== "undefined") {
          localStorage.removeItem(`honneo_token_${sessionId}`);
        }
        router.push("/");
      } else {
        alert("セッションの削除に失敗しました。");
      }
    } catch (err) {
      console.error(err);
      alert("削除中にエラーが発生しました。");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-brand-50/30">
      <ChatHeader
        sessionId={sessionId}
        phase={phase}
        turnCount={turnCount}
        onDeleteSession={handleDeleteSession}
        onOpenExport={() => setIsExportOpen(true)}
        isVoiceMode={isVoiceMode}
        isSpeaking={isSpeaking}
        isVoiceSupported={isSupported}
        onToggleVoiceMode={handleToggleVoiceMode}
        onStopSpeaking={cancel}
      />

      {error && (
        <ErrorBanner
          error={error}
          onRetry={handleRetry}
          onDismiss={() => setError(null)}
        />
      )}

      {isInitializing ? (
        <div className="flex-1 flex items-center justify-center text-sm text-brand-600">
          対話環境を読み込んでいます...
        </div>
      ) : (
        <MessageList
          messages={messages}
          isLoading={isLoading}
          onQuickStart={() => handleSendMessage("ほんね")}
          speakingId={speakingId}
          onSpeak={(content, id) => speak(content, id)}
          onStopSpeaking={cancel}
        />
      )}

      <ChatInput
        onSendMessage={handleSendMessage}
        isLoading={isLoading || isInitializing}
      />

      <ExportModal
        sessionId={sessionId}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
}
