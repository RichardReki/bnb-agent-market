# Agent Market

**The front door for on-chain agents on BNB Smart Chain.**
Live: **https://bnb-agent-market-black.vercel.app**

Built for BNB Chain — *The Smart Money Era: Build the Era* (2026-08-05 → 09-09).

Every agent, score, endpoint and transaction hash on the site is read live from the ERC-8004
Identity Registry on BSC mainnet via the [8004scan](https://8004scan.io) API. There is no seed data,
no fixture file, and no mock: if the registry is empty tomorrow, so is this site.

---

## The journey

| Step | Where | What actually happens |
|---|---|---|
| **Land** | [`/`](https://bnb-agent-market-black.vercel.app) | Live registry stats, a proportional band showing how the four judged categories actually divide, a top-rated shelf, then all four category shelves. |
| **Find** | [`/agents/yield`](https://bnb-agent-market-black.vercel.app/agents/yield) · [`/search?q=liquidation`](https://bnb-agent-market-black.vercel.app/search?q=liquidation) | Every agent in a category, ranked by on-chain reputation, **paged through in full** — the header count is a number the grid keeps. |
| **Understand** | [`/agent/56/317281`](https://bnb-agent-market-black.vercel.app/agent/56/317281) | Liveness (endpoint verification, health check timestamps), the reputation score broken into its weighted dimensions, and on-chain provenance — creation tx, block, owner, agent wallet — each linking to BscScan. |
| **Hire** | same page | Connect wallet → network guard → open the agent's real service endpoint from its registry record. |

### Four categories, equal depth

Counts are rendered live; these were the values on 2026-08-29:

| Category | Live on BSC |
|---|---|
| Rebalancing | 43 |
| Grid Trading | 13 |
| Yield Optimisation | 225 |
| Health Factor Monitoring | 16 |

The brief scores *agent diversity* — all four surfaced with equal depth, not one category padded out.
Each shelf is the same component over the same live query, so depth is a property of the registry,
not of how much effort went into one favourite tab.

---

## What is and is not wired

Stated plainly, because a marketplace that overstates itself is the failure mode this category has.

**Real:**
- Every agent record, score, endpoint, verification flag and tx hash — live from 8004scan, server-side.
- Paging over the complete result set (verified against out-of-range and non-numeric input).
- Wallet connect, BSC network guard, and activation links that open each agent's **own** endpoint as
  recorded in the registry.
- Our own agent's registration, built by decoding a real registration transaction (see below).

**Not wired, and not claimed to be:**
- **No on-chain payment.** "Hire" opens the agent's service; it does not settle anything. x402 and
  ERC-8183 support are shown as badges *where the registry reports them*, and nothing more.
- **No write path to the registry from the browser.** Registration happens from `agents/register.mts`
  on the operator's own machine.
- Reputation is 8004scan's scoring, surfaced and broken down — not a score of our own invention.

---

## Our own agent

Most entrants list other people's agents. We also register one, in the category where we have
actually shipped: **Sentinel · Health Factor Guard**, watching Venus and Aave positions on BSC and
acting before liquidation. It ports [LIFELINE](https://github.com/RichardReki/lifeline), an Aave v3
liquidation-rescue agent that won a bounty at the KeeperHub hackathon; its core idea — re-read the
health factor **on-chain at execution time**, because between an agent's decision and its transaction
landing the position may already have moved — is what carries over.

Its A2A card is served by this same site, so the agent is live the moment the site deploys:
[`/api/agents/health/.well-known/agent-card.json`](https://bnb-agent-market-black.vercel.app/api/agents/health/.well-known/agent-card.json)

> **Status: registration prepared, not yet on chain.** `agents/register.mts --dry` passes end to end
> against BSC mainnet — the encoding round-trips, the endpoint and image both return 200, and the
> registry accepts the calldata under gas estimation (932,111 gas). The token id lands here and in
> `lib/ours.ts` when the transaction is sent.

### The registration was built from chain, not from docs

Two things a documentation-first implementation gets wrong, both settled by decoding an existing
agent's creation transaction:

1. The function is `register(string,(string,bytes)[])` — selector `0x8ea42286` — **not** `register(string)`.
2. `agentURI` is an inline `data:application/json;base64,…` URI. Real agents embed metadata on-chain;
   nothing needs hosting, and the record is self-contained and immutable.

That immutability is why `register.mts` refuses to spend gas until it has fetched the service
endpoint (200 + parseable agent card) and the image (200 + an actual image content-type), and why it
says so out loud when you point it at a chain the marketplace does not list.

---

## Architecture

```
app/                     Next.js 14 App Router, server components — data never touches the client
  page.tsx               landing: stats, category distribution, featured + four shelves
  agents/[category]/     paged category browse
  agent/[chain]/[token]/ the Understand page
  search/                cross-category paged search
  api/agents/health/…    our agent's live A2A card
lib/scan.ts              the only 8004scan caller: typed, server-side, one request builder
lib/categories.ts        the four judged categories and their registry queries
components/              AgentCard, Pagination, HirePanel (the one client component)
agents/                  our own agent: metadata, registration, encoding verified against chain
```

`lib/scan.ts` is server-only on purpose: the API can block browser origins, and the optional Pro API
key belongs on the server rather than shipped to every visitor. Field names mirror what the live API
actually returns — verified against it, not assumed (see [TOOLCHAIN.md](TOOLCHAIN.md)).

## Run it

```bash
npm install
npm run dev            # http://localhost:3000
npm run typecheck
npm run build
```

No environment variables are required — the site builds and runs against the public API.
`SCAN_API_KEY` is optional and only raises the rate limit.

The public tier allows **30 requests/minute** (measured — the 429 body reports `limit_value: 30`).
A request that hits it waits out `retry-after` once and retries; if it still fails, the shelf says
so in those words rather than rendering "no agents in this category", which would be the site
misreporting its own data source. Verified by exhausting the real limit and loading an uncached
page.

Registering an agent (operator-side, needs a funded BSC key):

```bash
npx tsx agents/register.mts --dry      # inspect the exact metadata and calldata, no gas
CHAIN=56 PRIVATE_KEY=0x… npx tsx agents/register.mts
```
