import crypto from "crypto";
import { ChatMessage, SessionInfo } from "@/types";

interface StoredSession extends SessionInfo {
  resumeTokenHash: string;
  messages: ChatMessage[];
}

// 開発・MVP用のメモリストア（サーバー実行中保持）
const sessionStore = new Map<string, StoredSession>();

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createSession(): { session: SessionInfo; resumeToken: string } {
  const sessionId = crypto.randomUUID();
  const resumeToken = crypto.randomBytes(24).toString("hex");
  const resumeTokenHash = hashToken(resumeToken);
  const now = new Date().toISOString();

  const newSession: StoredSession = {
    id: sessionId,
    resumeToken: "", // クライアントへ返す実トークンは戻り値で直接提供し、ストア内にはハッシュのみ保存
    resumeTokenHash,
    phase: "speak",
    turnCount: 0,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };

  sessionStore.set(sessionId, newSession);

  return {
    session: {
      id: sessionId,
      resumeToken: "",
      phase: "speak",
      turnCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    resumeToken,
  };
}

export function getSession(sessionId: string, resumeToken?: string): StoredSession | null {
  const session = sessionStore.get(sessionId);
  if (!session) return null;

  // トークン検証（提供されている場合はハッシュ照合）
  if (resumeToken) {
    const providedHash = hashToken(resumeToken);
    if (providedHash !== session.resumeTokenHash) {
      return null;
    }
  }

  return session;
}

export function addMessageToSession(
  sessionId: string,
  role: "user" | "assistant",
  content: string
): ChatMessage | null {
  const session = sessionStore.get(sessionId);
  if (!session) return null;

  const sequenceNo = session.messages.length + 1;
  const message: ChatMessage = {
    id: crypto.randomUUID(),
    sessionId,
    role,
    content,
    sequenceNo,
    createdAt: new Date().toISOString(),
  };

  session.messages.push(message);
  if (role === "assistant") {
    session.turnCount += 1;
  }
  session.updatedAt = new Date().toISOString();

  return message;
}

export function getSessionMessages(sessionId: string): ChatMessage[] {
  const session = sessionStore.get(sessionId);
  return session ? [...session.messages] : [];
}

export function deleteSession(sessionId: string, resumeToken: string): boolean {
  const session = getSession(sessionId, resumeToken);
  if (!session) return false;
  return sessionStore.delete(sessionId);
}
