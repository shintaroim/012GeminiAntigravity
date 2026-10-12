# HON-NEo（ホンネヲ）｜対話型人生編集者 Webアプリ

HON-NEoは、利用者が自身の人生経験・感情・選択から本音を見つけ、次の3つの成果物を手元に残す対話体験を提供するWebサービスです。

1. **MY 7 STORIES**（私をつくった7つの物語）
2. **MY 3 COMPASS**（迷ったときに戻れる3つの問い）
3. **BOOK SEED**（一冊の土台となる原稿）

---

## 🛠 技術スタック
- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS
- **Validation:** Zod
- **Testing:** Vitest
- **AI Integration:** 交換可能な `AIProvider` 抽象化レイヤー

---

## 🚀 開発環境のセットアップ

### 1. 依存パッケージのインストール
```bash
npm install
```

### 2. 環境変数の設定
`.env.example` をコピーして `.env.local` を作成します。
```bash
cp .env.example .env.local
```
初期状態では `AI_PROVIDER=mock` が指定されており、外部APIキーなしでUIや対話フローの検証が可能です。

### 3. 開発サーバーの起動
```bash
npm run dev
```
ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

### 4. チェック・テスト
```bash
# 型チェック
npm run typecheck

# Lintチェック
npm run lint

# テスト実行
npm run test
```

---

## 📚 ドキュメント構成
- [AGENTS.md](AGENTS.md): 開発AI向けガイドライン・設計原則
- [docs/01-requirements.md](docs/01-requirements.md): 要件定義書
- [docs/02-system-design.md](docs/02-system-design.md): システム設計書
- [docs/03-coding-agent-brief.md](docs/03-coding-agent-brief.md): 実装指示書
- [docs/source-prompt-v1.0.md](docs/source-prompt-v1.0.md): 元プロンプト（正本）
- [docs/decisions/](docs/decisions/): アーキテクチャ決定記録 (ADR)
