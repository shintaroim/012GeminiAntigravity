"use client";

import React from "react";
import { Volume2, VolumeX, Square } from "lucide-react";

interface VoiceModeToggleProps {
  enabled: boolean;
  isSpeaking: boolean;
  isSupported: boolean;
  onToggle: () => void;
  onStopSpeaking: () => void;
}

export function VoiceModeToggle({
  enabled,
  isSpeaking,
  isSupported,
  onToggle,
  onStopSpeaking,
}: VoiceModeToggleProps) {
  if (!isSupported) {
    return (
      <div
        className="px-2.5 py-1.5 text-xs text-brand-400 bg-brand-50 rounded-xl cursor-not-allowed opacity-60 flex items-center gap-1 border border-brand-200/50"
        title="お使いのブラウザは音声読み上げに対応していません"
      >
        <VolumeX className="w-4 h-4" />
        <span className="text-[11px]">音声非対応</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* 読み上げ中の中断クイックボタン */}
      {isSpeaking && (
        <button
          type="button"
          onClick={onStopSpeaking}
          className="h-10 px-3 text-xs font-semibold text-red-700 bg-red-100/90 hover:bg-red-200 border border-red-300 rounded-xl flex items-center gap-1.5 animate-pulse transition-all shadow-xs active:scale-95 touch-manipulation"
          title="読み上げを停止"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          <span>停止</span>
        </button>
      )}

      {/* 音声モードON/OFFトグル（スマホでも大きく分かりやすい設計） */}
      <button
        type="button"
        onClick={onToggle}
        className={`h-10 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 border active:scale-95 touch-manipulation ${
          enabled
            ? "bg-amber-100 border-amber-400 text-amber-950 shadow-xs font-semibold ring-1 ring-amber-300/60"
            : "bg-brand-50/80 border-brand-200 text-brand-700 hover:text-brand-950 hover:bg-brand-100"
        }`}
        title={
          enabled
            ? "音声モード ON（AIの回答を自動で読み上げます）クリックでOFF"
            : "音声モード OFF（クリックでONにするとAI回答を自動読み上げ）"
        }
      >
        {enabled ? (
          <>
            <div className="relative flex items-center justify-center">
              <Volume2 className="w-4.5 h-4.5 text-amber-800" />
              {isSpeaking && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-700"></span>
                </span>
              )}
            </div>
            <span className="font-semibold text-xs sm:text-sm tracking-tight text-amber-950">
              音声 ON
            </span>
          </>
        ) : (
          <>
            <VolumeX className="w-4.5 h-4.5 text-brand-500" />
            <span className="text-xs sm:text-sm tracking-tight text-brand-700">
              音声 OFF
            </span>
          </>
        )}
      </button>
    </div>
  );
}
