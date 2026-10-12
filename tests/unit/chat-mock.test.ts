import { describe, it, expect } from "vitest";
import { generateMockAiResponse } from "@/lib/ai/mock-provider";

describe("Mock AI Provider (Phase 1)", () => {
  it("should output standard intro and opening question on first turn or 'ほんね'", () => {
    const resFirstTurn = generateMockAiResponse({ message: "こんにちは", turnCount: 0 });
    expect(resFirstTurn).toContain("スタートおめでとうございます。");
    expect(resFirstTurn).toContain("本にする話");
    expect(resFirstTurn).toContain("最近ふと、『このままでいいのかな』とか");

    const resHonne = generateMockAiResponse({ message: "ほんね", turnCount: 5 });
    expect(resHonne).toContain("スタートおめでとうございます。");
  });

  it("should output tatakidai format when requested", () => {
    const res = generateMockAiResponse({
      message: "たたき台をまとめて",
      turnCount: 10,
    });
    expect(res).toContain("HON-NEo「話す」のたたき台（保存用）");
    expect(res).toContain("■ 7 STORIES候補");
    expect(res).toContain("■ 3 COMPASS候補");
    expect(res).toContain("■ 本人の象徴的な原文");
    expect(res).toContain("■ 選ばなかった言葉");
    expect(res).toContain("■ まだ決めたくないところ");
  });

  it("should output summary log when requested", () => {
    const res = generateMockAiResponse({
      message: "今どんな感じ？",
      turnCount: 7,
    });
    expect(res).toContain("【⚓ HON-NEoまとめログ】");
    expect(res).toContain("ここまでで、『それは違う』と思うところはありますか？");
  });

  it("should output deep-dive question for general message (1 question per turn)", () => {
    const res = generateMockAiResponse({
      message: "会社を辞めるとき、とても怖かったけれど後悔はしていません",
      turnCount: 2,
    });
    expect(res).toContain("そのとき、胸の中ではどんな気持ちが一番強かったですか？");
    // 質問集を詰め込まず、1つの問いになっていることを確認
    const questionMarks = (res.match(/？/g) || []).length;
    expect(questionMarks).toBe(1);
  });
});
