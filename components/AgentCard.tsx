import type { Agent } from '@/lib/scan';
import { scoreOf } from '@/lib/scan';

const short = (a: string | null) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');
const initial = (name: string | null) => (name?.trim()?.[0] ?? '◆').toUpperCase();

/// One agent, rendered from real 8004scan data. Foregrounds the trust signals a hirer actually
/// weighs: reputation score, feedback count, on-chain verification — not vanity counts.
export function AgentCard({ agent }: { agent: Agent }) {
  const owner = agent.owner_certified_name || agent.owner_username || short(agent.owner_address);
  const score = scoreOf(agent);
  const fb = agent.total_feedbacks ?? 0;
  return (
    <a className="card" href={`https://8004scan.io/agent/${agent.chain_id}/${agent.token_id}`} target="_blank" rel="noreferrer">
      <div className="card-top">
        {agent.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="avatar" src={agent.image_url} alt="" width={34} height={34} />
        ) : (
          <span className="avatar" aria-hidden>
            {initial(agent.name)}
          </span>
        )}
        <div style={{ minWidth: 0 }}>
          <div className="card-name">
            <span className="nm">{agent.name || `Agent #${agent.token_id}`}</span>
            {agent.is_verified ? <span className="verified" title="On-chain verified">✓</span> : null}
          </div>
          <div className="card-owner">{owner || '—'}</div>
        </div>
      </div>

      <p className="card-desc">{agent.description || 'No description provided.'}</p>

      <div className="card-foot">
        <span className="metric">
          <span className="v">{score.toFixed(1)}</span>
          <span className="l">Score</span>
        </span>
        <span className="metric">
          <span className="v">{fb}</span>
          <span className="l">Feedback</span>
        </span>
        {agent.network_rank ? (
          <span className="metric">
            <span className="v">#{agent.network_rank}</span>
            <span className="l">Rank</span>
          </span>
        ) : null}
        {agent.x402_supported ? <span className="tag">x402</span> : null}
      </div>
    </a>
  );
}
