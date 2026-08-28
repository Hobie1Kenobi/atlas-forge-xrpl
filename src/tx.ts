import {
  Client,
  type SubmittableTransaction,
  type TransactionMetadata,
  type Wallet,
} from "xrpl";
import { classifyEngineResult, isSuccess } from "./amounts.ts";
import { txUrl } from "./explorer.ts";
import type { TxRecord } from "./evidence-types.ts";
import { log } from "./log.ts";

const LEDGER_BUFFER = 40;

export type SubmitOptions = {
  label: string;
  expect?: "tesSUCCESS" | "tec" | string;
  feeDrops?: string;
};

function engineResult(meta: unknown): string {
  if (!meta || typeof meta === "string") return "";
  const typed = meta as TransactionMetadata;
  return typed.TransactionResult ?? "";
}

export function createdLedgerIndex(
  meta: unknown,
  ledgerEntryType: string,
): string | undefined {
  if (!meta || typeof meta === "string") return undefined;
  const nodes = (meta as TransactionMetadata).AffectedNodes ?? [];
  for (const node of nodes) {
    if (
      "CreatedNode" in node &&
      node.CreatedNode.LedgerEntryType === ledgerEntryType
    ) {
      return node.CreatedNode.LedgerIndex;
    }
  }
  return undefined;
}

export function mptIssuanceIdFromMeta(meta: unknown): string | undefined {
  if (!meta || typeof meta === "string") return undefined;
  const typed = meta as TransactionMetadata & { mpt_issuance_id?: string };
  return typed.mpt_issuance_id;
}

export async function submitTx(
  client: Client,
  wallet: Wallet,
  tx: SubmittableTransaction,
  options: SubmitOptions,
): Promise<TxRecord> {
  const prepared = await client.autofill(tx);
  const ledgerIndex = await client.getLedgerIndex();
  prepared.LastLedgerSequence = ledgerIndex + LEDGER_BUFFER;
  if (options.feeDrops) {
    prepared.Fee = options.feeDrops;
  }
  const submitted = await client.submitAndWait(prepared, {
    wallet,
    autofill: false,
  });
  const result = engineResult(submitted.result.meta);
  const hash = submitted.result.hash;
  const validatedIndex =
    typeof submitted.result.ledger_index === "number"
      ? submitted.result.ledger_index
      : 0;
  const kind = classifyEngineResult(result);
  log(options.label, prepared.TransactionType, result, kind, hash);
  if (!hash) {
    throw new Error(`${options.label}: submit returned no hash (${result})`);
  }
  const record: TxRecord = {
    hash,
    result,
    ledger_index: validatedIndex,
    type: prepared.TransactionType,
    label: options.label,
    validated: Boolean(submitted.result.validated),
    explorer: txUrl(hash),
    sequence: prepared.Sequence ?? 0,
  };
  const expect = options.expect ?? "tesSUCCESS";
  if (expect === "tesSUCCESS") {
    if (!isSuccess(result)) {
      throw new Error(`${options.label} expected tesSUCCESS, got ${result}`);
    }
  } else if (expect === "tec") {
    if (kind !== "tec") {
      throw new Error(`${options.label} expected tec*, got ${result}`);
    }
  } else if (result !== expect) {
    throw new Error(`${options.label} expected ${expect}, got ${result}`);
  }
  return record;
}

export async function accountExists(
  client: Client,
  address: string,
): Promise<boolean> {
  try {
    await client.request({ command: "account_info", account: address });
    return true;
  } catch {
    return false;
  }
}

export async function xrpBalanceDrops(
  client: Client,
  address: string,
): Promise<bigint> {
  const info = await client.request({
    command: "account_info",
    account: address,
    ledger_index: "validated",
  });
  return BigInt(info.result.account_data.Balance);
}

export async function waitRippleTime(
  client: Client,
  targetRippleTime: number,
): Promise<void> {
  for (;;) {
    const ledger = await client.request({
      command: "ledger",
      ledger_index: "validated",
    });
    const closeTime = Number(ledger.result.ledger.close_time);
    if (closeTime >= targetRippleTime) return;
    const sleepMs = Math.min(4000, Math.max(1000, (targetRippleTime - closeTime) * 1000));
    await new Promise((resolve) => setTimeout(resolve, sleepMs));
  }
}

export { engineResult };
