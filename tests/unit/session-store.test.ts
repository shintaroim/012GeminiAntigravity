import { describe, it, expect } from "vitest";
import {
  createSession,
  getSession,
  addMessageToSession,
  deleteSession,
} from "@/lib/sessions/session-store";

describe("Session Store & Security (Phase 1/2)", () => {
  it("should create a session with an unhashed resume token and verify access", () => {
    const { session, resumeToken } = createSession();
    expect(session.id).toBeDefined();
    expect(resumeToken).toBeDefined();
    expect(resumeToken.length).toBeGreaterThan(16);

    // 有効なトークンで取得できる
    const retrieved = getSession(session.id, resumeToken);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(session.id);

    // 不正なトークンでは取得できない（所有権検証）
    const unauthorized = getSession(session.id, "invalid-token");
    expect(unauthorized).toBeNull();
  });

  it("should add messages sequentially and increase sequence numbers", () => {
    const { session } = createSession();
    const msg1 = addMessageToSession(session.id, "user", "最初の言葉");
    const msg2 = addMessageToSession(session.id, "assistant", "最初の問い");

    expect(msg1?.sequenceNo).toBe(1);
    expect(msg2?.sequenceNo).toBe(2);

    const retrieved = getSession(session.id);
    expect(retrieved?.messages.length).toBe(2);
    expect(retrieved?.turnCount).toBe(1); // assistantターンが1
  });

  it("should delete session securely with valid token", () => {
    const { session, resumeToken } = createSession();
    const deleteFailed = deleteSession(session.id, "wrong-token");
    expect(deleteFailed).toBe(false);

    const deleteSuccess = deleteSession(session.id, resumeToken);
    expect(deleteSuccess).toBe(true);

    const notFound = getSession(session.id);
    expect(notFound).toBeNull();
  });
});
