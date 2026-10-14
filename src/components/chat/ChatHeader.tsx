"use client";

import React, { useState } from "react";
import { ArrowLeft, Trash2, Shield, Info, Download } from "lucide-react";
import { ProgramPhase } from "@/types";
import { VoiceModeToggle } from "./VoiceModeToggle";

interface ChatHeaderProps {
  sessionId: string;
  phase: ProgramPhase;
  turnCount: number;
  onDeleteSession?: () => void;
  onOpenExport?: () => void;
  isVoiceMode?: boolean;
  isSpeaking?: boolean;
  isVoiceSupported?: boolean;
  onToggleVoiceMode?: () => void;
  onStopSpeaking?: () => void;
}

const PHASE_LABELS: Record<ProgramPhase, { title: string; desc: string }> = {
  speak: { title: "WEEK 1｜話す", desc: "素材を集める対話" },
  rest: { title: "WEEK 2｜寝かせる", desc: "日常で感じる期間" },
  refine: { title: "WEEK 3｜整える", desc: "7つと3つを編集" },
  book_seed: { title: "WEEK 4｜確かめる", desc: "土台原稿の確認" },
};

export function ChatHeader({
  sessionId,
  phase,
  turnCount,
  onDeleteSession,
  onOpenExport,
  isVoiceMode = false,
  isSpeaking = false,
  isVoiceSupported = true,
  onToggleVoiceMode,
  onStopSpeaking,
}: ChatHeaderProps) {
  const [showInfo, setShowInfo] = useState(false);
  const phaseInfo = PHASE_LABELS[phase] || PHASE_LABELS.speak;

  return (
    <header className="sticky top-0 z-20 w-full bg-white/95 backdrop-blur-md border-b border-brand-200/80 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <a
          href="/"
          className="p-2 text-brand-700 hover:text-brand-950 hover:bg-brand-100 rounded-xl transition-colors shrink-0"
          title="トップに戻る"
        >
          <ArrowLeft className="w-5 h-5" />
        </a>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="font-serif font-bold text-sm sm:text-base text-brand-950 truncate">HON-NEo</h1>
            <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-brand-100 text-brand-800 font-medium shrink-0">
              {phaseInfo.title}
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-brand-600 truncate">
            {phaseInfo.desc} • ターン {turnCount}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {onToggleVoiceMode && (
          <VoiceModeToggle
            enabled={isVoiceMode}
            isSpeaking={isSpeaking}
            isSupported={isVoiceSupported}
            onToggle={onToggleVoiceMode}
            onStopSpeaking={onStopSpeaking || (() => {})}
          />
        )}

        {onOpenExport && (
          <button
            onClick={onOpenExport}
            className="p-2 text-brand-800 hover:text-brand-950 hover:bg-brand-100 rounded-lg transition-colors text-xs flex items-center gap-1 font-medium"
            title="成果物を保存・エクスポート"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">保存</span>
          </button>
        )}

        <button
          onClick={() => setShowInfo(!showInfo)}
          className="p-2 text-brand-700 hover:text-brand-900 hover:bg-brand-100 rounded-lg transition-colors text-xs flex items-center gap-1"
          title="セッション情報"
        >
          <Info className="w-4 h-4" />
        </button>

        {onDeleteSession && (
          <button
            onClick={onDeleteSession}
            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            title="会話を削除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* セッション情報ダイアログ */}
      {showInfo && (
        <div className="absolute top-full right-4 mt-2 w-80 bg-white border border-brand-200 rounded-xl shadow-lg p-4 text-left z-30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 font-medium text-xs text-brand-900">
              <Shield className="w-4 h-4 text-brand-700" />
              セッション保護情報
            </div>
            <button
              onClick={() => setShowInfo(false)}
              className="text-brand-500 hover:text-brand-800 text-xs"
            >
              閉じる
            </button>
          </div>
          <p className="text-[11px] text-brand-700 leading-relaxed mb-3">
            この会話はランダムな再開トークンによって保護されています。同じブラウザからは自動的に再開できます。
          </p>
          <div className="text-[10px] text-brand-600 bg-brand-50 p-2 rounded border border-brand-100 font-mono break-all">
            セッションID: {sessionId}
          </div>
        </div>
      )}
    </header>
  );
}
