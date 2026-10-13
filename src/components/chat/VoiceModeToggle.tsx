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
        className="px-2 py-1 text-[11px] text-brand-400 bg-brand-50 rounded-lg cursor-not-allowed opacity-60 hidden sm:flex items-center gap-1"
        title="お使いのブラウザは音声読み上げに対応していません"
      >
        <VolumeX className="w-3.5 h-3.5" />
        <span>音声非対応</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {/* 読み上げ中の中断クイックボタン */}
      {isSpeaking && (
        <button
          type="button"
          onClick={onStopSpeaking}
          className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg flex items-center gap-1 animate-pulse transition-colors"
          title="読み上げを停止"
        >
          <Square className="w-3 h-3 fill-current" />
          <span className="hidden sm:inline">停止</span>
        </button>
      )}

      {/* 音声モードON/OFFトグル */}
      <button
        type="button"
        onClick={onToggle}
        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
          enabled
            ? "bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100 shadow-xs"
            : "bg-transparent border-transparent text-brand-700 hover:text-brand-900 hover:bg-brand-100"
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
              <Volume2 className="w-4 h-4 text-amber-700" />
              {isSpeaking && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600"></span>
                </span>
              )}
            </div>
            <span className="hidden md:inline font-semibold">音声モード ON</span>
          </>
        ) : (
          <>
            <VolumeX className="w-4 h-4 opacity-60" />
            <span className="hidden md:inline">音声モード OFF</span>
          </>
        )}
      </button>
    </div>
  );
}
