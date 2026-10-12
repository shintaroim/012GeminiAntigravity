"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Compass, Feather, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";

export function BrandHero() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartChat = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        throw new Error("セッションの開始に失敗しました。");
      }

      const data = await res.json();
      // 再開トークンをブラウザローカルストレージに安全に保管
      if (typeof window !== "undefined" && data.resumeToken) {
        localStorage.setItem(`honneo_token_${data.sessionId}`, data.resumeToken);
      }

      router.push(`/chat/${data.sessionId}`);
    } catch (err) {
      console.error(err);
      setError("対話の準備中に問題が発生しました。もう一度お試しください。");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-12 sm:py-20 flex flex-col items-center text-center">
      {/* バッジ */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium tracking-widest text-brand-800 bg-brand-100 mb-6">
        <Feather className="w-3.5 h-3.5" />
        対話型人生編集者
      </div>

      {/* メインタイトル */}
      <h1 className="text-4xl sm:text-6xl font-serif font-semibold tracking-tight text-brand-950 mb-6">
        HON-NEo
      </h1>

      {/* 思想ステートメント */}
      <p className="text-lg sm:text-xl text-brand-900 font-serif leading-relaxed max-w-2xl mb-4">
        本を書くために、本音を探すのではありません。<br className="hidden sm:inline" />
        本音に出会うために、人生を言葉にします。
      </p>
      <p className="text-sm sm:text-base text-brand-700 max-w-xl leading-relaxed mb-10">
        HON-NEoにおける「本音」とは、唯一絶対の正解ではなく、<br className="hidden sm:inline" />
        <strong>「今の私が、自分で選んだ、今の答え」</strong>です。<br />
        人生のハンドルは、常にあなたが握ります。
      </p>

      {/* 開始ボタン */}
      <div className="mb-14">
        <button
          onClick={handleStartChat}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-8 py-4 bg-brand-900 hover:bg-brand-950 text-brand-50 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200 text-base disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              対話の準備中...
            </>
          ) : (
            <>
              対話を始める
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
      </div>

      {/* 30日後に手元に残す3つのもの */}
      <div className="w-full mb-16 text-left">
        <h2 className="text-xs font-semibold tracking-widest text-brand-700 uppercase text-center mb-8">
          30日後に手元に残す3つのもの
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/80 backdrop-blur-sm border border-brand-200/80 rounded-2xl p-6 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-800 flex items-center justify-center mb-4">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-semibold text-brand-950 mb-2">
              ① MY 7 STORIES
            </h3>
            <p className="text-xs text-brand-600 font-medium mb-3">私をつくった7つの物語</p>
            <p className="text-sm text-brand-700 leading-relaxed">
              世間的にすごい実績ではなく、今のあなたをつくった7つの出来事を、固有のタイトルをつけた物語へ編集します。
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border border-brand-200/80 rounded-2xl p-6 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-800 flex items-center justify-center mb-4">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-semibold text-brand-950 mb-2">
              ② MY 3 COMPASS
            </h3>
            <p className="text-xs text-brand-600 font-medium mb-3">迷ったときに戻れる3つの問い</p>
            <p className="text-sm text-brand-700 leading-relaxed">
              物語を横断して見えた固有の価値観。迷ったときに自分へ投げかける「問い」の形まで言葉にします。
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border border-brand-200/80 rounded-2xl p-6 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-800 flex items-center justify-center mb-4">
              <Feather className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-semibold text-brand-950 mb-2">
              ③ BOOK SEED
            </h3>
            <p className="text-xs text-brand-600 font-medium mb-3">一冊の土台となる原稿</p>
            <p className="text-sm text-brand-700 leading-relaxed">
              7つの物語、3つのCOMPASS、人生の再定義文をまとめたもの。この先、一冊の本へ育てていける土台です。
            </p>
          </div>
        </div>
      </div>

      {/* 安心して話すための約束 */}
      <div className="w-full max-w-2xl bg-brand-100/60 border border-brand-200 rounded-2xl p-6 text-left">
        <div className="flex items-center gap-2 mb-3 text-brand-900 font-medium text-sm">
          <ShieldCheck className="w-5 h-5 text-brand-700" />
          安心して話していただくための約束
        </div>
        <ul className="text-xs sm:text-sm text-brand-800 space-y-2 leading-relaxed">
          <li>・ 最初から「本にする話」を綺麗にまとめる必要はありません。</li>
          <li>・ 個人情報保護のため、お名前や住所、勤務先などの固有名詞は入力不要です。</li>
          <li>・ 「違う」「今は決めたくない」「わからない」も大切な本音の答えです。</li>
          <li>・ 本サービスは医療やカウンセリングの代替ではありません。安全を最優先します。</li>
        </ul>
      </div>
    </div>
  );
}
