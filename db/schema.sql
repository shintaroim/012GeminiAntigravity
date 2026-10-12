-- ==============================================================================
-- HON-NEo データベーススキーマ (PostgreSQL / Supabase 互換)
-- システム設計書 v0.1 セクション4 に準拠
-- ==============================================================================

-- 1. sessions テーブル
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_token_hash TEXT NOT NULL,
    phase TEXT NOT NULL DEFAULT 'speak',
    state_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    prompt_version TEXT NOT NULL DEFAULT 'v1.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
    deleted_at TIMESTAMPTZ NULL
);

-- sessions インデックス
CREATE INDEX IF NOT EXISTS idx_sessions_resume_token_hash ON sessions(resume_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_deleted_at ON sessions(deleted_at);

-- 2. messages テーブル
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    sequence_no INTEGER NOT NULL,
    provider_request_id TEXT NULL,
    input_tokens INTEGER NULL,
    output_tokens INTEGER NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- messages インデックス
CREATE INDEX IF NOT EXISTS idx_messages_session_seq ON messages(session_id, sequence_no);

-- 3. usage_events テーブル
CREATE TABLE IF NOT EXISTS usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NULL REFERENCES sessions(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    model TEXT NULL,
    input_tokens INTEGER NULL,
    output_tokens INTEGER NULL,
    latency_ms INTEGER NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- usage_events インデックス
CREATE INDEX IF NOT EXISTS idx_usage_events_session_id ON usage_events(session_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_created_at ON usage_events(created_at);

-- 4. Row Level Security (RLS) 設定
-- 本アプリはNext.js Route Handler（サーバー側）で安全に認証を行ってアクセスするため、
-- SupabaseのRLSを無効化（または全許可）にしてanonキー・service_roleキーの双方で安定動作させます。
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events DISABLE ROW LEVEL SECURITY;

