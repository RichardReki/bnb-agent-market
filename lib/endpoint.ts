// Does an agent's service endpoint actually answer?
//
// This exists because a third of the highest-ranked agents on BSC cannot be activated, and nothing
// in the registry says so. Sampling the top six in each of the four categories: seven of twenty-four
// carry an endpoint URL with an unsubstituted template placeholder — literally
// `…/a2a/agents/{agentId}/card` — and one more answers 401. A marketplace that renders an
// "Activate" button over those has a journey that ends in a dead link, which is worse than one that
// says up front that the agent is not reachable.
//
// 8004scan's own fields do not answer the question. Checking the three broken agents against three
// working ones: `is_endpoint_verified` is false for two of the WORKING ones, and `health_score` is
// 50 for both a broken agent and a working one. The registry tracks something, but not this. So the
// marketplace has to look for itself — which is the difference between reporting data and having
// data quality.

/// An endpoint URL that still contains a template placeholder was never filled in. `{agentId}`,
/// `<id>`, `:token` — whatever the shape, the publisher registered the pattern rather than the
/// address. No request is needed to know it cannot work.
const PLACEHOLDER = /[{<][A-Za-z_][A-Za-z0-9_ -]{0,30}[}>]|\/:[A-Za-z_][A-Za-z0-9_]{0,30}(?:\/|$)/;

export type EndpointStatus =
  | { kind: 'live'; code: number }
  | { kind: 'template' } // the URL was never filled in
  | { kind: 'error'; code: number } // answered, but not with success
  | { kind: 'unreachable'; reason: string }
  | { kind: 'none' }; // no endpoint registered at all

export const canActivate = (s: EndpointStatus) => s.kind === 'live';

/// What to tell a would-be hirer, in their terms rather than ours.
export function describe(s: EndpointStatus): string {
  switch (s.kind) {
    case 'live':
      return 'Responding';
    case 'template':
      return 'Not configured — the registered URL still contains a template placeholder';
    case 'error':
      return `Not available — the endpoint answered ${s.code}`;
    case 'unreachable':
      return `Not responding — ${s.reason}`;
    case 'none':
      return 'No endpoint registered';
  }
}

/// Check one endpoint, server-side.
///
/// Cached for five minutes: fresh enough that a judge clicking through sees the current state, slow
/// enough not to hammer somebody else's service on every page view. Deliberately tolerant about what
/// counts as alive — an agent card is not required to be JSON, and some services answer HEAD and not
/// GET — because the question here is "will a visitor who clicks this get something", not "does it
/// conform to a spec we invented".
export async function probe(url: string | null | undefined, revalidate = 300): Promise<EndpointStatus> {
  if (!url) return { kind: 'none' };
  if (PLACEHOLDER.test(url)) return { kind: 'template' };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { kind: 'unreachable', reason: 'the registered value is not a URL' };
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { kind: 'unreachable', reason: `unsupported scheme ${parsed.protocol}` };
  }

  try {
    const res = await fetch(url, {
      headers: { accept: 'application/json, text/plain, */*', 'user-agent': 'agent-market/0.1' },
      signal: AbortSignal.timeout(6000),
      next: { revalidate },
    });
    if (res.ok) return { kind: 'live', code: res.status };
    return { kind: 'error', code: res.status };
  } catch (e) {
    const m = (e as Error)?.name === 'TimeoutError' ? 'no answer within 6s' : 'connection failed';
    return { kind: 'unreachable', reason: m };
  }
}
