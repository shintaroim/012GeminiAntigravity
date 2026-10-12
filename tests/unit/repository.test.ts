import { describe, it, expect, beforeEach } from "vitest";
import { JsonFileRepository, hashToken } from "@/lib/db/repository";

describe("Phase 2: Repository & Data Access Layer", () => {
  let repo: JsonFileRepository;

  beforeEach(() => {
    // 各テストで独立したインメモリリポジトリを作成
    repo = new JsonFileRepository(":memory:" + Math.random());
  });

  it("should create session and store only hash of resume token", async () => {
    const { session, resumeToken } = await repo.createSession({
      phase: "speak",
      promptVersion: "v1.0",
    });

    expect(session.id).toBeDefined();
    expect(session.phase).toBe("speak");
    expect(session.resumeTokenHash).toBe(hashToken(resumeToken));
    // DB側には平文のトークンが保存されていないことを確認
    expect(session.resumeTokenHash).not.toBe(resumeToken);
  });

  it("should enforce ownership validation: cannot access session without valid token", async () => {
    const { session, resumeToken } = await repo.createSession();

    // 正しいトークンでの検証は true
    const isValid = await repo.verifySessionToken(session.id, resumeToken);
    expect(isValid).toBe(true);

    // 不正なトークンでの検証は false
    const isInvalid = await repo.verifySessionToken(session.id, "tampered-token");
    expect(isInvalid).toBe(false);

    // 存在しないセッションIDに対する検証は false
    const notFound = await repo.verifySessionToken("00000000-0000-0000-0000-000000000000", resumeToken);
    expect(notFound).toBe(false);
  });

  it("should save messages sequentially with correct sequence numbers and separate sessions", async () => {
    const { session: session1 } = await repo.createSession();
    const { session: session2 } = await repo.createSession();

    // セッション1にメッセージ追加
    const msg1_1 = await repo.createMessage({
      sessionId: session1.id,
      role: "user",
      content: "セッション1の最初の発言",
    });
    const msg1_2 = await repo.createMessage({
      sessionId: session1.id,
      role: "assistant",
      content: "セッション1の最初の問い",
    });

    // セッション2にメッセージ追加
    const msg2_1 = await repo.createMessage({
      sessionId: session2.id,
      role: "user",
      content: "セッション2の別の発言",
    });

    expect(msg1_1?.sequenceNo).toBe(1);
    expect(msg1_2?.sequenceNo).toBe(2);
    expect(msg2_1?.sequenceNo).toBe(1);

    // セッション1のメッセージ一覧
    const list1 = await repo.getMessagesBySessionId(session1.id);
    expect(list1.length).toBe(2);
    expect(list1[0].content).toBe("セッション1の最初の発言");
    expect(list1[1].content).toBe("セッション1の最初の問い");

    // セッション2のメッセージ一覧（混入していないこと）
    const list2 = await repo.getMessagesBySessionId(session2.id);
    expect(list2.length).toBe(1);
    expect(list2[0].content).toBe("セッション2の別の発言");

    // ターン数の計算
    expect(await repo.getTurnCount(session1.id)).toBe(1);
    expect(await repo.getTurnCount(session2.id)).toBe(0);
  });

  it("should soft delete session and prevent subsequent access", async () => {
    const { session, resumeToken } = await repo.createSession();

    // メッセージを追加
    await repo.createMessage({
      sessionId: session.id,
      role: "user",
      content: "削除前の発言",
    });

    // 間違ったトークンでは削除できない
    const wrongDelete = await repo.softDeleteSession(session.id, "wrong-token");
    expect(wrongDelete).toBe(false);

    // 正しいトークンで論理削除
    const deleteSuccess = await repo.softDeleteSession(session.id, resumeToken);
    expect(deleteSuccess).toBe(true);

    // 削除後は通常取得で null になる
    const fetched = await repo.getSessionById(session.id);
    expect(fetched).toBeNull();

    // トークン検証も false になる
    const verifyAfterDelete = await repo.verifySessionToken(session.id, resumeToken);
    expect(verifyAfterDelete).toBe(false);

    // メッセージも取得できない
    const messages = await repo.getMessagesBySessionId(session.id);
    expect(messages.length).toBe(0);
  });

  it("should record usage events without logging user message content", async () => {
    const { session } = await repo.createSession();

    await repo.createUsageEvent({
      sessionId: session.id,
      eventType: "request",
      model: "test-model",
      inputTokens: 120,
      outputTokens: 80,
      latencyMs: 340,
    });

    const events = await repo.getUsageEventsBySessionId(session.id);
    // session_created と request の2件
    expect(events.length).toBe(2);
    expect(events[1].eventType).toBe("request");
    expect(events[1].inputTokens).toBe(120);
    expect(events[1].outputTokens).toBe(80);
    expect(events[1].latencyMs).toBe(340);
  });
});
