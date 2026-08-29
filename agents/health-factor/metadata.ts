import { buildMetadata } from '../lib/registration.js';

// Our Health Factor agent's registration document.
//
// The category a marketplace can filter on is not a first-class field in ERC-8004 — 8004scan
// surfaces agents by free-text over name/description. So the wording here is load-bearing: it has to
// read naturally to a human AND contain the terms the category shelf searches for ("health factor",
// "liquidation"). Written for the reader first; the keywords fall out of an honest description.
//
// The lineage is real: this ports LIFELINE, an Aave v3 liquidation-rescue agent that won a bounty in
// the KeeperHub hackathon. Its core insight — re-read the health factor ON-CHAIN at execution time,
// because between an agent's decision and its transaction landing the position may have already
// moved — is what this agent brings to BSC lending markets.

export const HEALTH_FACTOR_AGENT = buildMetadata({
  name: 'Sentinel · Health Factor Guard',
  description:
    'Watches Venus and Aave lending positions on BNB Smart Chain and acts before liquidation. ' +
    'Tracks each position’s health factor, the per-asset price at which it would be liquidated, and ' +
    'how far the market must move to get there — then repays or tops up collateral while there is ' +
    'still time. Every rescue re-reads the health factor on-chain at execution time, so a position ' +
    'that recovered on its own is never touched.',
  services: [
    {
      name: 'A2A',
      // Filled with the deployed service URL before registering. The endpoint must be reachable:
      // 8004scan health-checks it, and the service dimension carries the most weight in the score.
      endpoint: process.env.HEALTH_AGENT_ENDPOINT ?? 'https://agent-market.vercel.app/api/agents/health/.well-known/agent-card.json',
      version: '0.3.0',
    },
  ],
});
