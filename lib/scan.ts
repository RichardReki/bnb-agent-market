// The marketplace's data backbone: a thin, typed, SERVER-SIDE wrapper over the live 8004scan API
// (the ERC-8004 agent registry explorer). Verified against the real API on 2026-08-24 — see
// TOOLCHAIN.md. Read it server-side only: the API can block browser-origin (CORS), and an API key
// (the hackathon Pro tier) belongs on the server, never shipped to the client.
//
// Fields mirror what the live /agents response actually returns; nothing here is assumed.

const BASE = 'https://api.8004scan.io/api/v1';
export const BSC_CHAIN_ID = 56;

// Optional Pro key (500 req/min). Set SCAN_API_KEY in the environment once granted.
const API_KEY = process.env.SCAN_API_KEY;

export interface Agent {
  token_id: string;
  chain_id: number;
  contract_address: string;
  name: string | null;
  description: string | null;
  image_url: string | null;
  total_score: number | null;
  average_score: number | null;
  health_score: number | null;
  star_count: number | null;
  total_feedbacks: number | null;
  is_verified: boolean | null;
  network_rank: number | null;
  rank: number | null;
  supported_protocols: string[] | null;
  x402_supported: boolean | null;
  owner_address: string | null;
  owner_username: string | null;
  owner_certified_name: string | null;
}

export interface AgentService {
  endpoint?: string | null;
  version?: string | null;
  skills?: unknown[] | null;
  tools?: unknown[] | null;
}

/// The full detail record — a superset of Agent with the liveness, service, and provenance fields
/// the "Understand" page renders. Names mirror the real /agents/{chain}/{token} response.
export interface AgentDetail extends Agent {
  agent_id: string | null;
  agent_wallet: string | null;
  creator_address: string | null;
  is_active: boolean | null;
  is_endpoint_verified: boolean | null;
  endpoint_verified_domain: string | null;
  health_status: unknown;
  freshness_score: number | null;
  activity_score: number | null;
  quality_score: number | null;
  metadata_completeness_score: number | null;
  health_checked_at: string | null;
  endpoint_last_checked_at: string | null;
  created_at: string | null;
  created_tx_hash: string | null;
  created_block_number: number | null;
  supported_protocols: string[] | null;
  supported_trust_models: string[] | null;
  categories: string[] | null;
  services: { a2a?: AgentService; mcp?: AgentService; web?: AgentService } | null;
  scores: { breakdown?: { dimensions?: Record<string, { score?: number; weight?: number }> } } | null;
}

/// The reputation sub-scores (0–100) that make up an agent's total, best first by weight. Empty if
/// the agent has no scoring breakdown yet.
export function reputationDimensions(a: AgentDetail): { key: string; label: string; score: number; weight: number }[] {
  const dims = a.scores?.breakdown?.dimensions;
  if (!dims) return [];
  const labels: Record<string, string> = {
    service: 'Service',
    engagement: 'Engagement',
    publisher: 'Publisher',
    compliance: 'Compliance',
    momentum: 'Momentum',
  };
  return Object.entries(dims)
    .map(([key, v]) => ({ key, label: labels[key] ?? key, score: Number(v?.score ?? 0), weight: Number(v?.weight ?? 0) }))
    .sort((x, y) => y.weight - x.weight);
}

export interface GlobalStats {
  total_agents: number | null;
  daily_new_agents: number | null;
  average_feedback_score: number | null;
}

interface Query {
  search?: string;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  x402_supported?: boolean;
  has_mcp?: boolean;
}

/// The upstream rate limit is 30 requests/minute without an API key — measured, not guessed: the
/// 429 body reports `limit_value: 30, limit_type: "minute"` and the response carries `retry-after`.
/// Browsing four category shelves and a few agents can reach that during a judging session, so a
/// burst is a normal condition here rather than an exceptional one.
///
/// Two responses to it, in order. First, honour `retry-after` once for a short wait, because most
/// bursts are one request over a boundary that is seconds from resetting. Second — and this is the
/// part that matters — a request that still fails must not take a page down with it: see the
/// `degraded` flag below.
async function get(path: string, params: Record<string, string | number | boolean> = {}, revalidate = 60) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const send = () =>
    fetch(url, {
      headers: { 'user-agent': 'agent-market/0.1', ...(API_KEY ? { 'X-API-Key': API_KEY } : {}) },
      // Short cache: "real-time data quality" is a judged criterion, so keep it fresh but do not
      // hammer the rate limit on every request.
      next: { revalidate },
    });

  let res = await send();
  if (res.status === 429) {
    // Capped low on purpose: a visitor waiting is worse than a shelf that says why it is empty.
    const wait = Math.min(Number(res.headers.get('retry-after') ?? 1) * 1000, 2500);
    await new Promise((r) => setTimeout(r, wait));
    res = await send();
  }
  if (!res.ok) throw new Error(`8004scan ${res.status} ${path}`);
  return res.json();
}

export interface Shelf {
  agents: Agent[];
  total: number;
  /// True when the upstream request failed — rate limit, outage — rather than the registry genuinely
  /// having nothing to return. The two must render differently: "this category is empty" is a claim
  /// about BSC, "we could not reach the registry" is a claim about us, and showing the first when the
  /// second is true is the site lying about its own data. Never throws, so a bad minute upstream
  /// degrades one shelf instead of returning a 500 to whoever is looking.
  degraded?: boolean;
}

/// One page of agents matching `query` on BSC (best first) AND the total count, in ONE call — the
/// /agents response carries `items` + `total` together, so the landing needs four requests, not
/// eight. A category shelf and a free-text search are the same request with a different term, so
/// this backs both; `offset` is what lets the browse pages page through the full total.
export async function shelf(query: string, opts: Query = {}): Promise<Shelf> {
  try {
    const j = (await get('/agents', {
      chain_id: BSC_CHAIN_ID,
      search: query,
      is_registered: true,
      sort_by: opts.sort_by ?? 'total_score',
      sort_order: opts.sort_order ?? 'desc',
      limit: opts.limit ?? 24,
      offset: opts.offset ?? 0,
      ...(opts.x402_supported ? { x402_supported: true } : {}),
      ...(opts.has_mcp ? { has_mcp: true } : {}),
    })) as { items?: Agent[]; data?: Agent[]; total?: number };
    const agents = (j.items ?? j.data ?? []) as Agent[];
    return { agents, total: j.total ?? agents.length };
  } catch {
    return { agents: [], total: 0, degraded: true };
  }
}

/// One agent's full record for the detail (Understand) page. Short cache — freshness is judged.
export async function agentDetail(chainId: number, tokenId: string): Promise<AgentDetail | null> {
  try {
    const j = await get(`/agents/${chainId}/${tokenId}`, {}, 20);
    const rec = (j as { data?: AgentDetail }).data ?? (j as AgentDetail);
    return (rec as AgentDetail) ?? null;
  } catch {
    return null;
  }
}

export async function globalStats(): Promise<GlobalStats> {
  try {
    const j = await get('/stats/global', {}, 300);
    const d = (j as { data?: GlobalStats }).data ?? (j as GlobalStats);
    return d as GlobalStats;
  } catch {
    return { total_agents: null, daily_new_agents: null, average_feedback_score: null };
  }
}

/// The cream across every category on BSC — highest on-chain reputation first — for the landing's
/// featured shelf. A natural front door: the agents most worth a first-timer's trust.
export async function topAgents(limit = 8): Promise<Agent[]> {
  try {
    const j = (await get('/agents', {
      chain_id: BSC_CHAIN_ID,
      is_registered: true,
      sort_by: 'total_score',
      sort_order: 'desc',
      limit,
    })) as { items?: Agent[]; data?: Agent[] };
    return (j.items ?? j.data ?? []) as Agent[];
  } catch {
    // A bonus shelf: the landing already renders nothing when it is empty, so failing quietly here
    // costs a section rather than the page.
    return [];
  }
}

export const scoreOf = (a: Agent): number => Number(a.total_score ?? a.average_score ?? 0);
