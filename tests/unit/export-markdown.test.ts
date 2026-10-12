import { describe, it, expect } from "vitest";
import { createInitialState } from "@/lib/state/session-state";
import {
  generateBookSeedMarkdown,
  generateTatakidaiMarkdown,
  generateFullConversationMarkdown,
} from "@/lib/export/export-markdown";
import { ChatMessage } from "@/types";

describe("Phase 6: Artifact Export & Markdown Generation", () => {
  it("should generate BOOK SEED markdown with approved artifacts and 'Next Seeds' box", () => {
    const state = createInitialState("book_seed");

    // 承認済み物語
    state.approvedStories.push({
      storyNumber: 1,
      title: "怖いまま、あのドアを開けた",
      originalEvent: "転職の決断",
      whatHappened: "未経験の業界に飛び込んだ",
      atThatTime: "足が震えていた",
      howFeltReally: "誰かのせいにする生き方をやめたかった",
      whatIChose: "自分の意志で選ぶこと",
      whatIDidNotChoose: "慣れ親しんだ安定",
      reflectionNow: "あの選択が私をつくった",
      whatRemained: "自分で決める覚悟",
      verbatimQuote: "あのときは無我夢中だった",
      connectedCompass: "自分で選べる自由",
    });

    // 承認済みCOMPASS
    state.approvedCompasses.push({
      compassNumber: 1,
      name: "自分で選べる自由",
      definition: "他人の正解ではなく、失敗しても自分で納得して引き受けること。",
      question: "これは、私が自分で選びたいことだろうか？",
      groundedStories: ["STORY 1"],
    });

    // 人生の再定義文
    state.lifeRedefinition =
      "私は、周囲の目を気にしながらも、最後には自分の声を選び直してきた人生を生きてきた。";

    // 重要だが7つに選ばれなかった候補（次のタネ箱へ入るべきもの）
    state.storyCandidates.push({
      id: "cand-2",
      title: "一人旅で迷子になった夜",
      whatHappened: "言葉が通じない町で現地の人に助けられた",
      connectionToPresent: "人に頼ることの温かさを知った",
      quoteIds: [],
      status: "candidate", // 未承認・候補
    });

    // 未承認の仮説（BOOK SEEDの確定枠に混入してはならない）
    state.valueHypotheses.push({
      id: "hypo-unapproved",
      name: "野心と成功への執着",
      reason: "初期の発言より",
      counterEvidence: null,
      status: "hypothesis",
    });

    const md = generateBookSeedMarkdown(state, []);

    // フォーマット検証
    expect(md).toContain("BOOK SEED｜わたしの物語（仮）");
    expect(md).toContain("■ MY 7 STORIES｜私をつくった7つの物語");
    expect(md).toContain("《怖いまま、あのドアを開けた》");
    expect(md).toContain("■ MY 3 COMPASS｜迷ったときに戻れる3つの問い");
    expect(md).toContain("《自分で選べる自由》");
    expect(md).toContain("「これは、私が自分で選びたいことだろうか？」");
    expect(md).toContain("■ 私の人生の再定義");

    // 「次のタネ箱」に選ばれなかった候補が収録されていること
    expect(md).toContain("■ 次のタネ箱");
    expect(md).toContain("一人旅で迷子になった夜");

    // 未承認の仮説が確定タイトルとして混入していないこと
    expect(md).not.toContain("《野心と成功への執着》");
  });

  it("should generate tatakidai markdown correctly", () => {
    const state = createInitialState("speak");
    state.verbatimQuotes.push({
      id: "q1",
      messageId: "m1",
      text: "誰かのせいにはしたくなかった",
      createdAt: new Date().toISOString(),
    });
    state.rejectedWords.push({
      id: "rw1",
      wordOrInterpretation: "成功への執念",
      userCorrection: "そういうカッコいいものじゃない",
      rejectedAt: new Date().toISOString(),
    });
    state.unresolvedItems.push({
      id: "u1",
      topic: "当時の人間関係",
      note: "まだうまく言葉にできない",
    });

    const md = generateTatakidaiMarkdown(state, []);

    expect(md).toContain("HON-NEo「話す」のたたき台（保存用）");
    expect(md).toContain("■ 本人の象徴的な原文");
    expect(md).toContain("「誰かのせいにはしたくなかった」");
    expect(md).toContain("■ 選ばなかった言葉");
    expect(md).toContain("成功への執念 → 「そういうカッコいいものじゃない」と本人");
    expect(md).toContain("■ まだ決めたくないところ");
    expect(md).toContain("当時の人間関係: まだうまく言葉にできない");
  });

  it("should generate full conversation log markdown with Japanese formatting", () => {
    const state = createInitialState("speak");
    state.turnCount = 1;

    const messages: ChatMessage[] = [
      {
        id: "m-user-1",
        sessionId: "session-1",
        role: "user",
        content: "こんにちは。自分の本音を見つけたいです。",
        sequenceNo: 1,
        createdAt: "2026-10-12T10:00:00.000Z",
      },
      {
        id: "m-ai-1",
        sessionId: "session-1",
        role: "assistant",
        content: "スタートおめでとうございます。思い出したことを話してください。",
        sequenceNo: 2,
        createdAt: "2026-10-12T10:00:05.000Z",
      },
    ];

    const md = generateFullConversationMarkdown(state, messages);

    expect(md).toContain("# HON-NEo 対話記録");
    expect(md).toContain("👤 あなた");
    expect(md).toContain("自分の本音を見つけたいです");
    expect(md).toContain("✍️ HON-NEo（人生編集者）");
    expect(md).toContain("スタートおめでとうございます");
  });
});
