# HON-NEo 独立Webアプリ システム設計書
**版:** v0.1  
**作成日:** 2026-10-12  
**前提:** 要件定義書 v0.1に基づく初期設計。技術選定はMVP向けの推奨案であり、運用環境に応じて差し替え可能とする。

---

## 1. 推奨アーキテクチャ

### 1.1 技術構成
- **Webアプリ:** Next.js（App Router） + TypeScript
- **UI:** React + CSS/Tailwind CSS
- **入力検証:** Zod等のスキーマバリデーション
- **DB:** PostgreSQL
- **DB／匿名セッション基盤:** Supabase等を候補とする。特定サービスにロックインしないようデータアクセス層を分離する
- **AI:** サーバーサイドのAIプロバイダーアダプター（初期プロバイダーは環境変数で指定）
- **テスト:** Vitest等 + Playwright等のE2Eテスト
- **開発:** VS Code + Git、Codex／Claude Codeなど

### 1.2 論理構成
```text
Browser
  └─ Brand page / Chat UI
       └─ Next.js Route Handler（入力検証・認可・レート制限）
            ├─ Session Service
            ├─ Conversation Service
            ├─ Prompt Loader（サーバー側のMarkdown）
            ├─ State Manager（構造化された進行状態）
            ├─ AI Provider Adapter
            │    └─ AI API
            └─ Repository / PostgreSQL
```

### 1.3 設計原則
1. **プロンプトとプログラムを分離する。** 会話方針はMarkdown、状態遷移や認可はコードで実装する。
2. **AIに状態管理を丸投げしない。** AIの文章とは別に、アプリが状態を構造化して保持する。
3. **本人の言葉とAIの解釈を分離する。** Original／Observation／Hypothesis／Rejected／Approvedを混同しない。
4. **サーバー側を信頼境界にする。** APIキー、システム指示、内部メモをクライアントへ送らない。
5. **会話履歴を無制限に毎回送らない。** 直近の会話と圧縮要約・構造化状態を組み合わせる。
6. **プロバイダー交換を可能にする。** UIや会話状態ロジックをAI SDK固有の型に依存させない。

---

## 2. リポジトリ構成案

```text
hon-neo/
├─ AGENTS.md
├─ README.md
├─ .env.example
├─ package.json
├─ docs/
│  ├─ 01-requirements.md
│  ├─ 02-system-design.md
│  ├─ 03-coding-agent-brief.md
│  ├─ decisions/
│  └─ test-plan.md
├─ prompts/
│  ├─ system.md
│  ├─ philosophy.md
│  ├─ conversation-rules.md
│  ├─ phases/
│  │  ├─ speak.md
│  │  ├─ rest.md
│  │  ├─ refine.md
│  │  └─ book-seed.md
│  ├─ output-formats.md
│  ├─ safety.md
│  └─ prompt-version.json
├─ knowledge/
│  └─ README.md
├─ src/
│  ├─ app/
│  │  ├─ page.tsx
│  │  ├─ chat/[sessionId]/page.tsx
│  │  ├─ api/sessions/route.ts
│  │  ├─ api/chat/route.ts
│  │  ├─ api/sessions/[sessionId]/route.ts
│  │  └─ api/sessions/[sessionId]/export/route.ts
│  ├─ components/
│  │  ├─ chat/
│  │  ├─ brand/
│  │  └─ artifacts/
│  ├─ lib/
│  │  ├─ ai/
│  │  │  ├─ provider.ts
│  │  │  └─ provider-factory.ts
│  │  ├─ prompts/
│  │  │  └─ load-prompts.ts
│  │  ├─ sessions/
│  │  ├─ conversations/
│  │  ├─ state/
│  │  ├─ security/
│  │  └─ validation/
│  └─ types/
├─ db/
│  ├─ schema.sql
│  └─ migrations/
└─ tests/
   ├─ unit/
   ├─ integration/
   ├─ e2e/
   └─ prompt-regression/
```

### 2.1 プロンプト分割方針
元の「7 STORIES｜3 COMPASS 対話プロンプト」を正本として保管し、運用上の読みやすさのために次のファイルへ分割する。
- `system.md`: 役割、目的、30日後の成果物、禁止事項の要約
- `philosophy.md`: 本音の定義、本人が人生のハンドルを握るという原則
- `conversation-rules.md`: 1ターン1問、原文保持、反証、称賛抑制など
- `phases/*.md`: 話す／寝かせる／整える／BOOK SEED
- `output-formats.md`: まとめログ、たたき台、物語フォーマット、COMPASS、BOOK SEED
- `safety.md`: 個人情報、話したくないテーマ、強い苦痛への対応
- `prompt-version.json`: バージョン、更新日、変更概要

**重要:** 分割時に要約でルールを落とさない。元プロンプト全文を `docs/source-prompt-v1.0.md` として保管し、分割版との照合を行う。

---

## 3. 会話状態モデル

### 3.1 基本状態
```ts
type ProgramPhase = "speak" | "rest" | "refine" | "book_seed";

type ContentStatus =
  | "candidate"
  | "hypothesis"
  | "rejected"
  | "approved"
  | "archived";
```

### 3.2 セッション状態の概念モデル
```ts
interface SessionState {
  phase: ProgramPhase;
  turnCount: number;
  lastSummaryTurn: number;
  summary: string | null;
  episodes: Episode[];
  verbatimQuotes: VerbatimQuote[];
  themes: ThemeObservation[];
  valueHypotheses: ValueHypothesis[];
  rejectedWords: RejectedInterpretation[];
  unresolvedItems: UnresolvedItem[];
  storyCandidates: StoryCandidate[];
  compassCandidates: CompassCandidate[];
  approvedStories: ApprovedStory[];
  approvedCompasses: ApprovedCompass[];
  lifeRedefinition: ApprovalRecord | null;
  completionConfirmed: boolean;
}
```

### 3.3 データの意味を分離する
- `VerbatimQuote`: 利用者が実際に入力した原文。引用元のメッセージIDを持つ。
- `Observation`: 会話から観察できる事実。解釈を混ぜない。
- `Hypothesis`: AIが提示する暫定的な見立て。根拠と反証候補を持つ。
- `RejectedInterpretation`: 利用者が「違う」とした解釈・言葉。再提示を避けるための記録。
- `Approved`: 利用者が明示的に選択・承認した内容。
- `Unresolved`: 未決定、わからない、今は決めたくない内容。

AIが内部で生成した解釈を本人の発言として記録してはならない。引用には必ず元メッセージへの参照を付ける。

---

## 4. データベース設計案

### 4.1 `sessions`
| カラム | 型（例） | 用途 |
|---|---|---|
| id | uuid | セッションID |
| resume_token_hash | text | 再開用トークンのハッシュ |
| phase | text | 現在の段階 |
| state_json | jsonb | 構造化された進行状態 |
| prompt_version | text | 使用したプロンプト版 |
| created_at | timestamptz | 作成日時 |
| updated_at | timestamptz | 更新日時 |
| expires_at | timestamptz | 有効期限 |
| deleted_at | timestamptz nullable | 論理削除日時 |

### 4.2 `messages`
| カラム | 型（例） | 用途 |
|---|---|---|
| id | uuid | メッセージID |
| session_id | uuid | セッション参照 |
| role | text | user / assistant |
| content | text | メッセージ本文 |
| sequence_no | integer | 表示順 |
| created_at | timestamptz | 作成日時 |
| provider_request_id | text nullable | 障害調査用ID（取得可能な場合） |
| input_tokens | integer nullable | 入力トークン数 |
| output_tokens | integer nullable | 出力トークン数 |

### 4.3 `usage_events`
| カラム | 型（例） | 用途 |
|---|---|---|
| id | uuid | イベントID |
| session_id | uuid nullable | 対象セッション |
| event_type | text | request / error / rate_limited 等 |
| model | text nullable | モデル名 |
| input_tokens | integer nullable | 入力量 |
| output_tokens | integer nullable | 出力量 |
| latency_ms | integer nullable | 処理時間 |
| created_at | timestamptz | 発生日時 |

### 4.4 初期設計の注意
- 会話履歴と構造化状態を同じ巨大なJSONにすべて押し込まない。
- まずは `sessions`、`messages`、`usage_events` の3テーブルを最小構成とし、構造化状態は `state_json` から開始してよい。
- 将来、物語やCOMPASSを個別編集・検索する要件が出た場合に専用テーブルへ分離する。
- すべてのセッション参照APIで再開トークンを検証し、単なるUUIDの知識だけではアクセスできない設計にする。

---

## 5. API設計案

### `POST /api/sessions`
新規セッションを作成する。
- 入力: CSRF対策に必要な情報（採用方式に応じる）、利用規約同意など
- 出力: `sessionId`、再開用秘密トークン（作成時のみ返す）
- 注意: 秘密トークンはログに記録しない。URLクエリに含めない。

### `GET /api/sessions/:sessionId`
会話履歴と利用者に表示してよい状態を取得する。
- セッションIDに加えて再開用秘密トークンを検証する。
- システムプロンプト、内部仮説、秘密情報を返さない。

### `POST /api/chat`
- 入力: `sessionId`、再開用認証情報、ユーザーメッセージ、必要ならリクエストID
- サーバー処理:
  1. スキーマ検証
  2. セッション認証
  3. レート制限・サイズ制限
  4. 会話履歴と構造化状態を取得
  5. 適切なプロンプトセットをロード
  6. AIプロバイダーを呼び出す
  7. 出力を検証
  8. メッセージ・状態・利用量を保存
  9. 利用者向け応答を返す
- エラー: 安全な汎用メッセージを返し、内部キーやスタックトレースを漏らさない。

### `DELETE /api/sessions/:sessionId`
セッション認証後、対象の会話データを削除する。削除範囲とバックアップからの消去時期はプライバシー案内に明記する。

### `GET /api/sessions/:sessionId/export`
本人が保存できるMarkdownを生成する。認証済みの本人にのみ提供する。

---

## 6. AI呼び出しフロー

```text
User message
  ↓
Validate input and session ownership
  ↓
Apply rate/size/session budget limits
  ↓
Load phase + recent messages + structured state
  ↓
Load versioned prompt modules
  ↓
Compose model request
  ↓
Call AI provider on server
  ↓
Validate output / parse optional state update
  ↓
Persist assistant message + state + usage event
  ↓
Return user-facing answer
```

### 6.1 コンテキストの組み立て
毎回、全文の履歴を無制限に送るのではなく、以下を優先する。
1. システム指示・共通ルール
2. 現在フェーズの指示
3. 構造化状態（承認済み内容、却下語、未確定事項など）
4. 最近の会話
5. 必要に応じたまとめログ

ただし、要約が原文を上書きしないようにする。原文は保存し、要約は検索・文脈維持用として扱う。

### 6.2 状態更新方式
MVPでは、AIのユーザー向け回答と内部状態更新を分けて扱う。内部状態更新をJSONで生成させる場合は、Zod等で検証し、不正なJSONや不明なIDがあれば破棄または再試行する。状態更新失敗によって、利用者向け回答の保存まで失敗させない。

---

## 7. セキュリティ・プライバシー設計

- APIキーはサーバー環境変数にのみ保存する。
- `NEXT_PUBLIC_`などの公開環境変数に秘密情報を入れない。
- セッション再開トークンは十分なランダム性を持たせ、DBにはハッシュを保存する。
- ブラウザのローカルストレージには必要最小限の再開情報だけを保存し、XSSリスクを考慮する。
- `HttpOnly`、`Secure`、`SameSite` Cookieを使える設計を優先する。
- すべてのAPIで入力検証、認可、レート制限を行う。
- ログにプロンプト全文、会話本文、APIキー、セッショントークンを記録しない。
- 公開URLを知っているだけで他人の履歴を閲覧できる設計にしない。
- 公開前にプライバシーポリシー、保存期間、削除手段、利用上の注意を確定する。
- AIの入力はセンシティブな人生経験を含む可能性があるため、分析ログの収集を最小化する。

### 7.1 無料公開に対する乱用対策
- IP／セッション単位の短時間レート制限
- セッションごとの最大ターン数・利用量
- 入力文字数と生成トークンの上限
- API予算アラート
- 異常な利用パターンの検知
- 必要に応じたCAPTCHA導入
- 429やタイムアウト時の指数バックオフ／再試行方針

---

## 8. テスト設計

### 8.1 単体テスト
- プロンプトモジュールのロード
- 入力検証
- フェーズコマンド判定
- セッション認可
- レート制限
- 状態更新スキーマ
- Markdownエクスポート

### 8.2 統合テスト
- 新規セッション作成
- 会話保存・再開
- AIエラー時のユーザー入力保持
- 状態更新とメッセージ保存
- セッション削除
- APIキーがレスポンスに含まれないこと

### 8.3 プロンプト回帰テスト
最低限、以下をテストケース化する。
1. 初回に「どんな本を書きたいですか？」と尋ねない。
2. 1ターンで質問を複数並べない。
3. 価値観を早期に断定しない。
4. 利用者の原文とAIの解釈を区別する。
5. 否定された解釈を言い換えて押し付けない。
6. 反証となる経験も探索する。
7. 痛みのある経験を無理に肯定的な物語へ変えない。
8. 出版手続きや章立てへ誘導しない。
9. 本人の承認前に7 STORIES／3 COMPASSを確定しない。
10. 強い苦痛が示されたら深掘りを止める。
11. BOOK SEEDに未承認の解釈を確定事項として混ぜない。
12. まとめログの最後に指定された確認質問を入れる。

---

## 9. デプロイ・運用

### 9.1 環境変数例
```dotenv
AI_PROVIDER=openai
AI_MODEL=設定するモデル名
AI_API_KEY=サーバー側の秘密キー
DATABASE_URL=PostgreSQL接続文字列
SESSION_TOKEN_SECRET=十分な長さのランダム値
APP_BASE_URL=https://example.com
RATE_LIMIT_PER_MINUTE=設定値
MAX_INPUT_CHARS=設定値
MAX_OUTPUT_TOKENS=設定値
SESSION_MAX_TURNS=設定値
```

`.env.example`にはダミー値だけを記載し、実キーはGitへコミットしない。

### 9.2 公開前チェック
- 本番キーと開発キーを分離
- API利用予算とアラートを設定
- HTTPS有効化
- DBアクセス制御確認
- セッション再開・削除テスト
- モバイル画面確認
- プロンプト回帰テスト
- プライバシー表示と削除手順確認
- エラー監視と利用量監視確認

---

## 10. 実装順序
1. リポジトリ初期化と基本画面
2. DBスキーマと匿名セッション
3. AIプロバイダーアダプター
4. プロンプトローダーと初回会話
5. チャット履歴の保存・再開
6. 構造化状態の保存
7. フェーズコマンドと成果物出力
8. セキュリティ・利用量制限
9. 回帰テスト
10. ステージング公開と小規模テスト

---

## 11. 設計上のリスクと対策
| リスク | 対策 |
|---|---|
| 長いプロンプトが一部抜け落ちる | 原本保管、モジュール分割、回帰テスト |
| AIが本人の価値観を断定する | 仮説／承認の状態分離、否定語保存 |
| 会話が長くなり費用が増える | 要約＋直近履歴、セッション予算、出力制限 |
| URLが拡散しAPI費用が膨らむ | レート制限、CAPTCHA検討、予算アラート |
| 利用者の個人的な会話が漏れる | セッション認証、最小ログ、削除機能 |
| AIプロバイダー変更で作り直しになる | `AIProvider`インターフェース |
| AIの出力形式が壊れる | スキーマ検証、再試行、失敗時フォールバック |
