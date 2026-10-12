import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HON-NEo（ホンネヲ）｜対話型人生編集者",
  description: "対話を通して、あなた自身の本音と7つの物語・3つの問いを編集します。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased selection:bg-brand-200">{children}</body>
    </html>
  );
}
