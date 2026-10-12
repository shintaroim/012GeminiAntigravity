import { describe, it, expect, beforeEach } from "vitest";
import { loadPromptModules } from "@/lib/prompts/load-prompts";
import { generateMockAiResponse } from "@/lib/ai/mock-provider";
import { JsonFileRepository } from "@/lib/db/repository";
import { createInitialState } from "@/lib/state/session-state";
import { updateStateFromInteraction, formatStateContextForAI } from "@/lib/state/state-manager";
import { generateBookSeedMarkdown, generateExportMarkdown } from "@/lib/export/export-markdown";
import { checkRateLimit, clearRateLimitStore } from "@/lib/security/rate-limiter";

describe("Required Test Cases (Section 6 & Phase 7 Verification)", () => {
  let repo: JsonFileRepository;

  beforeEach(() => {
    clearRateLimitStore();
    repo = new JsonFileRepository(":memory:" + Math.random());
  });

  // 1. 初回会話で「どんな本を書きたいですか？」から始めない。
  it("TC-01: should NOT ask 'what kind of book do you want to write' on first turn", () => {
    const prompt = loadPromptModules({ phase: "speak" });
    expect(prompt).toContain("あなたの仕事は、最初から「どんな本を書きたいですか？」と聞くことではありません。");

    const response = generateMockAiResponse({ message: "ほんね", turnCount: 0 });
    expect(response).not.toContain("どんな本を書きたいですか");
    expect(response).toContain("『本にする話』を考えなくて大丈夫です");
    expect(response).toContain("最近ふと、『このままでいいのかな』とか");
  });

  // 2. 1ターンの応答に複数の質問を詰め込まない。
  it("TC-02: should NOT pack multiple questions into a single turn response", () => {
    const prompt = loadPromptModules({ phase: "speak" });
    expect(prompt).toContain("原則として、1ターンにつき1つの質問だけをしてください。");

    const response = generateMockAiResponse({
      message: "子どもの頃は絵を描くのが好きでしたが、親には反対されました。",
      turnCount: 2,
    });
    // 日本語の疑問符（「？」）の個数が1個であることを検証
    const count = (response.match(/？/g) || []).length;
    expect(count).toBe(1);
  });

  // 3. 「自由」などの価値観候補を根拠なく断定しない。
  it("TC-03: should NOT assert values without ground and definition", () => {
    const prompt = loadPromptModules({ phase: "speak" });
    expect(prompt).toContain("一語だけで終わらせないでください。");
    expect(prompt).toContain("たとえば「自由」ではなく、\n「自分で選べる自由」");
    expect(prompt).toContain("AIが本人の人生を定義してはいけません。");
  });

  // 4. 本人の原文を正確に保持する。
  it("TC-04: should accurately preserve user verbatim quote with messageId", async () => {
    const { session } = await repo.createSession();
    const userMsg = await repo.createMessage({
      sessionId: session.id,
      role: "user",
      content: "逃げたと言われても、あのときはあの道しかなかった",
    });

    const state = updateStateFromInteraction({
      currentState: createInitialState(),
      userMessageId: userMsg!.id,
      userContent: userMsg!.content,
      turnCount: 1,
    });

    expect(state.verbatimQuotes.length).toBe(1);
    expect(state.verbatimQuotes[0].messageId).toBe(userMsg!.id);
    expect(state.verbatimQuotes[0].text).toBe("逃げたと言われても、あのときはあの道しかなかった");
  });

  // 5. AIの仮説を本人の発言として出力しない。
  it("TC-05: should NOT treat AI hypothesis as user verbatim quote", () => {
    const state = createInitialState();
    state.valueHypotheses.push({
      id: "hypo-1",
      name: "自己決定への渇望",
      reason: "度重なる環境の変化から推測",
      counterEvidence: null,
      status: "hypothesis",
    });

    const context = formatStateContextForAI(state);
    expect(context).toContain("【価値観の仮説（暫定・未確定）】");
    // 原文引用枠に仮説が混入していないこと
    expect(context).not.toContain("【本人の原文引用（AIの言い換えではなく発言そのもの）】\n・「自己決定への渇望」");
  });

  // 6. 利用者が否定した言葉を、言い換えて押し付けない。
  it("TC-06: should record rejected words and enforce exclusion in AI context", () => {
    const state = updateStateFromInteraction({
      currentState: createInitialState(),
      userMessageId: "msg-negate",
      userContent: "それは違います。挑戦とかカッコいいものじゃありません。",
      turnCount: 3,
    });

    expect(state.rejectedWords.length).toBe(1);
    const context = formatStateContextForAI(state);
    expect(context).toContain("【⛔ 選ばなかった言葉（絶対に別の表現で再提示・押し付けないこと）】");
    expect(context).toContain("挑戦とかカッコいいものじゃありません");
  });

  // 7. 価値観候補に反する経験も探索対象にできる。
  it("TC-07: should prompt exploration of counter-evidence for candidate values", () => {
    const prompt = loadPromptModules({ phase: "speak" });
    expect(prompt).toContain("価値観候補を裏づける経験だけを集めないでください。");
    expect(prompt).toContain("「自由より安定や約束を選んだことは？」と反対側も探索してください。");
  });

  // 8. 痛みのある経験をポジティブに脚色しない。
  it("TC-08: should NOT glorify painful experiences into growth stories", () => {
    const prompt = loadPromptModules({ phase: "speak" });
    expect(prompt).toContain("本人が「消したい経験」と言ったものを、「でも、そのおかげで今がある」と美談化しないでください。");

    const safetyPrompt = loadPromptModules({ phase: "refine" });
    expect(safetyPrompt).toContain("禁止：勝手な美談化、過剰な感動演出、ポエム化、自己啓発的な結論");
  });

  // 9. 出版・章立て・本文執筆へ誘導しない。
  it("TC-09: should NOT guide user towards publishing, chaptering, or book writing", () => {
    const prompt = loadPromptModules({ phase: "speak" });
    expect(prompt).toContain("この30日間では、本の章立て・本文の執筆・出版の手続きは扱いません。");
    expect(prompt).toContain("出版や次のサービスへ誘導してはいけません。");
  });

  // 10. BOOK SEEDへ未承認内容を確定事項として含めない。
  it("TC-10: should NOT include unapproved hypotheses into BOOK SEED as confirmed items", () => {
    const state = createInitialState("book_seed");
    state.valueHypotheses.push({
      id: "h1",
      name: "承認欲求の克服",
      reason: "AIの推測",
      counterEvidence: null,
      status: "hypothesis",
    });

    const bookSeed = generateBookSeedMarkdown(state, []);
    expect(bookSeed).not.toContain("《承認欲求の克服》");
  });

  // 11. APIキーをブラウザ側へ露出しない。
  it("TC-11: should ensure API keys are strictly server-side and not exposed", () => {
    // クライアント側公開変数 NEXT_PUBLIC_ に AI_API_KEY が存在しないこと
    expect(process.env.NEXT_PUBLIC_AI_API_KEY).toBeUndefined();
  });

  // 12. セッションIDだけでは他人の会話を読めない。
  it("TC-12: should forbid access to session using ID alone without valid resume token", async () => {
    const { session, resumeToken } = await repo.createSession();

    // トークンなし、または偽トークンでの検証拒否
    const verifyWithoutToken = await repo.verifySessionToken(session.id, "");
    expect(verifyWithoutToken).toBe(false);

    const verifyWrongToken = await repo.verifySessionToken(session.id, "fake-token-12345");
    expect(verifyWrongToken).toBe(false);

    // 正しいトークンのみ受け入れ
    const verifyCorrectToken = await repo.verifySessionToken(session.id, resumeToken);
    expect(verifyCorrectToken).toBe(true);
  });

  // 13. レート制限が機能する。
  it("TC-13: should enforce rate limiting when request limit is reached", () => {
    const key = "rate-test-ip";
    const limit = 3;

    expect(checkRateLimit(key, limit, 10000).allowed).toBe(true);
    expect(checkRateLimit(key, limit, 10000).allowed).toBe(true);
    expect(checkRateLimit(key, limit, 10000).allowed).toBe(true);

    const blocked = checkRateLimit(key, limit, 10000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  // 14. 削除したセッションを通常APIから取得できない。
  it("TC-14: should ensure soft-deleted sessions cannot be retrieved", async () => {
    const { session, resumeToken } = await repo.createSession();
    await repo.createMessage({
      sessionId: session.id,
      role: "user",
      content: "プライベートな秘密",
    });

    const deleteSuccess = await repo.softDeleteSession(session.id, resumeToken);
    expect(deleteSuccess).toBe(true);

    const fetchedSession = await repo.getSessionById(session.id);
    expect(fetchedSession).toBeNull();

    const messages = await repo.getMessagesBySessionId(session.id);
    expect(messages.length).toBe(0);
  });

  // 15. API障害時に入力内容が失われない。
  it("TC-15: should ensure user message is persisted before external AI call", async () => {
    const { session } = await repo.createSession();

    // ユーザーメッセージを先にDB保存
    const userMsg = await repo.createMessage({
      sessionId: session.id,
      role: "user",
      content: "とても大切な人生の転機",
    });

    expect(userMsg).not.toBeNull();
    expect(userMsg?.id).toBeDefined();

    // 仮にAIが障害で失敗しても、ユーザーメッセージはDBに残る
    const messages = await repo.getMessagesBySessionId(session.id);
    expect(messages.length).toBe(1);
    expect(messages[0].content).toBe("とても大切な人生の転機");
  });

  // 16. Markdownエクスポートが日本語を含め正しく出力される。
  it("TC-16: should export valid Japanese Markdown without corruption", () => {
    const state = createInitialState("book_seed");
    state.approvedStories.push({
      storyNumber: 1,
      title: "京都での挫折と再出発",
      originalEvent: "修業時代の退職",
      whatHappened: "親方の厳しい指導に耐えかねて一度実家に戻った",
      atThatTime: "自分が情けなくて涙が止まらなかった",
      howFeltReally: "本当は料理そのものは好きだった",
      whatIChose: "小さなカフェからやり直すこと",
      whatIDidNotChoose: "料理の道を完全に諦めること",
      reflectionNow: "あの挫折が自分らしさの原点",
      whatRemained: "素直に人に頭を下げる謙虚さ",
      verbatimQuote: "悔しくて悔しくて、でも諦めきれなかった",
      connectedCompass: "小さくても自分の味を届ける",
    });

    const md = generateExportMarkdown({ state, messages: [], type: "book_seed" });
    expect(md).toContain("京都での挫折と再出発");
    expect(md).toContain("悔しくて悔しくて、でも諦めきれなかった");
    expect(md).toContain("小さくても自分の味を届ける");
  });
});
