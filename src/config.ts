import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), ".env") });

export const PUBLIC_NAME = "Atlas Forge XRPL Test Token";
export const PUBLIC_TICKER = "AFXT";
export const CLASSIC_CURRENCY = "AFX";
export const MPT_TICKER = "AFXT";
export const MPT_ASSET_CLASS = "other" as const;
export const ISSUER_NAME = "Atlas Forge";

export const RIPPLE_EPOCH = 946684800;
export const DROPS_PER_XRP = 1_000_000n;

export const DEFAULT_WSS = "wss://s.altnet.rippletest.net:51233";
export const DEFAULT_RPC = "https://s.altnet.rippletest.net:51234";
export const DEFAULT_EXPLORER = "https://testnet.xrpl.org";
export const FAUCET_URL = "https://faucet.altnet.rippletest.net/accounts";

export const FALLBACK_RPC = [
  "https://testnet.xrpl-labs.com/",
  "https://testnet.honeycluster.io/",
] as const;

export const FALLBACK_WSS = [
  "wss://testnet.xrpl-labs.com/",
  "wss://testnet.honeycluster.io/",
] as const;

export type WalletRole = "issuer" | "alice" | "bob" | "unauthorized";

export function requiredEnv(name: string, fallback: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  return value.trim();
}

export function classicCurrencyOrThrow(code: string): string {
  if (!/^[A-Z0-9]{3}$/.test(code)) {
    throw new Error(
      `classic IOU currency must be exactly 3 characters (XRPL ISO limit); got ${code}`,
    );
  }
  if (code === "XRP") {
    throw new Error("XRP is the native asset, not an issued currency code");
  }
  const forbidden = new Set(["USD", "USDT", "USDC", "RLUSD"]);
  if (forbidden.has(code)) {
    throw new Error(`${code} is a refused currency code in this rehearsal`);
  }
  return code;
}

export function whyAfxtCannotBeClassicIso(): string {
  return "XRPL classic IOU currency codes that use the ISO-style encoding are exactly 3 characters. AFXT is 4 characters, so it cannot be the ledger currency code. This rehearsal uses AFX on trust lines and Payments. The public ticker AFXT lives in product copy and in MPT metadata only.";
}

export const config = {
  network: requiredEnv("XRPL_NETWORK", "testnet"),
  wss: requiredEnv("XRPL_WSS", DEFAULT_WSS).replace(/\/$/, ""),
  rpc: requiredEnv("XRPL_RPC", DEFAULT_RPC).replace(/\/$/, ""),
  explorer: requiredEnv("XRPL_EXPLORER", DEFAULT_EXPLORER).replace(/\/$/, ""),
  tokenCurrency: classicCurrencyOrThrow(
    requiredEnv("TOKEN_CURRENCY", CLASSIC_CURRENCY),
  ),
  tokenName: requiredEnv("TOKEN_NAME", PUBLIC_NAME),
  seedFiles: {
    issuer: requiredEnv("ISSUER_SEED_FILE", "./seeds/issuer.seed"),
    alice: requiredEnv("HOLDER_A_SEED_FILE", "./seeds/alice.seed"),
    bob: requiredEnv("HOLDER_B_SEED_FILE", "./seeds/bob.seed"),
    unauthorized: requiredEnv("UNAUTHORIZED_SEED_FILE", "./seeds/unauthorized.seed"),
  } satisfies Record<WalletRole, string>,
};

if (config.network !== "testnet") {
  throw new Error(
    `this repository is Testnet-only; refusing XRPL_NETWORK=${config.network}`,
  );
}

export const USED_AMENDMENTS = [
  "AMM",
  "AMMClawback",
  "fixAMMv1_1",
  "fixAMMv1_2",
  "fixAMMv1_3",
  "MPTokensV1",
  "Clawback",
  "DeepFreeze",
  "Credentials",
  "PermissionedDomains",
  "PermissionedDEX",
  "TokenEscrow",
  "fixTokenEscrowV1",
  "Checks",
  "fixMPTDeliveredAmount",
] as const;

export const REFUSED_AMENDMENTS = [
  "LendingProtocol",
  "SingleAssetVault",
  "BatchV1_1",
  "DynamicMPT",
  "ConfidentialTransfer",
  "Sponsor",
  "PermissionDelegationV1_1",
  "fixCleanup3_3_0",
  "MPTokensV2",
] as const;

export const LEGACY_LISTED_DISABLED = ["Escrow", "PayChan", "MultiSign"] as const;
