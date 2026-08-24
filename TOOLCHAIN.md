# Toolchain — verified against reality (2026-08-24)

Everything below was confirmed hands-on, not assumed. Build against these.

## Data backbone: 8004scan API (the marketplace's live data source) — VERIFIED LIVE
- Base: `https://api.8004scan.io/api/v1` (mirror `https://8004scan.io/api/v1/public`).
- **OpenAPI is fully open**: `https://api.8004scan.io/openapi.json` (148 endpoints) — the exact contract.
- Auth: optional `X-API-Key` (the hackathon "Pro" tier, 500 req/min via forms.gle/jQevEPCAacBXaKG79). Works unauthenticated at low rate for dev.
- Key endpoints: `GET /agents` (filter+paginate+search), `GET /agents/{chain_id}/{token_id}` (detail), `GET /stats/global`, `GET /chains`, `GET /agents/trending|latest|leaderboard`.
- `/agents` params: `chain_id, search, sort_by, sort_order, oasf_skill, oasf_domain, has_mcp, has_a2a, x402_supported, is_registered, is_active, min_feedbacks, supported_protocol, limit, offset`.
- Response `data[]` agent fields (marketplace-ready): `name, description, image_url, total_score, average_score, health_score, star_count, total_feedbacks, is_verified, network_rank, rank, supported_protocols, x402_supported, owner_*, token_id, chain_id, contract_address`.
- **BSC (chain 56) live category counts (search=): rebalancing 41 · grid trading 7 · yield 151 · health-factor 12.** All four are populated → indexing existing agents alone can clear the "equal depth" bar; our own agents are the differentiation layer.
- CORS: the API may block browser-origin calls → read it **server-side** (Next.js route handlers / server components), never from the client.

## ERC-8004 (agent identity registry) on BSC — where agents "live"
- Identity Registry (mainnet, canonical vanity): `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` (chain 56).
  Testnet (chain 97): `0x8004A818BFB912233c491871b3d84c89A494BD9e`.
- ⚠️ A DIFFERENT registry (`0xfA09B3...`) exists in the BRC8004 repo — **before registering our own agents, confirm which one 8004scan actually indexes on BSC** (register on testnet first, verify it appears on 8004scan, then mainnet).
- Registration is permissionless: call `register(agentURI)` from the owner wallet → mints the agent NFT; 8004scan auto-indexes the `Registered` event (no manual submission). `agentURI` is a hosted JSON (name/description/endpoints/skills) — **the "category" the marketplace filters on is encoded here**.

## BNB Agent Studio (to deploy our own 4 agents) — the differentiation layer
- Agents run OFF-CHAIN (AWS Bedrock AgentCore); only IDENTITY (ERC-8004 NFT) + shared ERC-8183 commerce contracts are on-chain (BNB already deployed those).
- Leanest path for us = SDK-direct: `pip install bnbagent` → `ERC8004Agent(network="bsc-testnet", wallet_provider=...).register_agent(...)` (~15 lines, gas-free on testnet). Studio CLI (`npm i -g @bnbagent/studio-cli`, `bag ...`) is the managed/one-prompt path.
- No prebuilt rebalancing/grid/yield/health-factor templates — each is the same skeleton with our strategy in `handle_fulfill()`/`on_funded()` + a distinct ERC-8004 registration.

## Reuse (honest)
- Health-Factor ← LIFELINE (strongest, ~1.5d): HealthFactorLens.sol + monitor loop → BSC Aave.
- Rebalancing ← RotorVault (~2d): vault core + allocate(); rebuild the oracle veto on a BSC oracle (Binance Oracle/Chainlink).
- Yield ← RotorVault (~1d marginal): same vault, venue-routing half; APY over a BSC venue (Venus).
- Grid ← RotorEdge (~3d, mostly NEW): RotorEdge is a Python backtester — live PancakeSwap grid execution is a near-rebuild.

## Stack decision
Next.js 14 (App Router) + TS on Vercel · wagmi/viem/RainbowKit (BSC) · data layer = 8004scan API (server-side) + viem BSC publicClient for each agent's live on-chain state (vault NAV, monitored HF, grid legs).
