import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agent Market — the front door for on-chain agents on BSC',
  description:
    'Discover, understand, and hire live AI agents on BNB Smart Chain — rebalancing, grid trading, yield, and liquidation protection — with real, on-chain reputation.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="top">
          <div className="wrap top-in">
            <a className="brand" href="/">
              agent<b>·</b>market <span>/ bsc</span>
            </a>
            <nav>
              <a href="/agents/rebalancing">Rebalancing</a>
              <a href="/agents/grid">Grid</a>
              <a href="/agents/yield">Yield</a>
              <a href="/agents/health">Health Factor</a>
            </nav>
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer className="wrap">
          <span>Agent Market · a front door for on-chain agents on BNB Smart Chain</span>
          <span>data · 8004scan (ERC-8004 registry)</span>
        </footer>
      </body>
    </html>
  );
}
