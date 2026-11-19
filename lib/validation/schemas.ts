import { z } from "zod";
import { TOTAL_ROUNDS } from "@/config/rounds";

export const playerIdSchema = z.enum(["circle", "triangle", "square", "hexagon"]);
export const prizeTypeSchema = z.enum(["A", "B", "C", "D"]);
export const prizeRankSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export const slotIndexSchema = z.number().int().min(0).max(3);
export const roundNumberSchema = z.number().int().min(1).max(TOTAL_ROUNDS);

export const gameStatusSchema = z.enum([
  "idle",
  "preparing",
  "locked",
  "countdown",
  "simulating",
  "validating",
  "invalid",
  "revealing",
  "completed",
  "finished",
]);

export const invalidReasonSchema = z.enum([
  "duplicate_slot",
  "timeout",
  "stuck",
  "missing_landing",
  "interrupted",
  "physics_error",
]);

export const roundConfigSchema = z.object({
  roundNumber: roundNumberSchema,
  prizeType: prizeTypeSchema,
});

export const roundConfigsSchema = z.array(roundConfigSchema).length(TOTAL_ROUNDS);

export const arrangementSchema = z.array(prizeRankSchema).length(4);

/** Random ball spawn of a round (old saves without it are still accepted). */
export const spawnSchema = z
  .array(z.object({ playerId: playerIdSchema, x: z.number().finite(), y: z.number().finite() }))
  .length(4)
  .refine((s) => new Set(s.map((p) => p.playerId)).size === 4, "spawn must contain each player once");

export const landingEventSchema = z.object({
  playerId: playerIdSchema,
  slotIndex: slotIndexSchema,
});

export const attemptRecordSchema = z.object({
  attempt: z.number().int().min(1),
  reason: invalidReasonSchema,
  landings: z.array(landingEventSchema).max(4),
  at: z.string(),
});

export const activeRoundSchema = z.object({
  roundNumber: roundNumberSchema,
  prizeType: prizeTypeSchema,
  spawn: spawnSchema.optional(),
  arrangement: arrangementSchema,
  lockedAt: z.string(),
  attempt: z.number().int().min(1),
  invalidAttempts: z.array(attemptRecordSchema),
});

export const roundResultSchema = z.object({
  roundNumber: roundNumberSchema,
  prizeType: prizeTypeSchema,
  spawn: spawnSchema.optional(),
  arrangement: arrangementSchema,
  placements: z
    .array(z.object({ playerId: playerIdSchema, slotIndex: slotIndexSchema, prize: prizeRankSchema }))
    .length(4),
  attempt: z.number().int().min(1),
  completedAt: z.string(),
});

export const playerStatsSchema = z.object({
  playerId: playerIdSchema,
  rank1: z.number().int().min(0),
  rank2: z.number().int().min(0),
  rank3: z.number().int().min(0),
  total: z.number().int().min(0),
  roundsCompleted: z.number().int().min(0),
});

export const gameSessionSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: gameStatusSchema,
  currentRound: roundNumberSchema,
  roundConfigs: roundConfigsSchema,
  activeRound: activeRoundSchema.nullable(),
  pendingArrangement: z
    .object({
      roundNumber: roundNumberSchema,
      prizeType: prizeTypeSchema,
      arrangement: arrangementSchema,
      spawn: spawnSchema.optional(),
    })
    .nullable()
    .optional(),
  invalidReason: invalidReasonSchema.nullable(),
  results: z.array(roundResultSchema).max(TOTAL_ROUNDS),
  playerStats: z.array(playerStatsSchema).length(4),
  totalRetries: z.number().int().min(0),
});

export const languageSchema = z.enum(["th", "en"]);
