export type PrizeType = "A" | "B" | "C" | "D";

export type PrizeRank = 1 | 2 | 3;

/** Prize ranks indexed by slot (left → right). Always length 4. */
export type PrizeArrangement = PrizeRank[];

export interface PrizeDistribution {
  rank1: number;
  rank2: number;
  rank3: number;
}
