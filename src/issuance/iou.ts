import {
  AccountSetAsfFlags,
  TrustSetFlags,
  type Client,
  type Wallet,
} from "xrpl";
import { issuedAmount } from "../amounts.ts";
import { config } from "../config.ts";
import { accountUrl } from "../explorer.ts";
import { log } from "../log.ts";
import { submitTx } from "../tx.ts";
import type { TxRecord } from "../evidence-types.ts";

export const TRUST_LIMIT = "1000000";

export async function accountFlags(
  client: Client,
  address: string,
): Promise<number> {
  const info = await client.request({
    command: "account_info",
    account: address,
    ledger_index: "validated",
  });
  return info.result.account_data.Flags ?? 0;
}

export async function enableIssuerFlag(
  client: Client,
  issuer: Wallet,
  flag: number,
  label: string,
): Promise<TxRecord | null> {
  const current = await accountFlags(client, issuer.classicAddress);
  const flagBit = accountSetLedgerBit(flag);
  if (flagBit !== 0 && (current & flagBit) === flagBit) {
    log("skip", label, "already set");
    return null;
  }
  return submitTx(
    client,
    issuer,
    {
      TransactionType: "AccountSet",
      Account: issuer.classicAddress,
      SetFlag: flag,
    },
    { label },
  );
}

function accountSetLedgerBit(asf: number): number {
  switch (asf) {
    case AccountSetAsfFlags.asfRequireDest:
      return 0x00010000;
    case AccountSetAsfFlags.asfRequireAuth:
      return 0x00040000;
    case AccountSetAsfFlags.asfDisallowXRP:
      return 0x00080000;
    case AccountSetAsfFlags.asfDisableMaster:
      return 0x00100000;
    case AccountSetAsfFlags.asfNoFreeze:
      return 0x00200000;
    case AccountSetAsfFlags.asfGlobalFreeze:
      return 0x00400000;
    case AccountSetAsfFlags.asfDefaultRipple:
      return 0x00800000;
    case AccountSetAsfFlags.asfDepositAuth:
      return 0x01000000;
    case AccountSetAsfFlags.asfAllowTrustLineClawback:
      return 0x80000000;
    case AccountSetAsfFlags.asfAllowTrustLineLocking:
      return 0x40000000;
    default:
      return 0;
  }
}

export async function trustSet(
  client: Client,
  holder: Wallet,
  issuerAddress: string,
  label: string,
): Promise<TxRecord | null> {
  const lines = await client.request({
    command: "account_lines",
    account: holder.classicAddress,
    peer: issuerAddress,
    ledger_index: "validated",
  });
  const existing = lines.result.lines.find(
    (line) => line.currency === config.tokenCurrency,
  );
  if (existing && existing.limit !== "0") {
    log("skip", label, "trust line exists");
    return null;
  }
  return submitTx(
    client,
    holder,
    {
      TransactionType: "TrustSet",
      Account: holder.classicAddress,
      LimitAmount: issuedAmount(
        TRUST_LIMIT,
        config.tokenCurrency,
        issuerAddress,
      ),
    },
    { label },
  );
}

export async function issuePayment(
  client: Client,
  issuer: Wallet,
  destination: string,
  value: string,
  label: string,
): Promise<TxRecord> {
  return submitTx(
    client,
    issuer,
    {
      TransactionType: "Payment",
      Account: issuer.classicAddress,
      Destination: destination,
      Amount: issuedAmount(value, config.tokenCurrency, issuer.classicAddress),
    },
    { label },
  );
}

export async function holderPayment(
  client: Client,
  holder: Wallet,
  destination: string,
  issuerAddress: string,
  value: string,
  label: string,
  expect: "tesSUCCESS" | "tec" | string = "tesSUCCESS",
): Promise<TxRecord> {
  return submitTx(
    client,
    holder,
    {
      TransactionType: "Payment",
      Account: holder.classicAddress,
      Destination: destination,
      Amount: issuedAmount(value, config.tokenCurrency, issuerAddress),
    },
    { label, expect },
  );
}

export async function deepFreezeHolder(
  client: Client,
  issuer: Wallet,
  holderAddress: string,
  label: string,
): Promise<TxRecord> {
  return submitTx(
    client,
    issuer,
    {
      TransactionType: "TrustSet",
      Account: issuer.classicAddress,
      LimitAmount: issuedAmount("0", config.tokenCurrency, holderAddress),
      Flags:
        TrustSetFlags.tfSetFreeze | TrustSetFlags.tfSetDeepFreeze,
    },
    { label },
  );
}

export async function clawbackIou(
  client: Client,
  signer: Wallet,
  holderAddress: string,
  value: string,
  label: string,
  expect: "tesSUCCESS" | "tec" | string = "tesSUCCESS",
): Promise<TxRecord> {
  return submitTx(
    client,
    signer,
    {
      TransactionType: "Clawback",
      Account: signer.classicAddress,
      Amount: issuedAmount(value, config.tokenCurrency, holderAddress),
    },
    { label, expect },
  );
}

export function describeIssuer(address: string): string {
  return `issuer ${address} ${accountUrl(address)}`;
}
