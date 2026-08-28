import {
  MPTokenIssuanceCreateFlags,
  MPTokenIssuanceSetFlags,
  encodeMPTokenMetadata,
  type Client,
  type Wallet,
} from "xrpl";
import { mptAmount } from "../amounts.ts";
import { ISSUER_NAME, MPT_ASSET_CLASS, MPT_TICKER, PUBLIC_NAME } from "../config.ts";
import { log } from "../log.ts";
import { mptIssuanceIdFromMeta, submitTx } from "../tx.ts";
import type { TxRecord } from "../evidence-types.ts";

export const MPT_METADATA = {
  ticker: MPT_TICKER,
  name: PUBLIC_NAME,
  desc: "XRPL Testnet rehearsal companion MPT. Not an issuance, not a peg, not a regulated security.",
  issuer_name: ISSUER_NAME,
  asset_class: MPT_ASSET_CLASS,
  icon: "https://github.com/Hobie1Kenobi/atlas-forge-xrpl",
} as const;

export function encodeAfxtMetadata(): string {
  return encodeMPTokenMetadata({ ...MPT_METADATA });
}

export const MPT_CREATE_FLAGS =
  MPTokenIssuanceCreateFlags.tfMPTRequireAuth |
  MPTokenIssuanceCreateFlags.tfMPTCanLock |
  MPTokenIssuanceCreateFlags.tfMPTCanEscrow |
  MPTokenIssuanceCreateFlags.tfMPTCanClawback |
  MPTokenIssuanceCreateFlags.tfMPTCanTransfer;

export async function findExistingIssuance(
  client: Client,
  issuerAddress: string,
): Promise<string | undefined> {
  const objects = await client.request({
    command: "account_objects",
    account: issuerAddress,
    type: "mpt_issuance",
    ledger_index: "validated",
  });
  const node = objects.result.account_objects[0] as
    | { mpt_issuance_id?: string; MPTokenIssuanceID?: string }
    | undefined;
  return node?.mpt_issuance_id ?? node?.MPTokenIssuanceID;
}

export async function createMptIssuance(
  client: Client,
  issuer: Wallet,
): Promise<{ id: string; tx: TxRecord | null }> {
  const existing = await findExistingIssuance(client, issuer.classicAddress);
  if (existing) {
    log("skip MPTokenIssuanceCreate; issuance", existing);
    return { id: existing, tx: null };
  }
  const tx = await submitTx(
    client,
    issuer,
    {
      TransactionType: "MPTokenIssuanceCreate",
      Account: issuer.classicAddress,
      AssetScale: 0,
      MaximumAmount: "1000000",
      Flags: MPT_CREATE_FLAGS,
      MPTokenMetadata: encodeAfxtMetadata(),
    },
    { label: "mpt_create" },
  );
  const submitted = await client.request({
    command: "tx",
    transaction: tx.hash,
  });
  const id =
    mptIssuanceIdFromMeta(submitted.result.meta) ??
    (await findExistingIssuance(client, issuer.classicAddress));
  if (!id) {
    throw new Error("MPTokenIssuanceCreate succeeded but issuance id missing");
  }
  return { id, tx };
}

export async function authorizeMptHolder(
  client: Client,
  holder: Wallet,
  issuanceId: string,
  label: string,
): Promise<TxRecord | null> {
  const objects = await client.request({
    command: "account_objects",
    account: holder.classicAddress,
    type: "mptoken",
    ledger_index: "validated",
  });
  const already = objects.result.account_objects.some((entry) => {
    const row = entry as { MPTokenIssuanceID?: string };
    return row.MPTokenIssuanceID === issuanceId;
  });
  if (already) {
    log("skip", label, "MPToken exists");
    return null;
  }
  return submitTx(
    client,
    holder,
    {
      TransactionType: "MPTokenAuthorize",
      Account: holder.classicAddress,
      MPTokenIssuanceID: issuanceId,
    },
    { label },
  );
}

export async function issuerAllowListHolder(
  client: Client,
  issuer: Wallet,
  holderAddress: string,
  issuanceId: string,
  label: string,
): Promise<TxRecord> {
  return submitTx(
    client,
    issuer,
    {
      TransactionType: "MPTokenAuthorize",
      Account: issuer.classicAddress,
      MPTokenIssuanceID: issuanceId,
      Holder: holderAddress,
    },
    { label },
  );
}

export async function payMpt(
  client: Client,
  sender: Wallet,
  destination: string,
  issuanceId: string,
  value: string,
  label: string,
  expect: "tesSUCCESS" | "tec" | string = "tesSUCCESS",
): Promise<TxRecord> {
  return submitTx(
    client,
    sender,
    {
      TransactionType: "Payment",
      Account: sender.classicAddress,
      Destination: destination,
      Amount: mptAmount(value, issuanceId),
    },
    { label, expect },
  );
}

export async function lockMptHolder(
  client: Client,
  issuer: Wallet,
  holderAddress: string,
  issuanceId: string,
  label: string,
): Promise<TxRecord> {
  return submitTx(
    client,
    issuer,
    {
      TransactionType: "MPTokenIssuanceSet",
      Account: issuer.classicAddress,
      MPTokenIssuanceID: issuanceId,
      Holder: holderAddress,
      Flags: MPTokenIssuanceSetFlags.tfMPTLock,
    },
    { label },
  );
}

export async function clawbackMpt(
  client: Client,
  issuer: Wallet,
  holderAddress: string,
  issuanceId: string,
  value: string,
  label: string,
): Promise<TxRecord> {
  return submitTx(
    client,
    issuer,
    {
      TransactionType: "Clawback",
      Account: issuer.classicAddress,
      Holder: holderAddress,
      Amount: mptAmount(value, issuanceId),
    },
    { label },
  );
}
