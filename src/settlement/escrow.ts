import type { Client, Wallet } from "xrpl";
import { issuedAmount, nowRippleTime } from "../amounts.ts";
import { config } from "../config.ts";
import { submitTx } from "../tx.ts";
import type { TxRecord } from "../evidence-types.ts";

export async function createTokenEscrow(
  client: Client,
  owner: Wallet,
  destination: string,
  issuerAddress: string,
  value: string,
  finishAfter: number,
  cancelAfter: number | undefined,
  label: string,
): Promise<{ tx: TxRecord; sequence: number }> {
  const txJson = {
    TransactionType: "EscrowCreate" as const,
    Account: owner.classicAddress,
    Destination: destination,
    Amount: issuedAmount(value, config.tokenCurrency, issuerAddress),
    FinishAfter: finishAfter,
    ...(cancelAfter !== undefined ? { CancelAfter: cancelAfter } : {}),
  };
  const tx = await submitTx(client, owner, txJson, { label });
  return { tx, sequence: tx.sequence };
}

export async function finishEscrow(
  client: Client,
  submitter: Wallet,
  ownerAddress: string,
  sequence: number,
  label: string,
  expect: "tesSUCCESS" | "tec" | string = "tesSUCCESS",
): Promise<TxRecord> {
  return submitTx(
    client,
    submitter,
    {
      TransactionType: "EscrowFinish",
      Account: submitter.classicAddress,
      Owner: ownerAddress,
      OfferSequence: sequence,
    },
    { label, expect },
  );
}

export async function cancelEscrow(
  client: Client,
  submitter: Wallet,
  ownerAddress: string,
  sequence: number,
  label: string,
  expect: "tesSUCCESS" | "tec" | string = "tesSUCCESS",
): Promise<TxRecord> {
  return submitTx(
    client,
    submitter,
    {
      TransactionType: "EscrowCancel",
      Account: submitter.classicAddress,
      Owner: ownerAddress,
      OfferSequence: sequence,
    },
    { label, expect },
  );
}

export function soonRipple(secondsFromNow: number): number {
  return nowRippleTime() + secondsFromNow;
}
