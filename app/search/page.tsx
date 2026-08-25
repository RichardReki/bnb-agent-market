import { search } from '@/lib/scan';
import { AgentCard } from '@/components/AgentCard';

export const revalidate = 30;

export async function generateMetadata({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q ?? '';
  return { title: q ? `“${q}” — Agent Market` : 'Search — Agent Market' };
}

// Cross-category find: relevance-ranked results over all BSC agents from 8004scan.
export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? '').trim();
  const { agents, total } = q ? await search(q, 48) : { agents: [], total: 0 };

  return (
    <>
      <section className="cat-hero">
        <a className="back" href="/">
          ← all categories
        </a>
        <div className="eyebrow" style={{ color: 'var(--gold)' }}>
          {q ? `${total} result${total === 1 ? '' : 's'} · BSC` : 'Search'}
        </div>
        <h1>{q ? `“${q}”` : 'Search agents'}</h1>
        <p>{q ? 'Ranked by on-chain reputation across every category.' : 'Type an agent name, protocol, or capability.'}</p>
      </section>

      <section className="shelf">
        {q && agents.length ? (
          <div className="grid">
            {agents.map((a) => (
              <AgentCard key={`${a.chain_id}-${a.token_id}`} agent={a} />
            ))}
          </div>
        ) : q ? (
          <div className="empty">No agents matched “{q}”. Try a broader term, or browse by category.</div>
        ) : (
          <div className="empty">Enter a search above.</div>
        )}
      </section>
    </>
  );
}
