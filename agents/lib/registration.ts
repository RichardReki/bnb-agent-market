// Building and submitting an ERC-8004 agent registration on BSC.
//
// Every shape here was taken from a REAL registration on BSC mainnet, not from documentation:
// we decoded the calldata of an existing agent's `created_tx_hash` (Health Factor Monitor, token
// 269228, tx 0x346415ef…) to learn the true selector and metadata schema. Two things that decoding
// settled, both of which a doc-first implementation would get wrong:
//
//   1. The function is `register(string,(string,bytes)[])` — selector 0x8ea42286 — NOT `register(string)`.
//   2. The agentURI is an INLINE `data:application/json;base64,…` URI. Real agents embed their
//      metadata on-chain; nothing needs hosting. That removes the whole "where do we host the JSON"
//      problem, and it means the registration is self-contained and immutable.

export const REGISTRY = {
  // ERC-1967 proxy, name() = "AgentIdentity", symbol() = "AGENT".
  56: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
  97: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
} as const;

export const REGISTER_ABI = [
  {
    type: 'function',
    name: 'register',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentURI', type: 'string' },
      {
        name: 'metadata',
        type: 'tuple[]',
        components: [
          { name: 'key', type: 'string' },
          { name: 'value', type: 'bytes' },
        ],
      },
    ],
    outputs: [{ name: 'agentId', type: 'uint256' }],
  },
] as const;

/// The registration document, matching the live on-chain schema exactly.
export interface AgentMetadata {
  name: string;
  description: string;
  image: string;
  /// Service endpoints. `name` is the protocol ("A2A" | "MCP"), which is how 8004scan derives
  /// has_a2a / has_mcp — and the service dimension is the heaviest-weighted slice of the
  /// reputation score, so an agent with no reachable endpoint scores poorly by design.
  services: { name: string; endpoint: string; version: string }[];
  registrations: unknown[];
  type: string;
}

const EIP8004_TYPE = 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1';

export function buildMetadata(input: {
  name: string;
  description: string;
  image?: string;
  services: { name: string; endpoint: string; version?: string }[];
}): AgentMetadata {
  return {
    name: input.name,
    description: input.description,
    image: input.image ?? '',
    services: input.services.map((s) => ({
      name: s.name,
      endpoint: s.endpoint,
      version: s.version ?? '0.3.0',
    })),
    registrations: [],
    type: EIP8004_TYPE,
  };
}

/// Encode metadata as the inline data URI the registry actually stores.
export function toAgentURI(meta: AgentMetadata): string {
  const json = JSON.stringify(meta);
  const b64 = Buffer.from(json, 'utf8').toString('base64');
  return `data:application/json;base64,${b64}`;
}

/// Decode an agentURI back to metadata — used to verify what we actually put on-chain.
export function fromAgentURI(uri: string): AgentMetadata | null {
  const marker = 'base64,';
  const i = uri.indexOf(marker);
  if (i < 0) return null;
  try {
    return JSON.parse(Buffer.from(uri.slice(i + marker.length), 'base64').toString('utf8'));
  } catch {
    return null;
  }
}
