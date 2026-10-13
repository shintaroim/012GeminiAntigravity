/**
 * マークダウンや装飾記号を除去・整形し、音声読み上げ（TTS）に適した自然なテキストに変換します。
 */
export function sanitizeForSpeech(text: string): string {
  if (!text) return "";

  let cleaned = text;

  // 1. コードブロックの除去 (```...```)
  cleaned = cleaned.replace(/```[\s\S]*?```/g, "");

  // 2. インラインコードのバッククォート除去 (`code` -> code)
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

  // 3. マークダウンリンクの置換 ([テキスト](URL) -> テキスト)
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // 4. URL単体の除去または置換
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, "");

  // 5. 見出し記号 (#, ##, ...) の除去
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");

  // 6. 水平線 (---, ***, ___) の除去
  cleaned = cleaned.replace(/^[-*_]{3,}\s*$/gm, "");

  // 7. 引用記号 (>) の除去
  cleaned = cleaned.replace(/^>\s?/gm, "");

  // 8. 箇条書き記号 (-, *, +) を自然な区切りに変換
  cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, "・");

  // 9. 太字・斜体記号 (**, *, __, _) の除去
  cleaned = cleaned.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1");

  // 10. 取り消し線 (~~text~~) の除去
  cleaned = cleaned.replace(/~~([^~]+)~~/g, "$1");

  // 11. 連続する改行を1つの句読点または読点付き改行に正規化
  // 箇条書きや段落の変わり目で少し間を取らせるため、改行直前に句読点がなければ「、」を補う等も検討できるが、
  // 余計な読点を増やしすぎないよう、単純に2つ以上の改行を整理
  cleaned = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");

  return cleaned.trim();
}
