import { describe, it, expect } from "vitest";
import { sanitizeForSpeech } from "@/lib/speech/sanitize-text";

describe("Speech Text Sanitizer", () => {
  it("should handle empty or null string", () => {
    expect(sanitizeForSpeech("")).toBe("");
  });

  it("should remove markdown headers and symbols", () => {
    const input = "# タイトル\n## サブタイトル\n### 小見出し";
    const expected = "タイトル\nサブタイトル\n小見出し";
    expect(sanitizeForSpeech(input)).toBe(expected);
  });

  it("should remove markdown emphasis and bold", () => {
    const input = "これは **太字** です。そして *斜体* です。__下線強調__ もあります。";
    const expected = "これは 太字 です。そして 斜体 です。下線強調 もあります。";
    expect(sanitizeForSpeech(input)).toBe(expected);
  });

  it("should extract link texts and remove URLs", () => {
    const input = "詳細はこちらの [リンクテキスト](https://example.com) をご覧ください。https://foo.bar も参照。";
    const expected = "詳細はこちらの リンクテキスト をご覧ください。 も参照。";
    expect(sanitizeForSpeech(input)).toBe(expected);
  });

  it("should remove code blocks and inline code markers", () => {
    const input = "以下のコマンド `npm run test` を実行します。\n```bash\nconst a = 1;\n```\n完了です。";
    const expected = "以下のコマンド npm run test を実行します。\n完了です。";
    expect(sanitizeForSpeech(input)).toBe(expected);
  });

  it("should convert list bullets to natural separators", () => {
    const input = "- 項目1\n* 項目2\n+ 項目3";
    const expected = "・項目1\n・項目2\n・項目3";
    expect(sanitizeForSpeech(input)).toBe(expected);
  });

  it("should remove horizontal rules and blockquotes", () => {
    const input = "> 引用文です。\n---\n次の段落です。";
    const expected = "引用文です。\n次の段落です。";
    expect(sanitizeForSpeech(input)).toBe(expected);
  });
});
