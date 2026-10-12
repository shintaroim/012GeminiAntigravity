"use client";

import React, { useState } from "react";
import { PrivacyNoticeModal } from "./PrivacyNoticeModal";
import { Shield } from "lucide-react";

export function BrandFooter() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <footer className="w-full px-6 py-6 text-center text-xs text-brand-600 border-t border-brand-200/60 bg-white/40 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-5xl mx-auto">
        <p>© HON-NEo. Be True, Be Free.</p>
        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1.5 text-brand-700 hover:text-brand-950 font-medium transition-colors"
        >
          <Shield className="w-3.5 h-3.5" />
          プライバシーと利用案内
        </button>
      </footer>

      <PrivacyNoticeModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
