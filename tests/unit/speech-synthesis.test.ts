import { describe, it, expect } from "vitest";
import {
  selectBestJapaneseVoice,
  splitTextIntoSentences,
} from "@/lib/speech/useSpeechSynthesis";

describe("Speech Synthesis Helpers", () => {
  describe("selectBestJapaneseVoice", () => {
    it("should return null when voice list is empty", () => {
      expect(selectBestJapaneseVoice([])).toBeNull();
    });

    it("should return null when no ja voices exist", () => {
      const voices = [
        { name: "Alex", lang: "en-US", default: true } as SpeechSynthesisVoice,
        { name: "Samantha", lang: "en-US", default: false } as SpeechSynthesisVoice,
      ];
      expect(selectBestJapaneseVoice(voices)).toBeNull();
    });

    it("should prioritize high-quality Japanese voice (e.g. Nanami, Google 日本語, Kyoko)", () => {
      const voices = [
        { name: "Generic Ja", lang: "ja-JP", default: true } as SpeechSynthesisVoice,
        { name: "Microsoft Nanami Online (Natural) - Japanese (Japan)", lang: "ja-JP", default: false } as SpeechSynthesisVoice,
      ];
      const selected = selectBestJapaneseVoice(voices);
      expect(selected?.name).toContain("Nanami");
    });

    it("should fallback to default or first ja voice when no preferred voice matches", () => {
      const voices = [
        { name: "Voice A", lang: "ja-JP", default: false } as SpeechSynthesisVoice,
        { name: "Voice B", lang: "ja-JP", default: true } as SpeechSynthesisVoice,
      ];
      const selected = selectBestJapaneseVoice(voices);
      expect(selected?.name).toBe("Voice B");
    });
  });

  describe("splitTextIntoSentences", () => {
    it("should split Japanese text by punctuation marks", () => {
      const text = "こんにちは。本音をお聞きします！準備はいいですか？始めましょう。";
      const sentences = splitTextIntoSentences(text);
      expect(sentences).toEqual([
        "こんにちは。",
        "本音をお聞きします！",
        "準備はいいですか？",
        "始めましょう。",
      ]);
    });

    it("should split by newline", () => {
      const text = "第1章\n私の始まり\n第2章\n変化のとき";
      const sentences = splitTextIntoSentences(text);
      expect(sentences).toEqual([
        "第1章",
        "私の始まり",
        "第2章",
        "変化のとき",
      ]);
    });

    it("should split exceptionally long sentences by comma", () => {
      const longPart1 = "あ".repeat(80);
      const longPart2 = "い".repeat(60);
      const text = `${longPart1}、${longPart2}。`;
      const sentences = splitTextIntoSentences(text);
      expect(sentences.length).toBeGreaterThan(1);
    });
  });
});
