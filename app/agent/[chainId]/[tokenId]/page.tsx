import { notFound } from 'next/navigation';
import { agentDetail, scoreOf, reputationDimensions, type AgentService } from '@/lib/scan';
import { short, ago, bscscanAddr, bscscanTx } from '@/lib/format';
import { HirePanel } from '@/components/HirePanel';
import { probe, type EndpointStatus } from '@/lib/endpoint';

export const revalidate = 20;

export async function generateMetadata({ params }: { params: { chainId: string; tokenId: string } }) {
  const a = await agentDetail(Number(params.chainId), params.tokenId);
  return { title: a ? `${a.name ?? 'Agent'} — Agent Market` : 'Agent — Agent Market' };
}

const num = (n: number | null | undefined, d = 0) => (n == null ? '—' : n.toFixed(d));

// Understand: everything a hirer needs to make an informed call — reputation, LIVENESS (is it
// actually running and how fresh is the data), how to hire it, and on-chain provenance. The
// liveness block is where "real-time data quality, beyond basic counts" is earned.
export default async function AgentPage({ params }: { params: { chainId: string; tokenId: string } }) {
  const chainId = Number(params.chainId);
  const a = await agentDetail(chainId, params.tokenId);
  if (!a) notFound();

  const owner = a.owner_certified_name || a.owner_username || short(a.owner_address);
  const services: [string, AgentService][] = a.services
    ? (Object.entries(a.services).filter(([, v]) => v && v.endpoint) as [string, AgentService][])
    : [];

  // Ask each endpoint whether it is actually there, rather than rendering an Activate button over a
  // URL nobody has checked. A third of the top-ranked agents on BSC fail this, and the registry does
  // not say so — see lib/endpoint.ts. Runs in parallel and is cached, so the page costs one extra
  // round trip at most.
  const statuses: EndpointStatus[] = await Promise.all(services.map(([, v]) => probe(v.endpoint)));
  const reachable = statuses.filter((s) => s.kind === 'live').length;
  const dims = reputationDimensions(a);

  return (
    <>
      <section className="detail-hero">
        <a className="back" href="/">
          ← all agents
        </a>
        <div className="detail-id">
          {a.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="avatar-lg" src={a.image_url} alt="" width={56} height={56} />
          ) : (
            <span className="avatar-lg" aria-hidden>
              {(a.name?.[0] ?? '◆').toUpperCase()}
            </span>
          )}
          <div style={{ minWidth: 0 }}>
            <h1>
              {a.name || `Agent #${a.token_id}`}
              {a.is_verified ? <span className="verified" title="On-chain verified">✓</span> : null}
              {a.is_active ? <span className="live-dot" title="Active">●</span> : null}
            </h1>
            <div className="detail-owner mono">
              by {owner || '—'} · <a href={bscscanAddr(a.contract_address)} target="_blank" rel="noreferrer">#{a.token_id}</a> on BSC
            </div>
          </div>
        </div>
        <p className="detail-desc">{a.description || 'No description provided.'}</p>
      </section>

      <div className="panels">
        {/* Reputation */}
        <div className="panel">
          <h3>Reputation</h3>
          <div className="kv-grid">
            <div><span className="v mono" style={{ color: 'var(--gold)' }}>{scoreOf(a).toFixed(1)}</span><span className="l">Total score</span></div>
            <div><span className="v mono">{a.total_feedbacks ?? 0}</span><span className="l">Feedback</span></div>
            <div><span className="v mono">{a.star_count ?? 0}</span><span className="l">Stars</span></div>
            <div><span className="v mono">{a.network_rank ? `#${a.network_rank}` : '—'}</span><span className="l">Network rank</span></div>
          </div>
        </div>

        {/* Liveness — the data-quality differentiator */}
        <div className="panel">
          <h3>Liveness <span className="live-tag">real-time</span></h3>
          <div className="kv-grid">
            <div>
              <span className="v mono" style={{ color: a.is_active ? 'var(--ok)' : 'var(--faint)' }}>
                {a.is_active ? 'Active' : 'Idle'}
              </span>
              <span className="l">Status</span>
            </div>
            <div><span className="v mono">{num(a.health_score, 0)}</span><span className="l">Health</span></div>
            <div><span className="v mono">{num(a.freshness_score, 0)}</span><span className="l">Freshness</span></div>
            <div><span className="v mono" style={{ fontSize: 12 }}>{ago(a.health_checked_at)}</span><span className="l">Last checked</span></div>
          </div>
          {a.endpoint_verified_domain ? (
            <p className="panel-note">Endpoint verified · {a.endpoint_verified_domain}</p>
          ) : (
            <p className="panel-note">Endpoint not yet domain-verified.</p>
          )}
        </div>
      </div>

      {/* Reputation breakdown — the single score, made transparent */}
      {dims.length ? (
        <section className="breakdown">
          <h3>How this score is built</h3>
          <div className="dim-list">
            {dims.map((d) => (
              <div className="dim" key={d.key}>
                <div className="dim-head">
                  <span className="dim-label">{d.label}</span>
                  <span className="dim-weight mono">{Math.round(d.weight * 100)}% weight</span>
                  <span className="dim-score mono">{d.score.toFixed(0)}</span>
                </div>
                <div className="dim-track">
                  <span className="dim-fill" style={{ width: `${Math.min(100, Math.max(0, d.score))}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="panel-note">
            Weighted dimensions from the 8004scan reputation model (v5) — service quality, engagement,
            publisher trust, metadata compliance, and momentum — not a single opaque number.
          </p>
        </section>
      ) : null}

      {/* Activate */}
      <section className="activate">
        <h3>
          Hire this agent
          {services.length ? (
            <span className="svc-tally mono">
              {reachable} of {services.length} endpoint{services.length === 1 ? '' : 's'} responding
            </span>
          ) : null}
        </h3>
        <HirePanel
          services={services}
          statuses={statuses}
          x402={!!a.x402_supported}
          agentWallet={a.agent_wallet}
          protocols={a.supported_protocols ?? []}
        />
      </section>

      {/* Provenance */}
      <section className="provenance">
        <h3>On-chain provenance</h3>
        <div className="prov-grid mono">
          <div><span className="l">Agent NFT</span><a href={bscscanAddr(a.contract_address)} target="_blank" rel="noreferrer">{short(a.contract_address)} · #{a.token_id}</a></div>
          <div><span className="l">Creator</span><a href={a.creator_address ? bscscanAddr(a.creator_address) : '#'} target="_blank" rel="noreferrer">{short(a.creator_address)}</a></div>
          <div><span className="l">Registered</span>{a.created_tx_hash ? <a href={bscscanTx(a.created_tx_hash)} target="_blank" rel="noreferrer">{ago(a.created_at)} · tx</a> : ago(a.created_at)}</div>
          <div><span className="l">Registry (ERC-8004)</span><a href={bscscanAddr(a.contract_address)} target="_blank" rel="noreferrer">{short(a.contract_address)}</a></div>
        </div>
        <p className="panel-note">
          Identity, reputation and liveness are read live from the ERC-8004 registry via 8004scan;
          provenance links resolve on BscScan.
        </p>
      </section>
    </>
  );
}
