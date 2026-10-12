export type ProgramPhase = "speak" | "rest" | "refine" | "book_seed";

export type ContentStatus =
  | "candidate"
  | "hypothesis"
  | "rejected"
  | "approved"
  | "archived";

export type {
  SessionState,
  VerbatimQuote,
  Episode,
  ValueHypothesis,
  RejectedWord,
  UnresolvedItem,
  StoryCandidate,
  CompassCandidate,
  ApprovedStory,
  ApprovedCompass,
} from "@/lib/state/session-state";

// ==========================================
// データベース / リポジトリ層エンティティ
// ==========================================

export interface SessionRecord {
  id: string;
  resumeTokenHash: string;
  phase: ProgramPhase;
  stateJson: Record<string, unknown>;
  promptVersion: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  deletedAt: string | null;
}

export interface MessageRecord {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  sequenceNo: number;
  providerRequestId?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  createdAt: string;
}

export type UsageEventType = "request" | "error" | "rate_limited" | "session_created" | "session_deleted";

export interface UsageEventRecord {
  id: string;
  sessionId: string | null;
  eventType: UsageEventType;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number | null;
  createdAt: string;
}

// ==========================================
// API / UI層型
// ==========================================

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  sequenceNo: number;
  createdAt: string;
}

export interface SessionInfo {
  id: string;
  resumeToken: string;
  phase: ProgramPhase;
  turnCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatRequest {
  sessionId: string;
  message: string;
  resumeToken?: string;
}

export interface ChatResponse {
  message: ChatMessage;
  phase: ProgramPhase;
  turnCount: number;
}

export interface CreateSessionResponse {
  sessionId: string;
  resumeToken: string;
  phase: ProgramPhase;
}
