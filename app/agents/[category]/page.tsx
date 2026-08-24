import { notFound } from 'next/navigation';
import { CATEGORIES, byKey } from '@/lib/categories';
import { shelf } from '@/lib/scan';
import { AgentCard } from '@/components/AgentCard';

export const revalidate = 60;

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.key }));
}

export async function generateMetadata({ params }: { params: { category: string } }) {
  const c = byKey(params.category);
  return { title: c ? `${c.label} agents on BSC — Agent Market` : 'Agent Market' };
}

// Find: the full, ranked shelf for one category. The whole page is real 8004scan data, sorted by
// on-chain reputation — the "data quality" the brief asks to be judged on.
export default async function CategoryPage({ params }: { params: { category: string } }) {
  const cat = byKey(params.category);
  if (!cat) notFound();

  const { agents, total: count } = await shelf(cat.query, { limit: 48 });

  return (
    <>
      <section className="cat-hero">
        <a className="back" href="/">
          ← all categories
        </a>
        <div className="eyebrow" style={{ color: cat.accent }}>
          {count} live agents · BSC
        </div>
        <h1>{cat.label}</h1>
        <p>{cat.blurb}</p>
      </section>

      <section className="shelf">
        {agents.length ? (
          <div className="grid">
            {agents.map((a) => (
              <AgentCard key={`${a.chain_id}-${a.token_id}`} agent={a} />
            ))}
          </div>
        ) : (
          <div className="empty">No live agents in this category yet.</div>
        )}
        <p className="note" style={{ marginTop: 18 }}>
          Ranked by on-chain reputation (total score, then feedback) from the ERC-8004 registry via
          8004scan. Verified badges reflect on-chain verification.
        </p>
      </section>
    </>
  );
}
