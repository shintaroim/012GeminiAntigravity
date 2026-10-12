# AGENTS.md — HON-NEo 開発AI向けガイドライン

本ファイルは、HON-NEo独立Webアプリの開発に参加するAIコーディングアシスタント（Claude Code, Codex, Antigravity等）のためのガイドラインです。

---

## 1. プロジェクトの目的と概要
HON-NEo（ホンネヲ）は、「対話型人生編集者」として、利用者の人生経験・感情・選択から本音を見つけ、次の3つの成果物を手元に残す対話体験を提供するWebサービスです。
1. **MY 7 STORIES**（私をつくった7つの物語）
2. **MY 3 COMPASS**（迷ったときに戻れる3つの問い）
3. **BOOK SEED**（一冊の土台となる原稿）

Gemini Gemのカスタム指示に依存せず、専用Webサイト・独立URLでMVPを提供することを目的とします。

---

## 2. 絶対遵守の設計・実装原則
1. **元プロンプトの保全と尊重:**
   - 正本は `docs/source-prompt-v1.0.md` に保管されています。
   - プロンプトを機能別に分割する場合でも、意味的な改変・ルールの抜け漏れを絶対に発生させないこと。
2. **本人の言葉とAIの解釈の厳格な分離:**
   - 本人の発言原文（Verbatim Quote）、AIの観察（Observation）、AIの仮説（Hypothesis）、本人が否定した解釈（Rejected Words）、本人の承認内容（Approved）を区別して保持すること。
   - AIが利用者の人生や価値観を勝手に断定しないこと。
3. **セキュリティと秘密情報の隠蔽:**
   - AI APIキー、システムプロンプト、内部状態・メモを絶対にブラウザに露出しないこと。
   - セッションIDのみで他人の会話を閲覧・操作できないように、安全な再開トークン検証を行うこと。
4. **利用量上限と安全対策:**
   - 公開URLで利用可能な前提のため、レート制限、入力文字数・トークン上限、セッションターン数上限を設けること。
   - 強い苦痛や自傷リスクが示された場合は、深掘りを中止して安全と専門窓口への相談を優先すること。
5. **段階的開発とテスト駆動:**
   - 1回の作業で大規模な変更を一気に行わず、各フェーズ・各タスクごとに検証・テストを行うこと。
   - 未実装の機能を「実装済み」と偽らないこと。

---

## 3. ドキュメント構成
- `docs/01-requirements.md`: 要件定義書
- `docs/02-system-design.md`: システム設計書
- `docs/03-coding-agent-brief.md`: 実装指示書
- `docs/source-prompt-v1.0.md`: 元プロンプト（正本）
- `docs/decisions/`: ADR（Architecture Decision Records）

---

## 4. 進行フェーズ
- **Phase 0:** 開発基盤（Next.js App Router, TypeScript, ESLint, Vitest, .env.example, README）
- **Phase 1:** ブランドページとチャットUI（モックAI応答含む）
- **Phase 2:** セッションとデータアクセス層（匿名セッション、ハッシュトークン、メッセージ保存）
- **Phase 3:** AIプロバイダー抽象化とサーバー側プロンプトローダー
- **Phase 4:** 構造化状態管理（SessionState、スキーマ検証、原文・仮説・承認・却下語の分離）
- **Phase 5:** プログラム進行制御（フェーズ遷移、各コマンド処理）
- **Phase 6:** 保存・エクスポート（Markdownコピー＆ダウンロード）
- **Phase 7:** 公開準備（レートリミット、利用量制限、プロンプト回帰テスト、プライバシー案内）

---

## 5. コーディング規約
- TypeScript Strictモードを維持。`any` の安易な使用を禁止。
- データの境界（APIリクエスト、AI出力JSON、DB入出力）ではZod等によるバリデーションを行う。
- AIプロバイダー固有の型をUIやドメインロジックに漏出させない（`AIProvider` インターフェース経由）。
- ログに個人情報、会話本文、APIキー、セッショントークンを出力しない。

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
