import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Wallet } from "xrpl";
import { config, type WalletRole } from "./config.ts";
import { BlockedError, log } from "./log.ts";

const FAUCET = "https://faucet.altnet.rippletest.net/accounts";

export type FundedWallets = Record<WalletRole, Wallet>;

function seedPath(role: WalletRole): string {
  return resolve(process.cwd(), config.seedFiles[role]);
}

export async function readSeedFile(role: WalletRole): Promise<string | null> {
  try {
    const raw = (await readFile(seedPath(role), "utf8")).trim();
    return raw === "" ? null : raw;
  } catch {
    return null;
  }
}

export async function writeSeedFile(role: WalletRole, seed: string): Promise<void> {
  const path = seedPath(role);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${seed}\n`, { encoding: "utf8", mode: 0o600 });
  await chmod(path, 0o600);
}

export async function loadWallet(role: WalletRole): Promise<Wallet> {
  const seed = await readSeedFile(role);
  if (!seed) {
    throw new Error(`${role} seed file missing; run scripts/01-fund.ts`);
  }
  return Wallet.fromSeed(seed);
}

export async function loadOrCreateWallet(role: WalletRole): Promise<Wallet> {
  const existing = await readSeedFile(role);
  if (existing) {
    const wallet = Wallet.fromSeed(existing);
    log(`${role} classic address`, wallet.classicAddress);
    return wallet;
  }
  const wallet = Wallet.generate();
  if (!wallet.seed) {
    throw new Error("Wallet.generate returned no seed");
  }
  await writeSeedFile(role, wallet.seed);
  log(`${role} classic address`, wallet.classicAddress);
  return wallet;
}

export async function fundClassicAccount(address: string): Promise<{
  hash?: string;
  amount?: string;
}> {
  const response = await fetch(FAUCET, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ destination: address }),
  });
  const text = await response.text();
  if (response.status === 429 || /rate.?limit/i.test(text)) {
    throw new BlockedError(
      `faucet rate-limited HTTP ${response.status}: ${text.slice(0, 300)}`,
    );
  }
  if (!response.ok) {
    if (response.status >= 500) {
      throw new BlockedError(`faucet HTTP ${response.status}: ${text.slice(0, 300)}`);
    }
    throw new BlockedError(`faucet HTTP ${response.status}: ${text.slice(0, 300)}`);
  }
  const body = JSON.parse(text) as {
    account?: { address?: string };
    amount?: number | string;
    transactionHash?: string;
    error?: string;
  };
  if (body.error) {
    throw new BlockedError(`faucet error: ${body.error}`);
  }
  return {
    hash: body.transactionHash,
    amount: body.amount === undefined ? undefined : String(body.amount),
  };
}

export async function loadAllWallets(): Promise<FundedWallets> {
  const issuer = await loadWallet("issuer");
  const alice = await loadWallet("alice");
  const bob = await loadWallet("bob");
  const unauthorized = await loadWallet("unauthorized");
  assertDistinct(issuer, alice, bob, unauthorized);
  return { issuer, alice, bob, unauthorized };
}

export function assertDistinct(...wallets: Wallet[]): void {
  const addresses = wallets.map((w) => w.classicAddress);
  const seeds = wallets.map((w) => w.seed);
  if (new Set(addresses).size !== addresses.length) {
    throw new Error("classic addresses are not distinct");
  }
  if (new Set(seeds).size !== seeds.length) {
    throw new Error("refusing to reuse a seed across roles");
  }
}

export function printClassicAddresses(wallets: FundedWallets): void {
  log("issuer", wallets.issuer.classicAddress);
  log("alice", wallets.alice.classicAddress);
  log("bob", wallets.bob.classicAddress);
  log("unauthorized", wallets.unauthorized.classicAddress);
}
