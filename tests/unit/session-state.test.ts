import { describe, it, expect } from "vitest";
import {
  createInitialState,
  parseSessionState,
  SessionStateSchema,
} from "@/lib/state/session-state";
import {
  formatStateContextForAI,
  updateStateFromInteraction,
} from "@/lib/state/state-manager";

describe("Phase 4: Structured State Management", () => {
  it("should create valid initial state and pass Zod schema validation", () => {
    const state = createInitialState("speak");
    expect(state.phase).toBe("speak");
    expect(state.verbatimQuotes).toEqual([]);
    expect(state.rejectedWords).toEqual([]);
    expect(state.approvedStories).toEqual([]);

    const parseResult = SessionStateSchema.safeParse(state);
    expect(parseResult.success).toBe(true);
  });

  it("should safely fallback to initial state when parsing invalid state object", () => {
    const invalidData = { phase: "invalid_phase", turnCount: "not_a_number" };
    const parsed = parseSessionState(invalidData);
    expect(parsed.phase).toBe("speak");
    expect(parsed.turnCount).toBe(0);
    expect(parsed.verbatimQuotes).toEqual([]);
  });

  it("should extract verbatim quotes linked to specific user message ID", () => {
    const initialState = createInitialState("speak");
    const userMessageId = "msg-user-12345";
    const userText = "あのときは無我夢中で、周りの声が聞こえなかった";

    const updated = updateStateFromInteraction({
      currentState: initialState,
      userMessageId,
      userContent: userText,
      turnCount: 1,
    });

    expect(updated.verbatimQuotes.length).toBe(1);
    const quote = updated.verbatimQuotes[0];
    expect(quote.messageId).toBe(userMessageId);
    expect(quote.text).toBe(userText);
  });

  it("should extract rejected words when user negates an interpretation and inject into prompt context", () => {
    const initialState = createInitialState("speak");
    const userMessageId = "msg-user-reject";
    const userText = "それは違います。そんなカッコいい挑戦ではなく、ただ逃げただけです。";

    const updated = updateStateFromInteraction({
      currentState: initialState,
      userMessageId,
      userContent: userText,
      turnCount: 2,
    });

    expect(updated.rejectedWords.length).toBe(1);
    expect(updated.rejectedWords[0].userCorrection).toContain("そんなカッコいい挑戦ではなく");

    // AIプロンプト向けコンテキストの確認
    const context = formatStateContextForAI(updated);
    expect(context).toContain("【⛔ 選ばなかった言葉（絶対に別の表現で再提示・押し付けないこと）】");
    expect(context).toContain("そんなカッコいい挑戦ではなく、ただ逃げただけです。");
  });

  it("should extract unresolved items when user defers decision", () => {
    const initialState = createInitialState("speak");
    const userMessageId = "msg-user-unresolved";
    const userText = "そのときの親の気持ちは、正直まだわからないし、今は決めたくないです。";

    const updated = updateStateFromInteraction({
      currentState: initialState,
      userMessageId,
      userContent: userText,
      turnCount: 3,
    });

    expect(updated.unresolvedItems.length).toBe(1);
    expect(updated.unresolvedItems[0].note).toContain("今は決めたくないです");

    const context = formatStateContextForAI(updated);
    expect(context).toContain("【まだ決めたくないところ / 未確定事項】");
  });

  it("should strictly separate hypothesis and approved artifacts", () => {
    const state = createInitialState("refine");

    // 仮説を追加
    state.valueHypotheses.push({
      id: "hypo-1",
      name: "自由への執着",
      reason: "転職を繰り返した経験から",
      counterEvidence: "家族のために残った期間もある",
      status: "hypothesis",
    });

    // 承認済み物語を追加
    state.approvedStories.push({
      storyNumber: 1,
      title: "辞めたから、残ったものが見えた",
      originalEvent: "最初の会社を退職したこと",
      whatHappened: "引き止められたが退職届を出した",
      atThatTime: "不安で眠れなかった",
      howFeltReally: "自分の人生を生きたかった",
      whatIChose: "自分で決めること",
      whatIDidNotChoose: "会社の敷いたレール",
      reflectionNow: "あのときの自分が今の土台",
      whatRemained: "自分で決めたという誇り",
      verbatimQuote: "あのときは無我夢中だった",
      connectedCompass: "自分で選べる自由",
    });

    // スキーマ検証
    const validated = SessionStateSchema.safeParse(state);
    expect(validated.success).toBe(true);

    // 仮説と承認済みが混同されず別プロパティに保持されていることを検証
    expect(state.valueHypotheses[0].status).toBe("hypothesis");
    expect(state.approvedStories[0].storyNumber).toBe(1);
    expect(state.approvedStories[0].title).toBe("辞めたから、残ったものが見えた");

    // コンテキスト出力の検証
    const context = formatStateContextForAI(state);
    expect(context).toContain("【価値観の仮説（暫定・未確定）】");
    expect(context).toContain("【承認済みの物語 (現在 1/7)】");
  });

  it("should maintain state across multiple interactions", () => {
    let state = createInitialState("speak");

    // 1往復目: 原文追加
    state = updateStateFromInteraction({
      currentState: state,
      userMessageId: "msg-1",
      userContent: "母との関係がずっと引っかかっています",
      turnCount: 1,
    });
    expect(state.verbatimQuotes.length).toBe(1);

    // 2往復目: 否定語追加
    state = updateStateFromInteraction({
      currentState: state,
      userMessageId: "msg-2",
      userContent: "でも母を憎んでいるわけではないです。そこは違います。",
      turnCount: 2,
    });

    // 前回の原文と今回の否定語が両方保持されていること
    expect(state.verbatimQuotes.length).toBe(2);
    expect(state.rejectedWords.length).toBe(1);
    expect(state.turnCount).toBe(2);
  });
});
