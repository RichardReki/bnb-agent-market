// Proves the marketplace's data backbone against the LIVE 8004scan API: the four category shelves
// on BSC, and the exact agent fields the UI will render. This becomes the basis for the Next.js
// server-side data layer (lib/scan.ts). No key needed at dev rate; read server-side (CORS).
const BASE = 'https://api.8004scan.io/api/v1';
const BSC = 56;
// The four judged categories -> the search term that surfaces them on 8004scan.
const CATEGORIES = [
  { key: 'rebalancing', label: 'Rebalancing', q: 'rebalancing' },
  { key: 'grid', label: 'Grid Trading', q: 'grid trading' },
  { key: 'yield', label: 'Yield Optimisation', q: 'yield' },
  { key: 'health', label: 'Health Factor Monitoring', q: 'health factor' },
];

async function agents({ q, limit = 5, sort = 'total_score' }) {
  const u = new URL(`${BASE}/agents`);
  u.search = new URLSearchParams({ chain_id: BSC, search: q, is_registered: 'true', sort_by: sort, sort_order: 'desc', limit }).toString();
  const r = await fetch(u, { headers: { 'user-agent': 'agent-market/0.1' } });
  if (!r.ok) throw new Error(`8004scan ${r.status} for ${q}`);
  const j = await r.json();
  return j.data ?? j.items ?? [];
}

console.log('BSC agent shelves (live from 8004scan):\n');
for (const c of CATEGORIES) {
  const list = await agents({ q: c.q, limit: 3 });
  console.log(`  ${c.label.padEnd(26)} top by score:`);
  for (const a of list) {
    const score = Number(a.total_score ?? a.average_score ?? 0).toFixed(1);
    const fb = a.total_feedbacks ?? 0;
    const verified = a.is_verified ? '✓' : ' ';
    console.log(`    ${verified} ${String(a.name ?? '—').slice(0, 26).padEnd(26)} score ${score.padStart(5)}  fb ${String(fb).padStart(3)}  #${a.token_id}`);
  }
  if (!list.length) console.log('    (none)');
  console.log();
}
