'use client';

import { useAccount, useConnect, useSwitchChain, useChainId } from 'wagmi';
import { BSC_ID } from '@/lib/wagmi';
import { short } from '@/lib/format';
import type { AgentService } from '@/lib/scan';

// Activate: the wallet-connected end of the journey. Connect → guard the network → launch the
// agent's real service, with minimal friction. The activation targets the agent's ACTUAL endpoints
// (a2a/mcp/web) pulled from the registry, so "hire" opens a live agent, not a mock. The on-chain
// ERC-8183 hire/x402 payment for agents that support it slots in where marked.
export function HirePanel({
  services,
  x402,
  agentWallet,
  protocols,
}: {
  services: [string, AgentService][];
  x402: boolean;
  agentWallet: string | null;
  protocols: string[];
}) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const injected = connectors.find((c) => c.type === 'injected') ?? connectors[0];
  const wrongChain = isConnected && chainId !== BSC_ID;

  if (!isConnected) {
    return (
      <div className="hire">
        <button className="hire-btn" onClick={() => injected && connect({ connector: injected })} disabled={isPending}>
          {isPending ? 'Connecting…' : 'Connect wallet to hire'}
        </button>
        <p className="panel-note">Connect a BSC wallet (MetaMask, Rabby, OKX). Read-only until you activate an agent.</p>
        <ServiceRow services={services} x402={x402} protocols={protocols} agentWallet={agentWallet} disabled />
      </div>
    );
  }

  if (wrongChain) {
    return (
      <div className="hire">
        <button className="hire-btn" onClick={() => switchChain({ chainId: BSC_ID })}>
          Switch to BNB Smart Chain
        </button>
        <p className="panel-note">Connected as {short(address)} — on the wrong network. Agents live on BSC (chain 56).</p>
      </div>
    );
  }

  return (
    <div className="hire">
      <div className="hire-connected">
        <span className="ok-dot">●</span> Connected <span className="mono">{short(address)}</span> · BSC
      </div>
      <ServiceRow services={services} x402={x402} protocols={protocols} agentWallet={agentWallet} />
    </div>
  );
}

function ServiceRow({
  services,
  x402,
  protocols,
  agentWallet,
  disabled,
}: {
  services: [string, AgentService][];
  x402: boolean;
  protocols: string[];
  agentWallet: string | null;
  disabled?: boolean;
}) {
  if (!services.length) {
    return <p className="panel-note">This agent exposes no public service endpoint yet.</p>;
  }
  return (
    <div className="svc-list" style={disabled ? { opacity: 0.5, pointerEvents: 'none' } : undefined}>
      {services.map(([kind, svc]) => (
        <div className="svc" key={kind}>
          <div className="svc-kind mono">{kind.toUpperCase()}</div>
          <code className="svc-ep">{svc.endpoint}</code>
          <a className="svc-cta" href={svc.endpoint ?? '#'} target="_blank" rel="noreferrer" aria-disabled={disabled}>
            {kind === 'web' ? 'Open app →' : `Activate via ${kind.toUpperCase()} →`}
          </a>
        </div>
      ))}
      <div className="proto-row">
        {protocols.map((p) => (
          <span className="chip" key={p}>{p}</span>
        ))}
        {x402 ? <span className="chip gold">x402 · pay-per-call</span> : null}
        {agentWallet ? (
          <a className="chip link" href={`https://bscscan.com/address/${agentWallet}`} target="_blank" rel="noreferrer">
            agent wallet {short(agentWallet)}
          </a>
        ) : null}
      </div>
    </div>
  );
}
