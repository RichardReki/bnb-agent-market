// Register one of our agents on the ERC-8004 Identity Registry.
//
//   AGENT=health CHAIN=97 PRIVATE_KEY=0x… npx tsx agents/register.mts        # testnet first
//   AGENT=health CHAIN=56 PRIVATE_KEY=0x… npx tsx agents/register.mts        # then mainnet
//
// Dry run (no key, no gas) prints the exact agentURI and calldata so the registration can be
// inspected before it is paid for:
//
//   AGENT=health npx tsx agents/register.mts --dry
//
// Registration is permissionless and 8004scan auto-indexes the Registered event — there is no
// listing step, no approval. Once this lands, the agent shows up on the marketplace's category
// shelf like any other; filling its token id into lib/ours.ts is what badges it as ours.
import { createWalletClient, createPublicClient, http, fallback, encodeFunctionData } from 'viem';
import { bsc, bscTestnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { REGISTRY, REGISTER_ABI, toAgentURI, fromAgentURI } from './lib/registration.js';
import { HEALTH_FACTOR_AGENT } from './health-factor/metadata.js';

const AGENTS = {
  health: HEALTH_FACTOR_AGENT,
} as const;

const name = (process.env.AGENT ?? 'health') as keyof typeof AGENTS;
const chainId = Number(process.env.CHAIN ?? 97) as 56 | 97;
const dry = process.argv.includes('--dry');

// Validate the key before anything else costs time. It is the cheapest check here and the most
// likely thing to be wrong, so failing on it after two network preflights wastes a run and reports
// the failure from inside viem's curve code, which says nothing about what to fix.
const KEY_RE = /^0x[0-9a-fA-F]{64}$/;
if (!dry) {
  const raw = process.env.PRIVATE_KEY;
  if (!raw) {
    throw new Error('set PRIVATE_KEY (or pass --dry to inspect the metadata without sending)');
  }
  if (!KEY_RE.test(raw)) {
    const hex = /^0x[0-9a-fA-F]*$/.test(raw);
    const why = !hex
      ? 'it contains characters that are not hex — a placeholder pasted verbatim looks exactly like this'
      : raw.length === 42
        ? 'that is 20 bytes, which is an ADDRESS, not a private key'
        : `it is ${Math.max(0, (raw.length - 2) / 2)} bytes, and a private key is 32`;
    throw new Error(
      [
        `PRIVATE_KEY is not a private key: ${why}.`,
        'Expected 0x followed by exactly 64 hex characters.',
        'The value is never printed here, and nothing has been sent.',
      ].join('\n'),
    );
  }
}

const meta = AGENTS[name];
if (!meta) throw new Error(`unknown AGENT "${name}" — one of: ${Object.keys(AGENTS).join(', ')}`);

const registry = REGISTRY[chainId];
if (!registry) throw new Error(`no registry for chain ${chainId} (use 56 or 97)`);

// The marketplace's shelves query chain 56 only (lib/scan.ts, BSC_CHAIN_ID). An agent registered on
// testnet is indexed by 8004scan but will never appear on our own site — which is the whole point of
// registering it. Testnet is for rehearsal; the real registration is mainnet.
if (chainId !== 56) {
  console.log(
    `\nNote: chain ${chainId} is a rehearsal. The marketplace only lists chain 56, so this` +
      '\n      agent will not appear on the site. Re-run with CHAIN=56 for the real registration.',
  );
}

const agentURI = toAgentURI(meta);

// Verify the encoding round-trips BEFORE spending gas. A malformed URI would register an agent that
// 8004scan cannot parse — and metadata completeness is a scored dimension.
const decoded = fromAgentURI(agentURI);
if (!decoded || decoded.name !== meta.name || decoded.services[0]?.endpoint !== meta.services[0]?.endpoint) {
  throw new Error('agentURI failed to round-trip — refusing to register malformed metadata');
}

const calldata = encodeFunctionData({ abi: REGISTER_ABI, functionName: 'register', args: [agentURI, []] });

console.log(`\nAgent      ${meta.name}`);
console.log(`Chain      ${chainId} (${chainId === 56 ? 'BSC mainnet' : 'BSC testnet'})`);
console.log(`Registry   ${registry}`);
console.log(`Endpoint   ${meta.services[0]?.endpoint}`);
console.log(`agentURI   ${agentURI.length} bytes, round-trip verified`);
console.log(`selector   ${calldata.slice(0, 10)}  (register(string,(string,bytes)[]))`);

// Preflight the service endpoint before spending gas. The agentURI is an immutable inline data URI:
// once registered, a dead or malformed card can never be corrected on that token. 8004scan
// health-checks this URL, and the service dimension is the heaviest-weighted slice of the reputation
// score, so registering against a 404 permanently caps the agent's standing. Cheap check, no undo.
async function preflight(url: string): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { accept: 'application/json' } });
  } catch (e) {
    return `unreachable: ${(e as Error).message}`;
  }
  if (!res.ok) return `HTTP ${res.status} ${res.statusText}`;
  let card: unknown;
  try {
    card = await res.json();
  } catch {
    return 'response is not valid JSON';
  }
  // The minimum shape an indexer needs to treat this as a real A2A card.
  const c = card as { name?: unknown; skills?: unknown };
  if (typeof c.name !== 'string' || !c.name) return 'card has no "name"';
  if (!Array.isArray(c.skills) || c.skills.length === 0) return 'card declares no skills';
  return null;
}

const problem = await preflight(meta.services[0]!.endpoint);
if (problem) {
  if (!dry) {
    throw new Error(
      [
        `service endpoint check failed — ${problem}`,
        `  ${meta.services[0]!.endpoint}`,
        'Refusing to register: the agentURI is immutable, so a dead endpoint cannot be fixed later.',
        'Deploy the site first, confirm the URL serves the agent card, then re-run.',
      ].join('\n'),
    );
  }
  console.log(`Endpoint   ⚠ ${problem} (tolerated in --dry; must pass before a real registration)`);
} else {
  console.log('Endpoint   ✓ live, serves a parseable agent card');
}

// The image lives in the same immutable URI and 8004scan re-hosts it at index time, so a dead image
// URL is just as permanent as a dead endpoint. Same check, same reasoning.
async function checkImage(url: string): Promise<string | null> {
  if (!url) return 'no image set';
  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    return `unreachable: ${(e as Error).message}`;
  }
  if (!res.ok) return `HTTP ${res.status} ${res.statusText}`;
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.startsWith('image/')) return `content-type is "${ct}", not an image`;
  return null;
}

const imageProblem = await checkImage(meta.image);
if (imageProblem) {
  if (!dry) {
    throw new Error(
      [
        `image check failed — ${imageProblem}`,
        `  ${meta.image}`,
        'Refusing to register: the image URL is baked into the immutable agentURI.',
      ].join('\n'),
    );
  }
  console.log(`Image      ⚠ ${imageProblem} (tolerated in --dry)`);
} else {
  console.log('Image      ✓ live');
}

if (dry) {
  console.log('\n--dry: nothing sent. Metadata that would go on-chain:\n');
  console.log(JSON.stringify(decoded, null, 2));
  process.exit(0);
}

const pk = process.env.PRIVATE_KEY as `0x${string}`;

// viem's default transport for BSC is a public-good RPC that rate-limits hard — it returned 429
// mid-run while we were only reading balances. A 429 on a read is a retry; a 429 between broadcast
// and receipt leaves you not knowing whether a mainnet transaction landed. So the endpoints are
// named explicitly, with a fallback: the first that answers wins, and one provider having a bad
// minute does not decide the outcome of a transaction you cannot repeat.
const RPCS: Record<number, string[]> = {
  56: [
    'https://bsc-dataseed.bnbchain.org',
    'https://bsc-dataseed1.defibit.io',
    'https://bsc-dataseed1.ninicoin.io',
  ],
  97: [
    'https://data-seed-prebsc-1-s1.bnbchain.org:8545',
    'https://data-seed-prebsc-2-s1.bnbchain.org:8545',
  ],
};
/// RPC_URL overrides everything, for a private endpoint or a local node.
const transport = process.env.RPC_URL
  ? http(process.env.RPC_URL)
  : fallback((RPCS[chainId] ?? []).map((u) => http(u)));

const chain = chainId === 56 ? bsc : bscTestnet;
const account = privateKeyToAccount(pk);
const wallet = createWalletClient({ account, chain, transport });
const pub = createPublicClient({ chain, transport });

const balance = await pub.getBalance({ address: account.address });
console.log(`\nSender     ${account.address}`);
console.log(`Balance    ${Number(balance) / 1e18} BNB`);
if (balance === 0n) {
  throw new Error(
    chainId === 56
      ? 'sender has no BNB — a mainnet registration costs real gas (a fraction of a cent); fund the address above'
      : 'sender has no test BNB — fund it at https://testnet.bnbchain.org/faucet-smart',
  );
}

const hash = await wallet.writeContract({
  address: registry as `0x${string}`,
  abi: REGISTER_ABI,
  functionName: 'register',
  args: [agentURI, []],
});
console.log(`\nSubmitted  ${hash}`);

const receipt = await pub.waitForTransactionReceipt({ hash });
console.log(`Status     ${receipt.status}  block ${receipt.blockNumber}`);
if (receipt.status !== 'success') throw new Error('registration reverted');

// The minted agent id is the ERC-721 token id — the Transfer log's third topic.
const transfer = receipt.logs.find((l) => l.topics.length === 4);
const tokenId = transfer ? BigInt(transfer.topics[3] as string).toString() : '(check 8004scan)';
console.log(`\n✓ Registered. token_id = ${tokenId}`);
console.log(`  8004scan: https://8004scan.io/agent/${chainId}/${tokenId}`);
console.log(`  Next: add "${tokenId}" to OUR_AGENTS.health in lib/ours.ts to badge it on the marketplace.`);
