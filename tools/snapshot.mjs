// Capture the shelves to a file that ships with the repo, as a floor under an unreliable upstream.
//
//   node tools/snapshot.mjs
//
// 8004scan goes down. Not hypothetically — while this was being built it answered 500 DATABASE_ERROR
// for ten minutes, took 27 seconds on the list endpoint, and timed out entirely on /stats/global. The
// marketplace is judged over a two-week window, so "it was up when we tested" is not a plan.
//
// Next's cache and the in-process last-good map both help, and both start empty on a cold serverless
// instance. This does not: it is committed, so the very first request after a deploy can still render
// real agents. It is a floor, not a cache — the site always prefers live data, always says when it is
// showing a snapshot, and always says how old it is.
//
// Only the surfaces a visitor lands on are captured: the four category shelves, the featured shelf,
// the global stats, and the detail records for the agents those shelves link to — otherwise a judge
// browsing a snapshot shelf would click through to a broken page, which is the same failure moved one
// step later.
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const BASE = 'https://api.8004scan.io/api/v1';
const KEY = process.env.SCAN_API_KEY;
const OUT = 'data/snapshot.json';

const CATEGORIES = [
  ['rebalancing', 'rebalancing'],
  ['grid', 'grid trading'],
  ['yield', 'yield'],
  ['health', 'health factor'],
];

/// Agents named in the submission. A judge following those links must land on something.
const PINNED = ['269228', '172801', '330536'];

const SHELF_SIZE = 48; // matches PAGE_SIZE, so a snapshot shelf is a full first page
const DETAIL_PER_SHELF = 6;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/// Anonymous is 30 requests/minute and this makes roughly forty, so it paces itself. With a key the
/// limit is 600/min and the pacing is harmless.
const GAP = KEY ? 200 : 2200;

let ok = 0;
let failed = 0;

async function get(path, params = {}) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': 'agent-market-snapshot/1.0', ...(KEY ? { 'X-API-Key': KEY } : {}) },
        signal: AbortSignal.timeout(25000),
      });
      if (res.ok) {
        ok++;
        return await res.json();
      }
      // 429 and 5xx are worth waiting out; a 404 is an answer.
      if (res.status === 404) break;
      await sleep(attempt * 4000);
    } catch {
      await sleep(attempt * 4000);
    }
  }
  failed++;
  console.log(`   ! could not fetch ${path} ${JSON.stringify(params)}`);
  return null;
}

const shelf = async (search) =>
  get('/agents', {
    chain_id: 56,
    search,
    is_registered: true,
    sort_by: 'total_score',
    sort_order: 'desc',
    limit: SHELF_SIZE,
    offset: 0,
  });

console.log(`Capturing a snapshot${KEY ? ' (with an API key)' : ' (anonymous — this will be slow)'}\n`);

const snapshot = { capturedAt: Date.now(), shelves: {}, featured: null, stats: null, details: {} };

for (const [key, query] of CATEGORIES) {
  const j = await shelf(query);
  if (j) {
    snapshot.shelves[key] = { query, items: j.items ?? j.data ?? [], total: j.total ?? 0 };
    console.log(`   ${key.padEnd(12)} ${snapshot.shelves[key].items.length} agents, total ${snapshot.shelves[key].total}`);
  }
  await sleep(GAP);
}

const feat = await get('/agents', { chain_id: 56, is_registered: true, sort_by: 'total_score', sort_order: 'desc', limit: 4 });
if (feat) snapshot.featured = feat.items ?? feat.data ?? [];
await sleep(GAP);

snapshot.stats = await get('/stats/global');
await sleep(GAP);

// Detail records for what those shelves link to, so the journey does not break one click later.
const wanted = new Set(PINNED);
for (const s of Object.values(snapshot.shelves)) {
  for (const a of s.items.slice(0, DETAIL_PER_SHELF)) wanted.add(String(a.token_id));
}
for (const a of snapshot.featured ?? []) wanted.add(String(a.token_id));

console.log(`\n   detail records for ${wanted.size} agents`);
for (const id of wanted) {
  const d = await get(`/agents/56/${id}`);
  if (d) snapshot.details[id] = d.data ?? d;
  await sleep(GAP);
}

// Never let a bad run destroy a good snapshot. A partial capture is merged into whatever exists, so
// running this during an outage can only add.
let previous = null;
try {
  previous = JSON.parse(await readFile(OUT, 'utf8'));
} catch {}

if (previous) {
  snapshot.shelves = { ...previous.shelves, ...snapshot.shelves };
  snapshot.details = { ...previous.details, ...snapshot.details };
  snapshot.featured = snapshot.featured ?? previous.featured;
  snapshot.stats = snapshot.stats ?? previous.stats;
}

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(snapshot));

const size = (JSON.stringify(snapshot).length / 1024).toFixed(0);
console.log(`\n${ok} requests succeeded, ${failed} failed`);
console.log(`wrote ${OUT} — ${Object.keys(snapshot.shelves).length} shelves, ${Object.keys(snapshot.details).length} agent records, ${size} KB`);
if (failed) console.log('Some requests failed; existing snapshot data was kept for those. Re-run when upstream recovers.');
