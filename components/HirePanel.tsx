'use client';

import { useAccount, useConnect, useSwitchChain, useChainId } from 'wagmi';
import { BSC_ID } from '@/lib/wagmi';
import { short } from '@/lib/format';
import type { AgentService } from '@/lib/scan';
import { canActivate, describe, type EndpointStatus } from '@/lib/endpoint';

// Activate: the wallet-connected end of the journey. Connect → guard the network → launch the
// agent's real service. The activation targets the agent's ACTUAL endpoints (a2a/mcp/web) pulled
// from the registry, so "hire" opens a live agent, not a mock. The on-chain ERC-8183 hire/x402
// payment for agents that support it slots in where marked.
//
// Every endpoint is checked server-side before this renders, and one that is not answering does not
// get a button. A third of the top-ranked agents on BSC have an endpoint that cannot work — most of
// them a URL with an unsubstituted `{agentId}` still in it — and the registry does not flag any of
// them. Rendering "Activate" over those would make the last step of the journey a dead link, which
// is the one place a marketplace cannot afford to be wrong.
export function HirePanel({
  services,
  statuses,
  x402,
  agentWallet,
  protocols,
}: {
  services: [string, AgentService][];
  statuses: EndpointStatus[];
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
  const anyLive = statuses.some(canActivate);

  // Nothing to connect a wallet for. Say so before asking for one.
  if (services.length && !anyLive) {
    return (
      <div className="hire">
        <ServiceRow
          services={services}
          statuses={statuses}
          x402={x402}
          protocols={protocols}
          agentWallet={agentWallet}
        />
        <p className="panel-note">
          This agent cannot be activated right now: none of its registered endpoints are responding.
          That is the registry's record of it, checked live — not a problem on your side.
        </p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="hire">
        <button className="hire-btn" onClick={() => injected && connect({ connector: injected })} disabled={isPending}>
          {isPending ? 'Connecting…' : 'Connect wallet to hire'}
        </button>
        <p className="panel-note">Connect a BSC wallet (MetaMask, Rabby, OKX). Read-only until you activate an agent.</p>
        <ServiceRow services={services} statuses={statuses} x402={x402} protocols={protocols} agentWallet={agentWallet} disabled />
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
      <ServiceRow services={services} statuses={statuses} x402={x402} protocols={protocols} agentWallet={agentWallet} />
    </div>
  );
}

function ServiceRow({
  services,
  statuses,
  x402,
  protocols,
  agentWallet,
  disabled,
}: {
  services: [string, AgentService][];
  statuses: EndpointStatus[];
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
      {services.map(([kind, svc], i) => {
        const status = statuses[i] ?? { kind: 'none' as const };
        const live = canActivate(status);
        return (
          <div className={`svc${live ? '' : ' is-down'}`} key={kind}>
            <div className="svc-kind mono">{kind.toUpperCase()}</div>
            <code className="svc-ep">{svc.endpoint}</code>
            {live ? (
              <a className="svc-cta" href={svc.endpoint ?? '#'} target="_blank" rel="noreferrer" aria-disabled={disabled}>
                {kind === 'web' ? 'Open app →' : `Activate via ${kind.toUpperCase()} →`}
              </a>
            ) : (
              // No link. A button that leads somewhere broken is worse than no button, and saying
              // which way it is broken is the part the registry does not do.
              <span className="svc-down mono" title={describe(status)}>
                {describe(status)}
              </span>
            )}
          </div>
        );
      })}
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
