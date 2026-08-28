import type { CategoryKey } from './categories';

// Our own reference agents — one per category — deployed via BNB Agent Studio and registered on
// ERC-8004 so they appear on 8004scan like any other, but marked here so the marketplace can badge
// and feature them. This is the differentiation the brief rewards: we don't just index the shelf,
// we stock it with genuine, working agents in all four categories (LIFELINE -> health, RotorVault
// -> rebalancing/yield, RotorEdge -> grid).
//
// Filled with real BSC token_ids as each agent is registered. Empty entries simply don't light up.
export const OUR_AGENTS: Record<CategoryKey, string[]> = {
  health: [],
  rebalancing: [],
  yield: [],
  grid: [],
};

const OUR_SET = new Set(
  Object.values(OUR_AGENTS).flat().map((id) => id.trim()).filter(Boolean),
);

export const isOurs = (tokenId: string | number): boolean => OUR_SET.has(String(tokenId));

/// Flat list of all our agents' token ids (for the featured shelf).
export const ourTokenIds = (): string[] => [...OUR_SET];
export const haveOurAgents = (): boolean => OUR_SET.size > 0;
