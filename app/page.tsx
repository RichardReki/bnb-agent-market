import { CATEGORIES } from '@/lib/categories';
import { shelf, globalStats } from '@/lib/scan';
import { AgentCard } from '@/components/AgentCard';

// Server component — all data is fetched server-side from the live 8004scan API. The landing IS the
// product thesis: not a big number, but the four category shelves, each already populated with real
// live BSC agents, so "all four with equal depth" reads at a glance.
export const revalidate = 60;

const fmt = (n: number | null | undefined) => (n == null ? '—' : Intl.NumberFormat('en').format(n));

export default async function Home() {
  const [stats, shelves] = await Promise.all([
    globalStats(),
    Promise.all(
      CATEGORIES.map(async (c) => {
        const s = await shelf(c.query, { limit: 4 });
        return { cat: c, agents: s.agents, count: s.total };
      }),
    ),
  ]);

  return (
    <>
      <section className="hero">
        <h1>
          The front door for <em>on-chain agents</em> on BNB Smart Chain.
        </h1>
        <p>
          Discover, understand, and hire live AI agents — rebalancing, grid trading, yield, and
          liquidation protection — ranked by real, on-chain reputation from the ERC-8004 registry.
        </p>
        <div className="stats">
          <div className="stat">
            <div className="n mono">{fmt(stats.total_agents)}</div>
            <div className="k">Agents indexed</div>
          </div>
          <div className="stat">
            <div className="n mono">{CATEGORIES.length}</div>
            <div className="k">Categories</div>
          </div>
          <div className="stat">
            <div className="n mono">
              {stats.average_feedback_score != null ? stats.average_feedback_score.toFixed(1) : '—'}
            </div>
            <div className="k">Avg feedback</div>
          </div>
          <div className="stat">
            <div className="n mono" style={{ color: 'var(--gold)' }}>
              BSC
            </div>
            <div className="k">Chain · 56</div>
          </div>
        </div>
      </section>

      {shelves.map(({ cat, agents, count }) => (
        <section className="shelf" key={cat.key}>
          <div className="shelf-head">
            <span className="dot" style={{ background: cat.accent }} />
            <h2>{cat.label}</h2>
            <span className="count">{count} live</span>
            <span className="blurb">{cat.blurb}</span>
            <a className="more" href={`/agents/${cat.key}`}>
              browse all →
            </a>
          </div>
          {agents.length ? (
            <div className="grid">
              {agents.map((a) => (
                <AgentCard key={`${a.chain_id}-${a.token_id}`} agent={a} />
              ))}
            </div>
          ) : (
            <div className="empty">No live agents in this category yet.</div>
          )}
        </section>
      ))}
    </>
  );
}
