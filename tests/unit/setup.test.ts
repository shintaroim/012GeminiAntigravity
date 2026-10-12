import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { z } from "zod";

describe("Phase 0: Environment & Core Setup", () => {
  it("should have source prompt stored in docs/source-prompt-v1.0.md", () => {
    const promptPath = path.resolve(process.cwd(), "docs/source-prompt-v1.0.md");
    expect(fs.existsSync(promptPath)).toBe(true);

    const content = fs.readFileSync(promptPath, "utf-8");
    expect(content).toContain("HON-NEo（ホンネヲ）出版");
    expect(content).toContain("MY 7 STORIES");
    expect(content).toContain("MY 3 COMPASS");
    expect(content).toContain("BOOK SEED");
  });

  it("should validate schemas with Zod", () => {
    const TestSchema = z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1),
    });

    const parsed = TestSchema.parse({
      role: "user",
      content: "ほんね",
    });

    expect(parsed.role).toBe("user");
    expect(parsed.content).toBe("ほんね");
  });

  it("should have ADR 001 recorded", () => {
    const adrPath = path.resolve(process.cwd(), "docs/decisions/001-project-setup-and-tech-stack.md");
    expect(fs.existsSync(adrPath)).toBe(true);
  });
});
