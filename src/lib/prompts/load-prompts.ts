import fs from "fs";
import path from "path";
import { ProgramPhase } from "@/types";

const promptCache = new Map<string, string>();

function readPromptFile(relativePath: string): string {
  const cached = promptCache.get(relativePath);
  if (cached) return cached;

  const candidatePaths = [
    path.resolve(process.cwd(), "prompts", relativePath),
    path.resolve(process.cwd(), ".next", "server", "prompts", relativePath),
    path.join(__dirname, "..", "..", "..", "prompts", relativePath),
  ];

  for (const fullPath of candidatePaths) {
    try {
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, "utf-8");
        promptCache.set(relativePath, content);
        return content;
      }
    } catch {
      // continue to next candidate
    }
  }

  console.warn(`[PromptLoader] Prompt file not found: ${relativePath}, using built-in fallback`);
  return `# HON-NEo ${relativePath}\n対話型人生編集者として1ターン1問で優しく寄り添い、本音を引き出してください。`;
}

export function clearPromptCache(): void {
  promptCache.clear();
}

export interface PromptLoadOptions {
  phase: ProgramPhase;
  includeOutputFormats?: boolean;
}

/**
 * 現在のフェーズおよび共通ルールを結合した完全なシステムプロンプトを構築します。
 */
export function loadPromptModules(options: PromptLoadOptions): string {
  const system = readPromptFile("system.md");
  const philosophy = readPromptFile("philosophy.md");
  const rules = readPromptFile("conversation-rules.md");
  const safety = readPromptFile("safety.md");

  let phaseFile = "phases/speak.md";
  if (options.phase === "rest") {
    phaseFile = "phases/rest.md";
  } else if (options.phase === "refine") {
    phaseFile = "phases/refine.md";
  } else if (options.phase === "book_seed") {
    phaseFile = "phases/book-seed.md";
  }

  const phasePrompt = readPromptFile(phaseFile);

  const parts = [
    "=== HON-NEo システム概要と役割 ===",
    system,
    "",
    "=== HON-NEo 基本思想 ===",
    philosophy,
    "",
    "=== HON-NEo 対話ルール ===",
    rules,
    "",
    "=== 現在の進行段階 指示 ===",
    phasePrompt,
    "",
    "=== 安全・倫理・声の原則 ===",
    safety,
  ];

  if (options.includeOutputFormats !== false) {
    const formats = readPromptFile("output-formats.md");
    parts.push("", "=== 出力フォーマット規定 ===", formats);
  }

  return parts.join("\n");
}
