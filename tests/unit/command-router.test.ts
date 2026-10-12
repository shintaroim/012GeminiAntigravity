import { describe, it, expect } from "vitest";
import { detectCommandAndPhaseTransition } from "@/lib/conversations/command-router";
import { generateMockAiResponse } from "@/lib/ai/mock-provider";

describe("Phase 5: Program Progression & Command Routing", () => {
  it("should route 'ほんね' to speak phase and require initial greeting", () => {
    const res = detectCommandAndPhaseTransition({
      message: "ほんね",
      currentPhase: "refine",
      turnCount: 5,
    });

    expect(res.command).toBe("honne");
    expect(res.nextPhase).toBe("speak");
    expect(res.phaseChanged).toBe(true);
    expect(res.instructionOverride).toContain("最近ふと、「このままでいいのかな」");
  });

  it("should route 'たたき台をまとめて' to tatakidai command with sleep guide", () => {
    const res = detectCommandAndPhaseTransition({
      message: "これまでの話をたたき台をまとめてください",
      currentPhase: "speak",
      turnCount: 12,
    });

    expect(res.command).toBe("tatakidai");
    expect(res.nextPhase).toBe("speak");
    expect(res.instructionOverride).toContain("【「話す」のたたき台】のフォーマット");
  });

  it("should route '整える' to refine phase and enforce sleep-reflection opening question", () => {
    const res = detectCommandAndPhaseTransition({
      message: "整える たたき台を貼ります：...",
      currentPhase: "speak",
      turnCount: 15,
    });

    expect(res.command).toBe("refine");
    expect(res.nextPhase).toBe("refine");
    expect(res.phaseChanged).toBe(true);
    expect(res.instructionOverride).toContain("おかえりなさい。寝かせている間に、気づいたことや、「これはちょっと違うかも」と感じたことはありましたか？");
  });

  it("should route 'BOOK SEEDをまとめて' to book_seed phase and prevent premature AI completion declaration", () => {
    const res = detectCommandAndPhaseTransition({
      message: "BOOK SEEDをまとめて",
      currentPhase: "refine",
      turnCount: 25,
    });

    expect(res.command).toBe("book_seed");
    expect(res.nextPhase).toBe("book_seed");
    expect(res.phaseChanged).toBe(true);
    expect(res.instructionOverride).toContain("AIが自動で勝手に完成宣言をしてはいけません");
  });

  it("should route '今どんな感じ？' and 'まとめて' to summary command without changing phase", () => {
    const resSummary = detectCommandAndPhaseTransition({
      message: "今どんな感じ？",
      currentPhase: "speak",
      turnCount: 7,
    });

    expect(resSummary.command).toBe("summary");
    expect(resSummary.nextPhase).toBe("speak");
    expect(resSummary.phaseChanged).toBe(false);
    expect(resSummary.instructionOverride).toContain("【⚓ HON-NEoまとめログ】");
  });

  it("should verify mock AI responses accurately reflect command progression rules", () => {
    // 1. 整える
    const refineMock = generateMockAiResponse({
      message: "整える",
      turnCount: 10,
      phase: "refine",
    });
    expect(refineMock).toContain("おかえりなさい。寝かせている間に、気づいたことや、『これはちょっと違うかも』と感じたことはありましたか？");

    // 2. 寝かせる期間
    const restMock = generateMockAiResponse({
      message: "日常でふと昔の仕事を思い出しました",
      turnCount: 11,
      phase: "rest",
    });
    expect(restMock).toContain("寝かせる期間は、無理に深く考えなくて大丈夫です");
    expect(restMock).toContain("その気づきは、WEEK 3の『整える』のときにぜひ持ってきてくださいね");

    // 3. BOOK SEED
    const bookSeedMock = generateMockAiResponse({
      message: "BOOK SEEDをまとめて",
      turnCount: 30,
      phase: "book_seed",
    });
    expect(bookSeedMock).toContain("BOOK SEED｜わたしの物語（仮）");
    expect(bookSeedMock).toContain("MY 7 STORIES｜私をつくった7つの物語");
    expect(bookSeedMock).toContain("MY 3 COMPASS｜迷ったときに戻れる3つの問い");
    expect(bookSeedMock).toContain("私の人生の再定義");
    expect(bookSeedMock).toContain("完成を決めるのは私ではありません。");
    expect(bookSeedMock).toContain("これを読んで、『これは私だ』と言えますか？");
  });
});
