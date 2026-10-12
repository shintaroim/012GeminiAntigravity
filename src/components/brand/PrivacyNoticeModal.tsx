"use client";

import React from "react";
import { ShieldCheck, X, Clock, Trash2, Lock, HeartHandshake } from "lucide-react";

interface PrivacyNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyNoticeModal({ isOpen, onClose }: PrivacyNoticeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-brand-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-200/80">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-800" />
            <h2 className="font-serif font-semibold text-brand-950 text-base">
              プライバシーと利用上のご案内
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-brand-500 hover:text-brand-900 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-brand-800 leading-relaxed">
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-brand-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-brand-950 mb-1">保存期間について</h3>
              <p>
                あなたの対話データは、作業を継続できるよう最長90日間保持されます。90日を過ぎると自動的に消去されます。
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Lock className="w-4 h-4 text-brand-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-brand-950 mb-1">アクセス保護と暗号化</h3>
              <p>
                ブラウザごとに発行される推測不可能な秘密の再開キー（ハッシュ化して保管）によって保護されています。URLやセッションIDが漏洩しても、他者があなたの会話を閲覧することはできません。
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Trash2 className="w-4 h-4 text-brand-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-brand-950 mb-1">いつでも完全削除が可能</h3>
              <p>
                チャット画面右上のゴミ箱ボタンから、いつでもご自身の会話・成果物データを即座に完全削除できます。
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <HeartHandshake className="w-4 h-4 text-brand-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-brand-950 mb-1">安全と医療・相談窓口について</h3>
              <p>
                HON-NEoは医療や心理療法の代替ではありません。対話中に強い苦痛や危うさを感じた場合は無理をなさらず、身近な信頼できる方や専門の医療機関・公的相談窓口にご相談ください。
              </p>
            </div>
          </div>

          <div className="p-3 bg-brand-50 border border-brand-200/60 rounded-xl text-[11px] text-brand-700">
            ※ ご自身やお知り合いのプライバシーを守るため、実名・詳細な住所・勤務先名などの個人情報は入力せずに対話をお進めください。
          </div>
        </div>

        <div className="px-6 py-4 border-t border-brand-200/80 bg-brand-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-brand-900 hover:bg-brand-950 text-white rounded-xl text-xs font-medium transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
