import { z } from "zod";
import { ProgramPhase } from "@/types";

// ==============================================================================
// Zod スキーマ定義
// ==============================================================================

export const VerbatimQuoteSchema = z.object({
  id: z.string(),
  messageId: z.string(), // 発言元のユーザーメッセージID
  text: z.string().min(1),
  createdAt: z.string(),
});

export const EpisodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  quoteIds: z.array(z.string()).default([]),
  status: z.enum(["candidate", "hypothesis", "rejected", "approved", "archived"]).default("candidate"),
});

export const ValueHypothesisSchema = z.object({
  id: z.string(),
  name: z.string(),
  reason: z.string(),
  counterEvidence: z.string().nullable().default(null),
  status: z.enum(["candidate", "hypothesis", "rejected", "approved", "archived"]).default("hypothesis"),
});

export const RejectedWordSchema = z.object({
  id: z.string(),
  wordOrInterpretation: z.string(), // 利用者が否定した言葉・解釈
  userCorrection: z.string(),       // 利用者が語った本音や訂正
  rejectedAt: z.string(),
});

export const UnresolvedItemSchema = z.object({
  id: z.string(),
  topic: z.string(),
  note: z.string(),
});

export const StoryCandidateSchema = z.object({
  id: z.string(),
  storyNumber: z.number().optional(),
  title: z.string(),
  whatHappened: z.string(),
  connectionToPresent: z.string(),
  quoteIds: z.array(z.string()).default([]),
  status: z.enum(["candidate", "hypothesis", "rejected", "approved", "archived"]).default("candidate"),
});

export const CompassCandidateSchema = z.object({
  id: z.string(),
  compassNumber: z.number().optional(),
  name: z.string(),
  definition: z.string(),
  question: z.string(),
  sourceStoryIds: z.array(z.string()).default([]),
  status: z.enum(["candidate", "hypothesis", "rejected", "approved", "archived"]).default("candidate"),
});

export const ApprovedStorySchema = z.object({
  storyNumber: z.number().min(1).max(7),
  title: z.string(),
  originalEvent: z.string(),
  whatHappened: z.string(),
  atThatTime: z.string(),
  howFeltReally: z.string(),
  whatIChose: z.string(),
  whatIDidNotChoose: z.string(),
  reflectionNow: z.string(),
  whatRemained: z.string(),
  verbatimQuote: z.string(),
  connectedCompass: z.string(),
});

export const ApprovedCompassSchema = z.object({
  compassNumber: z.number().min(1).max(3),
  name: z.string(),
  definition: z.string(),
  question: z.string(),
  groundedStories: z.array(z.string()),
});

export const SessionStateSchema = z.object({
  phase: z.enum(["speak", "rest", "refine", "book_seed"]).default("speak"),
  turnCount: z.number().default(0),
  lastSummaryTurn: z.number().default(0),
  summary: z.string().nullable().default(null),
  verbatimQuotes: z.array(VerbatimQuoteSchema).default([]),
  episodes: z.array(EpisodeSchema).default([]),
  valueHypotheses: z.array(ValueHypothesisSchema).default([]),
  rejectedWords: z.array(RejectedWordSchema).default([]),
  unresolvedItems: z.array(UnresolvedItemSchema).default([]),
  storyCandidates: z.array(StoryCandidateSchema).default([]),
  compassCandidates: z.array(CompassCandidateSchema).default([]),
  approvedStories: z.array(ApprovedStorySchema).default([]),
  approvedCompasses: z.array(ApprovedCompassSchema).default([]),
  lifeRedefinition: z.string().nullable().default(null),
  completionConfirmed: z.boolean().default(false),
});

export type VerbatimQuote = z.infer<typeof VerbatimQuoteSchema>;
export type Episode = z.infer<typeof EpisodeSchema>;
export type ValueHypothesis = z.infer<typeof ValueHypothesisSchema>;
export type RejectedWord = z.infer<typeof RejectedWordSchema>;
export type UnresolvedItem = z.infer<typeof UnresolvedItemSchema>;
export type StoryCandidate = z.infer<typeof StoryCandidateSchema>;
export type CompassCandidate = z.infer<typeof CompassCandidateSchema>;
export type ApprovedStory = z.infer<typeof ApprovedStorySchema>;
export type ApprovedCompass = z.infer<typeof ApprovedCompassSchema>;
export type SessionState = z.infer<typeof SessionStateSchema>;

export function createInitialState(phase: ProgramPhase = "speak"): SessionState {
  return {
    phase,
    turnCount: 0,
    lastSummaryTurn: 0,
    summary: null,
    verbatimQuotes: [],
    episodes: [],
    valueHypotheses: [],
    rejectedWords: [],
    unresolvedItems: [],
    storyCandidates: [],
    compassCandidates: [],
    approvedStories: [],
    approvedCompasses: [],
    lifeRedefinition: null,
    completionConfirmed: false,
  };
}

export function parseSessionState(raw: unknown): SessionState {
  const result = SessionStateSchema.safeParse(raw);
  if (result.success) {
    return result.data;
  }
  console.warn("Invalid SessionState detected, falling back with defaults:", result.error);
  return createInitialState();
}
