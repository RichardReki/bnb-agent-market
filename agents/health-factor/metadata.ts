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

// The registration is irreversible: the agentURI is an inline base64 data URI, written once into
// registry storage and never updatable. A wrong endpoint here is a permanently dead service link on
// an agent whose score is dominated by the service dimension — so there is no safe default. Refusing
// to build without the deployed URL is cheaper than burning a token_id on a typo.
const endpoint = process.env.HEALTH_AGENT_ENDPOINT;
if (!endpoint) {
  throw new Error(
    'HEALTH_AGENT_ENDPOINT is not set.\n' +
      'Set it to the DEPLOYED agent-card URL before registering, e.g.\n' +
      '  HEALTH_AGENT_ENDPOINT=https://<your-app>.vercel.app/api/agents/health/.well-known/agent-card.json\n' +
      'Verify it returns 200 with `curl -sI "$HEALTH_AGENT_ENDPOINT"` first — the URI is immutable once registered.',
  );
}
// https in production; plain http is allowed only against a local host so the whole registration
// path can be rehearsed against `next start` before the site is deployed.
const localhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(endpoint);
if (!/^https:\/\//.test(endpoint) && !localhost) {
  throw new Error(`HEALTH_AGENT_ENDPOINT must be an https:// URL (or http://localhost for a rehearsal), got: ${endpoint}`);
}

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
      // 8004scan health-checks this endpoint, and the service dimension carries the most weight in
      // the reputation score — an unreachable card drags the agent down no matter how good it is.
      endpoint,
      version: '0.3.0',
    },
  ],
});
