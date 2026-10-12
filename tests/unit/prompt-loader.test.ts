import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { loadPromptModules } from "@/lib/prompts/load-prompts";

describe("Phase 3: Prompt Loader & Integrity", () => {
  it("should have all required prompt module files", () => {
    const requiredFiles = [
      "system.md",
      "philosophy.md",
      "conversation-rules.md",
      "safety.md",
      "output-formats.md",
      "prompt-version.json",
      "checklist.md",
      "phases/speak.md",
      "phases/rest.md",
      "phases/refine.md",
      "phases/book-seed.md",
    ];

    for (const relPath of requiredFiles) {
      const fullPath = path.resolve(process.cwd(), "prompts", relPath);
      expect(fs.existsSync(fullPath), `Missing prompt file: ${relPath}`).toBe(true);
    }
  });

  it("should load speak phase prompt with essential rules and keywords", () => {
    const prompt = loadPromptModules({ phase: "speak" });

    // 役割と成果物
    expect(prompt).toContain("対話型人生編集者");
    expect(prompt).toContain("MY 7 STORIES");
    expect(prompt).toContain("MY 3 COMPASS");
    expect(prompt).toContain("BOOK SEED");

    // 思想とハンドル
    expect(prompt).toContain("今の私が、自分で選んだ、今の答え");
    expect(prompt).toContain("人生のハンドルは、常に本人が握ります");
    expect(prompt).toContain("AIが本人の人生を定義してはいけません");

    // 対話ルール
    expect(prompt).toContain("1ターンにつき1つの質問だけ");
    expect(prompt).toContain("質問集を順番に消化しないでください");
    expect(prompt).toContain("空疎な称賛を連発しないでください");
    expect(prompt).toContain("本人の原文を保存する");
    expect(prompt).toContain("選ばなかった言葉を保存する・反証を探す");

    // 境界と安全
    expect(prompt).toContain("本の章立て・本文の執筆・出版の手続きは扱いません");
    expect(prompt).toContain("強い苦しさや危うさを話した場合は、深掘りを止めてください");

    // speak固有の導入
    expect(prompt).toContain("スタートおめでとうございます。");
    expect(prompt).toContain("最近ふと、『このままでいいのかな』");
  });

  it("should load refine phase prompt with storytelling and compass rules", () => {
    const prompt = loadPromptModules({ phase: "refine" });
    expect(prompt).toContain("寝かせている間に、気づいたことや、『これはちょっと違うかも』と感じたことはありましたか？");
    expect(prompt).toContain("出来事名を「物語タイトル」に変換する");
    expect(prompt).toContain("3 COMPASSを見つける");
    expect(prompt).toContain("人生の再定義文");
  });

  it("should load book_seed phase prompt with completion rules", () => {
    const prompt = loadPromptModules({ phase: "book_seed" });
    expect(prompt).toContain("BOOK SEED｜わたしの物語（仮）");
    expect(prompt).toContain("完成の確認");
    expect(prompt).toContain("これを読んで、『これは私だ』と言えますか？");
    expect(prompt).toContain("Be True, Be Free.");
  });
});
