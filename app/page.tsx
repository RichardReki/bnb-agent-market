import { CATEGORIES } from '@/lib/categories';
import { shelf, globalStats, topAgents } from '@/lib/scan';
import { AgentCard } from '@/components/AgentCard';

// Server component — all data is fetched server-side from the live 8004scan API. The landing IS the
// product thesis: not a big number, but the four category shelves, each already populated with real
// live BSC agents, so "all four with equal depth" reads at a glance.
export const revalidate = 60;

const fmt = (n: number | null | undefined) => (n == null ? '—' : Intl.NumberFormat('en').format(n));

export default async function Home() {
  const [stats, shelves, featured] = await Promise.all([
    globalStats(),
    Promise.all(
      CATEGORIES.map(async (c) => {
        const s = await shelf(c.query, { limit: 4 });
        return { cat: c, agents: s.agents, count: s.total };
      }),
    ),
    topAgents(4),
  ]);

  const bscTotal = shelves.reduce((s, x) => s + x.count, 0);

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
            <div className="n mono" style={{ color: 'var(--ok)' }}>+{fmt(stats.daily_new_agents)}</div>
            <div className="k">New · 24h</div>
          </div>
          <div className="stat">
            <div className="n mono">
              {stats.average_feedback_score != null ? stats.average_feedback_score.toFixed(0) : '—'}
            </div>
            <div className="k">Avg feedback</div>
          </div>
          <div className="stat">
            <div className="n mono" style={{ color: 'var(--gold)' }}>
              {fmt(bscTotal)}
            </div>
            <div className="k">On BSC · in-category</div>
          </div>
        </div>

        {/* The diversity signal, up front: the four judged categories as a live proportional band. */}
        <div className="dist">
          <div className="dist-bar">
            {shelves.map(({ cat, count }) => (
              <span
                key={cat.key}
                className="dist-seg"
                style={{ flexGrow: Math.max(count, 1), background: cat.accent }}
                title={`${cat.label}: ${count}`}
              />
            ))}
          </div>
          <div className="dist-legend">
            {shelves.map(({ cat, count }) => (
              <a className="dist-item" key={cat.key} href={`/agents/${cat.key}`}>
                <span className="dist-dot" style={{ background: cat.accent }} />
                <span className="dist-label">{cat.label}</span>
                <span className="dist-count mono">{count}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {featured.length ? (
        <section className="shelf featured">
          <div className="shelf-head">
            <span className="dot" style={{ background: 'var(--gold)' }} />
            <h2>Top-rated on BSC</h2>
            <span className="count">highest on-chain reputation</span>
            <span className="blurb">The agents most worth a first-timer&rsquo;s trust — across every category.</span>
          </div>
          <div className="grid">
            {featured.map((a) => (
              <AgentCard key={`f-${a.chain_id}-${a.token_id}`} agent={a} />
            ))}
          </div>
        </section>
      ) : null}

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
