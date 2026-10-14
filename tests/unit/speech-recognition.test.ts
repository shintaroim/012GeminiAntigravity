import { describe, it, expect } from "vitest";
import {
  extractTranscriptFromResultList,
  combineBaseAndSpeechText,
} from "@/lib/speech/useSpeechRecognition";

describe("Speech Recognition Unit Tests", () => {
  describe("extractTranscriptFromResultList", () => {
    it("should correctly separate final and interim transcripts without duplicates", () => {
      const mockResults = [
        {
          isFinal: true,
          0: { transcript: "こんにちは。" },
        },
        {
          isFinal: true,
          0: { transcript: "今日は良い天気ですね。" },
        },
        {
          isFinal: false,
          0: { transcript: "これから" },
        },
      ];

      const { finalStr, interimStr } = extractTranscriptFromResultList(mockResults as any);

      expect(finalStr).toBe("こんにちは。今日は良い天気ですね。");
      expect(interimStr).toBe("これから");
    });

    it("should return empty strings when results are empty", () => {
      const { finalStr, interimStr } = extractTranscriptFromResultList([] as any);
      expect(finalStr).toBe("");
      expect(interimStr).toBe("");
    });

    it("should handle purely interim transcripts during recognition", () => {
      const mockResults = [
        {
          isFinal: false,
          0: { transcript: "認識中..." },
        },
      ];

      const { finalStr, interimStr } = extractTranscriptFromResultList(mockResults as any);
      expect(finalStr).toBe("");
      expect(interimStr).toBe("認識中...");
    });
  });

  describe("combineBaseAndSpeechText", () => {
    it("should return base text if speech is empty", () => {
      expect(combineBaseAndSpeechText("既存のテキスト", "")).toBe("既存のテキスト");
      expect(combineBaseAndSpeechText("既存のテキスト", "   ")).toBe("既存のテキスト");
    });

    it("should return speech text if base is empty", () => {
      expect(combineBaseAndSpeechText("", "音声テキスト")).toBe("音声テキスト");
      expect(combineBaseAndSpeechText("   ", "音声テキスト")).toBe("音声テキスト");
    });

    it("should append speech text with a space if base text does not end with punctuation or whitespace", () => {
      const result = combineBaseAndSpeechText("私の名前は", "田中です");
      expect(result).toBe("私の名前は 田中です");
    });

    it("should not append redundant space if base text ends with Japanese punctuation", () => {
      const withPeriod = combineBaseAndSpeechText("こんにちは。", "本音です。");
      expect(withPeriod).toBe("こんにちは。本音です。");

      const withQuestion = combineBaseAndSpeechText("どうですか？", "教えてください。");
      expect(withQuestion).toBe("どうですか？教えてください。");

      const withExclamation = combineBaseAndSpeechText("やったー！", "次へ進みます。");
      expect(withExclamation).toBe("やったー！次へ進みます。");

      const withComma = combineBaseAndSpeechText("実は、", "そうなんです。");
      expect(withComma).toBe("実は、そうなんです。");
    });

    it("should not append redundant space if base text already ends with whitespace", () => {
      const result = combineBaseAndSpeechText("先頭テキスト ", "追加テキスト");
      expect(result).toBe("先頭テキスト 追加テキスト");
    });

    it("should respect maxChars limit", () => {
      const longBase = "A".repeat(1990);
      const longSpeech = "B".repeat(20);
      const combined = combineBaseAndSpeechText(longBase, longSpeech, 2000);
      expect(combined.length).toBe(2000);
    });

    it("should simulate consecutive speech sessions without duplicate text growth", () => {
      // 1回目のセッション
      let currentInput = "";
      const session1Speech = "こんにちは。";
      currentInput = combineBaseAndSpeechText(currentInput, session1Speech);
      expect(currentInput).toBe("こんにちは。");

      // 2回目のセッション（1回目の結果をベースとして引き継ぐ）
      const baseForSession2 = currentInput;
      const session2Speech = "私の本音を聞いてください。";
      currentInput = combineBaseAndSpeechText(baseForSession2, session2Speech);
      expect(currentInput).toBe("こんにちは。私の本音を聞いてください。");

      // 3回目のセッション（さらに継続）
      const baseForSession3 = currentInput;
      const session3Speech = "よろしくお願いします。";
      currentInput = combineBaseAndSpeechText(baseForSession3, session3Speech);
      expect(currentInput).toBe("こんにちは。私の本音を聞いてください。よろしくお願いします。");
    });
  });
});
