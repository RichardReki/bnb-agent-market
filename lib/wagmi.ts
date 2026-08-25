import { http, createConfig } from 'wagmi';
import { bsc } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

// BSC mainnet only — the marketplace and every listed agent live on chain 56. Injected connector
// (MetaMask / Rabby / OKX etc.) keeps the wallet layer light; ssr so server render stays consistent.
export const config = createConfig({
  chains: [bsc],
  connectors: [injected()],
  transports: { [bsc.id]: http() },
  ssr: true,
});

export const BSC_ID = bsc.id;
