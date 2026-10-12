"use client";

import React, { useState, useEffect } from "react";
import { Copy, Download, Check, X, FileText, BookOpen, Layers } from "lucide-react";
import { ExportType } from "@/lib/export/export-markdown";

interface ExportModalProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({ sessionId, isOpen, onClose }: ExportModalProps) {
  const [activeType, setActiveType] = useState<ExportType>("book_seed");
  const [markdown, setMarkdown] = useState<string>("");
  const [filename, setFilename] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getToken = (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(`honneo_token_${sessionId}`);
  };

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function fetchExportData() {
      setIsLoading(true);
      setError(null);
      const token = getToken();

      try {
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(
          `/api/sessions/${sessionId}/export?type=${activeType}&format=json`,
          { headers }
        );

        if (!res.ok) {
          throw new Error("エクスポートデータの取得に失敗しました。");
        }

        const data = await res.json();
        if (isMounted) {
          setMarkdown(data.markdown);
          setFilename(data.filename);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "取得エラー");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchExportData();

    return () => {
      isMounted = false;
    };
  }, [sessionId, activeType, isOpen]);

  const handleCopy = async () => {
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("クリップボードへのコピーに失敗しました。");
    }
  };

  const handleDownload = () => {
    const token = getToken();
    const url = `/api/sessions/${sessionId}/export?type=${activeType}&format=download&token=${encodeURIComponent(
      token || ""
    )}`;
    window.open(url, "_blank");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-brand-200">
        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-200/80">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-brand-800" />
            <h2 className="font-serif font-semibold text-brand-950 text-base">
              成果物の保存・エクスポート
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-brand-500 hover:text-brand-900 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* タブ選択 */}
        <div className="flex border-b border-brand-100 px-6 bg-brand-50/50">
          <button
            onClick={() => setActiveType("book_seed")}
            className={`flex items-center gap-1.5 py-3 px-4 text-xs font-medium border-b-2 transition-colors ${
              activeType === "book_seed"
                ? "border-brand-900 text-brand-950"
                : "border-transparent text-brand-600 hover:text-brand-900"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            BOOK SEED
          </button>
          <button
            onClick={() => setActiveType("tatakidai")}
            className={`flex items-center gap-1.5 py-3 px-4 text-xs font-medium border-b-2 transition-colors ${
              activeType === "tatakidai"
                ? "border-brand-900 text-brand-950"
                : "border-transparent text-brand-600 hover:text-brand-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            「話す」のたたき台
          </button>
          <button
            onClick={() => setActiveType("full")}
            className={`flex items-center gap-1.5 py-3 px-4 text-xs font-medium border-b-2 transition-colors ${
              activeType === "full"
                ? "border-brand-900 text-brand-950"
                : "border-transparent text-brand-600 hover:text-brand-900"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            全対話ログ
          </button>
        </div>

        {/* コンテンツプレビュー */}
        <div className="flex-1 overflow-y-auto p-6 bg-brand-50/20">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-brand-600">
              Markdownを生成しています...
            </div>
          ) : error ? (
            <div className="text-sm text-red-600 py-6 text-center">{error}</div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-brand-500">
                <span>ファイル名: {filename}</span>
                <span>文字数: {markdown.length} 文字</span>
              </div>
              <pre className="p-4 bg-white border border-brand-200 rounded-xl text-xs font-mono text-brand-900 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto shadow-inner selection:bg-brand-200">
                {markdown}
              </pre>
            </div>
          )}
        </div>

        {/* モーダルフッター */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-brand-200/80 bg-white">
          <p className="text-[11px] text-brand-600">
            Markdownファイル (.md) としてスマホやPCに保存できます。
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={isLoading || !markdown}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-100 hover:bg-brand-200 text-brand-900 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-700" />
                  コピー完了
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Markdownをコピー
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              disabled={isLoading || !markdown}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-900 hover:bg-brand-950 text-white rounded-xl text-xs font-medium transition-colors disabled:opacity-50 shadow-sm"
            >
              <Download className="w-4 h-4" />
              ダウンロード
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
