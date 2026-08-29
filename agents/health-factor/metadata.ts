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

// Everything the registration points at lives on one host, so it is named once. The agentURI is an
// inline base64 data URI: written once into registry storage, never updatable. A URL that is wrong
// or dead here cannot be corrected on that token — which is why register.mts fetches both of these
// before it will spend gas, and why the default is a domain we have actually deployed and checked
// rather than a placeholder.
const SITE = (process.env.AGENT_SITE_URL ?? 'https://bnb-agent-market-black.vercel.app').replace(/\/+$/, '');

// https in production; plain http is allowed only against a local host so the whole registration
// path can be rehearsed against `next start` before the site is deployed.
const localhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(SITE);
if (!/^https:\/\//.test(SITE) && !localhost) {
  throw new Error(`AGENT_SITE_URL must be an https:// origin (or http://localhost for a rehearsal), got: ${SITE}`);
}

export const HEALTH_FACTOR_AGENT = buildMetadata({
  name: 'Sentinel · Health Factor Guard',
  description:
    'Watches Venus and Aave lending positions on BNB Smart Chain and acts before liquidation. ' +
    'Tracks each position’s health factor, the per-asset price at which it would be liquidated, and ' +
    'how far the market must move to get there — then repays or tops up collateral while there is ' +
    'still time. Every rescue re-reads the health factor on-chain at execution time, so a position ' +
    'that recovered on its own is never touched.',
  // 8004scan re-hosts whatever this points at onto its own media CDN, so it has to be reachable at
  // index time. Most registered agents leave it empty and render as a blank tile; having one is
  // cheap visual ground on every shelf the agent appears on, including ours.
  image: `${SITE}/agent-sentinel.png`,
  services: [
    {
      name: 'A2A',
      // 8004scan health-checks this endpoint, and the service dimension carries the most weight in
      // the reputation score — an unreachable card drags the agent down no matter how good it is.
      endpoint: `${SITE}/api/agents/health/.well-known/agent-card.json`,
      version: '0.3.0',
    },
  ],
});
