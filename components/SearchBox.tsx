'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

// Header search — the fast path to "find an agent" that isn't one of the four category tabs. Submits
// to /search, which queries all BSC agents by relevance.
export function SearchBox({ initial = '' }: { initial?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  return (
    <form
      className="search"
      onSubmit={(e) => {
        e.preventDefault();
        const term = q.trim();
        if (term) router.push(`/search?q=${encodeURIComponent(term)}`);
      }}
      role="search"
    >
      <span className="search-i" aria-hidden>
        ⌕
      </span>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search agents…"
        aria-label="Search agents"
        spellCheck={false}
      />
    </form>
  );
}
