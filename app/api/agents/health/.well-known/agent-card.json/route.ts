import { NextResponse } from 'next/server';

// The A2A agent card for our Health Factor agent — the endpoint its ERC-8004 registration points at.
//
// This has to be live and well-formed for two reasons that both feed the marketplace's own scoring:
// 8004scan health-checks the endpoint (a dead one drops the agent's `is_active` / health status),
// and the "service" dimension is the heaviest-weighted slice of the reputation score, so an agent
// whose card doesn't parse scores poorly no matter how good its strategy is. Serving it from the
// marketplace itself means the agent is live the moment the site deploys — no separate host.
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      protocolVersion: '0.3.0',
      name: 'Sentinel · Health Factor Guard',
      description:
        'Watches Venus and Aave lending positions on BNB Smart Chain and acts before liquidation. ' +
        'Re-reads the health factor on-chain at execution time, so a position that recovered on its ' +
        'own is never touched.',
      provider: { organization: 'Agent Market', url: 'https://github.com/RichardReki/bnb-agent-market' },
      version: '0.1.0',
      capabilities: { streaming: false, pushNotifications: false },
      defaultInputModes: ['application/json'],
      defaultOutputModes: ['application/json'],
      skills: [
        {
          id: 'health-factor.watch',
          name: 'Watch a lending position',
          description:
            'Given a borrower address and market, report the current health factor, the per-asset ' +
            'price at which the position would be liquidated, and how far the market must move to ' +
            'reach it.',
          tags: ['defi', 'lending', 'health-factor', 'liquidation', 'risk'],
          examples: ['Watch 0xabc… on Venus and alert below a health factor of 1.20'],
        },
        {
          id: 'health-factor.rescue',
          name: 'Rescue before liquidation',
          description:
            'Repay debt or top up collateral to restore a target health factor. The rescue is gated ' +
            'on an on-chain re-read at execution time: if the position already recovered, it is a no-op.',
          tags: ['defi', 'lending', 'liquidation', 'rescue', 'automation'],
          examples: ['If health factor drops below 1.05, repay the minimum to restore 1.50'],
        },
      ],
    },
    {
      headers: {
        // The card is fetched cross-origin by indexers and health checks.
        'access-control-allow-origin': '*',
        'cache-control': 'public, max-age=60',
      },
    },
  );
}
