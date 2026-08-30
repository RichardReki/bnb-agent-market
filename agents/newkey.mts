// Generate a fresh wallet for registering an agent, without exporting an existing key.
//
//   npx tsx agents/newkey.mts
//
// Why this exists. The address that registers an agent becomes that agent's permanent on-chain
// owner, displayed on every marketplace that indexes it. Using a wallet you already hold value in
// means exporting its private key to a terminal, and that key is usually shared across chains — the
// same key that signs a 5-cent registration might also hold a prize on another network. Generating
// a key here keeps the blast radius at exactly the gas you fund it with.
//
// The key is printed once and never written to disk. SAVE IT SOMEWHERE before funding the address:
// lose it and the agent NFT is stranded, since the registration cannot be reassigned without a
// signature from this account.
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const key = generatePrivateKey();
const { address } = privateKeyToAccount(key);

console.log('\n  New wallet — save both lines before sending it any funds.\n');
console.log(`  ADDRESS      ${address}`);
console.log(`  PRIVATE KEY  ${key}`);
console.log(`
  Next:
    1. Save the private key somewhere you will still have it next month.
    2. Send this address ~0.0005 BNB from your existing wallet's UI — no export needed.
    3. Register with it:

         $env:PRIVATE_KEY="<the PRIVATE KEY line above, in full>"
         npx tsx agents/register.mts

  This key is generated locally and is not stored anywhere. Nobody else has seen it.
`);
