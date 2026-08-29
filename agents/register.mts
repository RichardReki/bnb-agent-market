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
import { createWalletClient, createPublicClient, http, encodeFunctionData } from 'viem';
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

const meta = AGENTS[name];
if (!meta) throw new Error(`unknown AGENT "${name}" — one of: ${Object.keys(AGENTS).join(', ')}`);

const registry = REGISTRY[chainId];
if (!registry) throw new Error(`no registry for chain ${chainId} (use 56 or 97)`);

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

if (dry) {
  console.log('\n--dry: nothing sent. Metadata that would go on-chain:\n');
  console.log(JSON.stringify(decoded, null, 2));
  process.exit(0);
}

const pk = process.env.PRIVATE_KEY;
if (!pk) throw new Error('set PRIVATE_KEY (or pass --dry to inspect without sending)');

const chain = chainId === 56 ? bsc : bscTestnet;
const account = privateKeyToAccount(pk as `0x${string}`);
const wallet = createWalletClient({ account, chain, transport: http() });
const pub = createPublicClient({ chain, transport: http() });

const balance = await pub.getBalance({ address: account.address });
console.log(`\nSender     ${account.address}`);
console.log(`Balance    ${Number(balance) / 1e18} BNB`);
if (balance === 0n) throw new Error('sender has no BNB — fund it at https://testnet.bnbchain.org/faucet-smart');

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
