// Paging for the browse surfaces.
//
// This exists because the shelves used to render a fixed 48 while the header printed the real total
// from the API — "225 live agents" above a grid holding 48 of them. On a marketplace whose whole
// claim is that you can FIND an agent, silently dropping 79% of a category is the claim failing.
// Links, not a button: each page is a real URL the server renders, so results are shareable and the
// page works before any JavaScript loads.

export const PAGE_SIZE = 48;

/// A short window of page numbers around the current one, with the ends always reachable.
function window_(page: number, pages: number): (number | '…')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out = new Set<number>([1, pages, page - 1, page, page + 1]);
  const nums = [...out].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const withGaps: (number | '…')[] = [];
  nums.forEach((n, i) => {
    if (i && n - (nums[i - 1] as number) > 1) withGaps.push('…');
    withGaps.push(n);
  });
  return withGaps;
}

export function Pagination({
  page,
  total,
  shown,
  href,
}: {
  page: number;
  total: number;
  /// How many rows are actually rendered. Normally PAGE_SIZE, but a snapshot shelf can hold fewer
  /// than a full page — and a range that says "1–48" over 24 rows is the same lie this component was
  /// added to remove, just from a different direction.
  shown?: number;
  /// Builds the URL for a page — the caller owns its own query string.
  href: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min((page - 1) * PAGE_SIZE + (shown ?? PAGE_SIZE), total);

  return (
    <nav className="pager" aria-label="Pagination">
      <span className="pager-range mono">
        {from}–{to} of {total}
      </span>
      {pages > 1 ? (
        <span className="pager-links">
          {page > 1 ? (
            <a className="pager-btn" href={href(page - 1)} rel="prev">
              ← prev
            </a>
          ) : (
            <span className="pager-btn is-off">← prev</span>
          )}
          {window_(page, pages).map((n, i) =>
            n === '…' ? (
              <span key={`gap-${i}`} className="pager-gap">
                …
              </span>
            ) : n === page ? (
              <span key={n} className="pager-btn is-current" aria-current="page">
                {n}
              </span>
            ) : (
              <a key={n} className="pager-btn" href={href(n)}>
                {n}
              </a>
            ),
          )}
          {page < pages ? (
            <a className="pager-btn" href={href(page + 1)} rel="next">
              next →
            </a>
          ) : (
            <span className="pager-btn is-off">next →</span>
          )}
        </span>
      ) : null}
    </nav>
  );
}

/// Clamp a `?page=` value to something real. Junk, negatives, and pages past the end all collapse to
/// a valid page rather than rendering an empty grid under a non-zero total.
export function parsePage(raw: string | undefined, total?: number): number {
  const n = Number.parseInt(raw ?? '1', 10);
  const page = Number.isFinite(n) && n >= 1 ? n : 1;
  if (total == null) return page;
  return Math.min(page, Math.max(1, Math.ceil(total / PAGE_SIZE)));
}
