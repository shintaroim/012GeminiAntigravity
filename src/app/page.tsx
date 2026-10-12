import React from "react";
import { BrandHero } from "@/components/brand/BrandHero";
import { BrandFooter } from "@/components/brand/BrandFooter";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col justify-between">
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-brand-200/60 bg-white/40 backdrop-blur-sm">
        <div className="font-serif font-bold text-lg text-brand-950 tracking-wider">
          HON-NEo
        </div>
        <div className="text-xs text-brand-700 font-medium">
          対話型人生編集者
        </div>
      </header>

      <BrandHero />

      <BrandFooter />
    </main>
  );
}
