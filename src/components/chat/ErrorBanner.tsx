"use client";

import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

interface ErrorBannerProps {
  error: string;
  onRetry: () => void;
  onDismiss: () => void;
}

export function ErrorBanner({ error, onRetry, onDismiss }: ErrorBannerProps) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-900 px-4 py-3 rounded-xl mx-4 my-2 flex items-center justify-between gap-3 text-xs max-w-3xl mx-auto shadow-sm">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
        <span>{error}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          再試行
        </button>
        <button
          onClick={onDismiss}
          className="text-red-600 hover:text-red-800 p-1 font-bold text-sm"
          title="閉じる"
        >
          ×
        </button>
      </div>
    </div>
  );
}
