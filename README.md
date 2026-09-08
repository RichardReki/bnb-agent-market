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
| **Understand** | [`/agent/56/269228`](https://bnb-agent-market-black.vercel.app/agent/56/269228) | Liveness (endpoint verification, health check timestamps), the reputation score broken into its weighted dimensions, and on-chain provenance — creation tx, block, owner, agent wallet — each linking to BscScan. |
| **Hire** | same page | Connect wallet → network guard → open the agent's real service endpoint from its registry record. |

### Four categories, equal depth

Counts are rendered live; these were the values on 2026-09-08:

| Category | Live on BSC |
|---|---|
| Rebalancing | 57 |
| Grid Trading | 20 |
| Yield Optimisation | 305 |
| Health Factor Monitoring | 29 |

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
- The registration path, built by decoding a real registration transaction (see below) — the write
  side of ERC-8004, understood and exercised, though nothing of ours is listed here.

**Not wired, and not claimed to be:**
- **No on-chain payment.** "Hire" opens the agent's service; it does not settle anything. x402 and
  ERC-8183 support are shown as badges *where the registry reports them*, and nothing more.
- **No write path to the registry from the browser.** Registration happens from `agents/register.mts`
  on the operator's own machine.
- Reputation is 8004scan's scoring, surfaced and broken down — not a score of our own invention.

---

## Why nothing here is ours

An earlier plan had us registering our own agents and badging them on their shelves. The code for it
existed and is gone, deliberately.

The prize this is built for is "official adoption as the BNB Agent Studio marketplace, the canonical
front door for every agent on BSC". A canonical front door whose operator inserts their own agent and
gives it a distinguishing mark is not neutral, and neutrality is most of what makes a front door
worth adopting. The instinct is wrong at any scale, and at this scale it is also pointless: there are
over four hundred agents in the four categories already, so one more changes nothing except who owns
it.

What survives is the part that was actually worth having. `agents/` contains a complete, working
registration path — metadata built to the live on-chain schema, an A2A card served from this site at
[`/api/agents/health/.well-known/agent-card.json`](https://bnb-agent-market-black.vercel.app/api/agents/health/.well-known/agent-card.json),
and `register.mts`, which refuses to spend gas until it has verified the encoding round-trips, the
service endpoint answers, the image resolves, and the chain is the one the marketplace actually
lists. Understanding the write side is what makes the read side trustworthy; listing ourselves was
never the part that demonstrated it.

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
  api/agents/health/…    a live A2A card, served for the registration path in agents/
lib/scan.ts              the only 8004scan caller: typed, server-side, one request builder
lib/categories.ts        the four judged categories and their registry queries
components/              AgentCard, Pagination, HirePanel (the one client component)
agents/                  the ERC-8004 registration path, decoded from a real on-chain transaction
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

### Surviving the data source

8004scan is not dependable, and this is judged over a two-week window. Measured over one afternoon it
returned `500 DATABASE_ERROR` for ten minutes, took 27 seconds on the list endpoint, timed out
entirely on `/stats/global`, and 500'd on search. Anonymous access is also capped at **30 requests a
minute and 1,000 a day** — the daily figure being the one that decides whether a site survives people
actually browsing it.

Four layers, each of which says what it is doing:

1. A request that hits the rate limit waits out `retry-after` once. Everything is bounded at eight
   seconds, because a page that answers in 27 has already lost the visitor.
2. Next's own data cache, which absorbs most short outages on a warm instance.
3. The last good response this process saw, served with its age attached.
4. **`data/snapshot.json`**, committed with the source, so even a cold instance with an unreachable
   upstream renders a full page of real BSC agents — and search still works, against the agents in it.

What none of the layers do is guess. An empty category and an unreachable registry are different
claims and are worded differently; a registry that answers "no such agent" produces a 404 while a
registry that does not answer produces a page saying so; and data that is not current always says how
old it is. Verified by pointing the app at a dead port from a cold start: every category page renders
in under 60ms with a full shelf, correctly labelled.

Refresh the floor with `node tools/snapshot.mjs`.

Registering an agent (operator-side, needs a funded BSC key):

```bash
npx tsx agents/register.mts --dry      # inspect the exact metadata and calldata, no gas
CHAIN=56 PRIVATE_KEY=0x… npx tsx agents/register.mts
```
