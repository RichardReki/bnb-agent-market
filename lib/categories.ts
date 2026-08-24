// The four categories the hackathon judges on "equal depth". Each maps to the 8004scan search term
// that surfaces live BSC agents of that kind (verified counts on 2026-08-24: 41 / 7 / 151 / 12).
// The `blurb` is what a first-time visitor reads to understand the category in one line.

export type CategoryKey = 'rebalancing' | 'grid' | 'yield' | 'health';

export interface Category {
  key: CategoryKey;
  label: string;
  query: string; // 8004scan `search=`
  blurb: string; // what agents in this category do
  accent: string; // per-category tint
}

export const CATEGORIES: Category[] = [
  {
    key: 'rebalancing',
    label: 'Rebalancing',
    query: 'rebalancing',
    blurb: 'Keeps LP ranges and portfolios on target — resets positions automatically as the market moves.',
    accent: '#5B8DEF',
  },
  {
    key: 'grid',
    label: 'Grid Trading',
    query: 'grid trading',
    blurb: 'Places and manages laddered buy/sell orders to harvest volatility inside a range.',
    accent: '#2DD4A7',
  },
  {
    key: 'yield',
    label: 'Yield Optimisation',
    query: 'yield',
    blurb: 'Routes liquidity to the highest available APR across lending and LP venues.',
    accent: '#F0B90B',
  },
  {
    key: 'health',
    label: 'Health Factor Monitoring',
    query: 'health factor',
    blurb: 'Watches lending positions and acts before liquidation — the safety layer for borrowers.',
    accent: '#FF6B4A',
  },
];

export const byKey = (k: string): Category | undefined => CATEGORIES.find((c) => c.key === k);
