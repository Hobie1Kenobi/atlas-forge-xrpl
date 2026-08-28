import { AMMDepositFlags, type Client, type Wallet } from "xrpl";
import {
  issuedAmount,
  issuedAsset,
  xrpAsset,
  xrpToDrops,
} from "../amounts.ts";
import { config } from "../config.ts";
import { log } from "../log.ts";
import { submitTx } from "../tx.ts";
import type { TxRecord } from "../evidence-types.ts";

export type AmmInfo = {
  account?: string;
  amount?: unknown;
  amount2?: unknown;
  lp_token?: { issuer?: string };
};

export async function ammInfo(
  client: Client,
  issuerAddress: string,
): Promise<AmmInfo | null> {
  try {
    const response = await client.request({
      command: "amm_info",
      asset: { currency: "XRP" },
      asset2: { currency: config.tokenCurrency, issuer: issuerAddress },
      ledger_index: "validated",
    });
    return (response.result.amm ?? null) as AmmInfo | null;
  } catch {
    return null;
  }
}

export async function createAmmIfMissing(
  client: Client,
  lp: Wallet,
  issuerAddress: string,
): Promise<{ info: AmmInfo; tx: TxRecord | null }> {
  const existing = await ammInfo(client, issuerAddress);
  if (existing?.account) {
    log("skip AMMCreate; one AMM per pair already exists", existing.account);
    return { info: existing, tx: null };
  }
  const tx = await submitTx(
    client,
    lp,
    {
      TransactionType: "AMMCreate",
      Account: lp.classicAddress,
      Amount: xrpToDrops("25"),
      Amount2: issuedAmount("250", config.tokenCurrency, issuerAddress),
      TradingFee: 500,
    },
    { label: "amm_create", feeDrops: "200000" },
  );
  const info = await ammInfo(client, issuerAddress);
  if (!info?.account) {
    throw new Error("AMMCreate succeeded but amm_info is empty");
  }
  return { info, tx };
}

export async function depositAmm(
  client: Client,
  lp: Wallet,
  issuerAddress: string,
): Promise<TxRecord> {
  return submitTx(
    client,
    lp,
    {
      TransactionType: "AMMDeposit",
      Account: lp.classicAddress,
      Asset: xrpAsset(),
      Asset2: issuedAsset(config.tokenCurrency, issuerAddress),
      Amount: xrpToDrops("5"),
      Amount2: issuedAmount("50", config.tokenCurrency, issuerAddress),
      Flags: AMMDepositFlags.tfTwoAsset,
    },
    { label: "amm_deposit" },
  );
}

export async function swapXrpForAfx(
  client: Client,
  trader: Wallet,
  issuerAddress: string,
  destination: string,
): Promise<TxRecord> {
  const pathFind = await client.request({
    command: "ripple_path_find",
    source_account: trader.classicAddress,
    destination_account: destination,
    destination_amount: issuedAmount("1", config.tokenCurrency, issuerAddress),
    source_currencies: [{ currency: "XRP" }],
  });
  const alt = pathFind.result.alternatives[0];
  const paths = alt?.paths_computed;
  return submitTx(
    client,
    trader,
    {
      TransactionType: "Payment",
      Account: trader.classicAddress,
      Destination: destination,
      Amount: issuedAmount("1", config.tokenCurrency, issuerAddress),
      SendMax: xrpToDrops("5"),
      ...(paths && paths.length > 0 ? { Paths: paths } : {}),
    },
    { label: "amm_swap_payment" },
  );
}
