import { shelf, type Shelf } from '@/lib/scan';
import { AgentCard } from '@/components/AgentCard';
import { ShelfEmpty } from '@/components/ShelfEmpty';
import { StaleNotice } from '@/components/StaleNotice';
import { Pagination, PAGE_SIZE, parsePage } from '@/components/Pagination';

export const revalidate = 30;

export async function generateMetadata({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q ?? '';
  return { title: q ? `“${q}” — Agent Market` : 'Search — Agent Market' };
}

/// Same out-of-range fallback as the category shelf: never an empty grid under a non-zero total.
async function page_(query: string, page: number): Promise<{ shelf: Shelf; page: number }> {
  const first = await shelf(query, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
  if (first.agents.length || first.total === 0) return { shelf: first, page };
  const last = parsePage(String(page), first.total);
  if (last === page) return { shelf: first, page };
  return { shelf: await shelf(query, { limit: PAGE_SIZE, offset: (last - 1) * PAGE_SIZE }), page: last };
}

// Cross-category find: relevance-ranked results over all BSC agents from 8004scan.
export default async function SearchPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const q = (searchParams.q ?? '').trim();
  const { shelf: s, page } = q
    ? await page_(q, parsePage(searchParams.page))
    : { shelf: { agents: [], total: 0 } as Shelf, page: 1 };
  const { agents, total } = s;

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
        <StaleNotice at={s.staleAt} fromSnapshot={s.fromSnapshot} />
        {q && agents.length ? (
          <>
            <div className="grid">
              {agents.map((a) => (
                <AgentCard key={`${a.chain_id}-${a.token_id}`} agent={a} />
              ))}
            </div>
            <Pagination
              page={page}
              total={total}
              shown={agents.length}
              href={(p) => `/search?q=${encodeURIComponent(q)}${p === 1 ? '' : `&page=${p}`}`}
            />
          </>
        ) : q ? (
          <ShelfEmpty degraded={s.degraded}>No agents matched “{q}”. Try a broader term, or browse by category.</ShelfEmpty>
        ) : (
          <div className="empty">Enter a search above.</div>
        )}
      </section>
    </>
  );
}
